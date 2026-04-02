"""
Sprint 2 Pressure Tests (压测)

Tests backend API performance under stress with large datasets.
Measures response times and identifies performance degradation points.

APIs tested:
1. GET  /api/projects/{project_id}/outline          - with 10/50/100 volumes (each 10 chapters)
2. POST /api/projects/{project_id}/chapters/bulk-move  - with 10/50/100 items
3. POST /api/projects/{project_id}/chapters/bulk-trash  - with 10/50/100 items
4. DELETE /api/projects/{project_id}/volumes/{volume_id} - with 10/50/100 chapters

Thresholds (performance targets):
- GET /outline:     < 500ms for 100 volumes
- bulk-move:        < 200ms for 100 items
- bulk-trash:       < 200ms for 100 items
- delete volume:    < 500ms for volume with 100 chapters
"""

import time
from typing import Any, Generator

import pytest
from fastapi.testclient import TestClient

from server.main import app


# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def pressure_client() -> Generator[TestClient, None, None]:
    """Client with fresh app state for pressure tests."""
    # Reset app state to ensure clean slate
    app.state.fake_db.volumes = []
    app.state.fake_db.chapters = []
    app.state.fake_db.trash_items = []
    app.state.volume_counter = 0
    app.state.chapter_counter = 0
    app.state.project_counter = 0

    # Create a test project
    app.state.fake_db.projects = [
        {
            "id": "pressure-project",
            "ownerId": "user-a",
            "name": "Pressure Test Project",
            "type": "novel",
            "tags": [],
            "status": "active",
            "coverColor": "#5B8FF9",
            "totalChars": 0,
            "chapterCount": 0,
            "createdAt": "2026-03-26T00:00:00Z",
            "updatedAt": "2026-03-26T00:00:00Z",
        }
    ]

    # Ensure user-a exists in auth_users
    if "user-a" not in app.state.auth_users:
        app.state.auth_users["user-a"] = {
            "id": "user-a",
            "email": "a@example.com",
            "nickname": "a",
            "authProvider": "email",
            "emailVerified": False,
            "password": "StrongPass1",
            "createdAt": "2026-03-26T00:00:00Z",
            "updatedAt": "2026-03-26T00:00:00Z",
        }

    # Ensure session exists
    app.state.sessions["token-pressure"] = "user-a"

    with TestClient(app) as client:
        yield client

    # Cleanup
    app.state.fake_db.volumes = []
    app.state.fake_db.chapters = []
    app.state.fake_db.trash_items = []


def _create_volume(
    client: TestClient, project_id: str, name: str, headers: dict[str, str]
) -> str:
    """Create a volume and return its ID."""
    response = client.post(
        f"/api/projects/{project_id}/volumes",
        json={"name": name},
        headers=headers,
    )
    assert response.status_code == 201, f"Failed to create volume: {response.json()}"
    result: str = response.json()["volume"]["id"]
    return result


def _create_chapter(
    client: TestClient,
    project_id: str,
    volume_id: str,
    title: str,
    headers: dict[str, str],
) -> str:
    """Create a chapter and return its ID."""
    response = client.post(
        f"/api/projects/{project_id}/volumes/{volume_id}/chapters",
        json={"title": title},
        headers=headers,
    )
    assert response.status_code == 201, f"Failed to create chapter: {response.json()}"
    result: str = response.json()["chapter"]["id"]
    return result


def _bulk_create_chapters(
    client: TestClient,
    project_id: str,
    volume_id: str,
    count: int,
    headers: dict[str, str],
) -> list[str]:
    """Create multiple chapters and return their IDs."""
    chapter_ids = []
    for i in range(count):
        ch_id = _create_chapter(
            client, project_id, volume_id, f"Chapter {i + 1}", headers
        )
        chapter_ids.append(ch_id)
    return chapter_ids


def _create_volume_with_chapters(
    client: TestClient,
    project_id: str,
    volume_name: str,
    chapter_count: int,
    headers: dict[str, str],
) -> tuple[str, list[str]]:
    """Create a volume with multiple chapters. Returns (volume_id, chapter_ids)."""
    vol_id = _create_volume(client, project_id, volume_name, headers)
    chapter_ids = _bulk_create_chapters(
        client, project_id, vol_id, chapter_count, headers
    )
    return vol_id, chapter_ids


def _create_project_with_volumes(
    client: TestClient,
    project_id: str,
    volume_count: int,
    chapters_per_volume: int,
    headers: dict[str, str],
) -> dict[str, list[str]]:
    """Create a project with N volumes, each with M chapters. Returns {volume_id: [chapter_ids]}."""
    result = {}
    for i in range(volume_count):
        vol_id, ch_ids = _create_volume_with_chapters(
            client, project_id, f"Volume {i + 1}", chapters_per_volume, headers
        )
        result[vol_id] = ch_ids
    return result


AUTH_HEADER = {"Authorization": "Bearer token-pressure"}
PROJECT_ID = "pressure-project"


# ─── Helper: Timing ───────────────────────────────────────────────────────────


class TimingResult:
    """Store timing results for a test case."""

    def __init__(self, name: str, count: int):
        self.name = name
        self.count = count
        self.times: list[float] = []
        self.errors: list[str] = []

    def add(self, elapsed: float) -> None:
        self.times.append(elapsed)

    def add_error(self, error: str) -> None:
        self.errors.append(error)

    @property
    def min_time(self) -> float:
        return min(self.times) if self.times else 0.0

    @property
    def max_time(self) -> float:
        return max(self.times) if self.times else 0.0

    @property
    def avg_time(self) -> float:
        return sum(self.times) / len(self.times) if self.times else 0.0

    @property
    def success_rate(self) -> float:
        total = len(self.times) + len(self.errors)
        return len(self.times) / total if total > 0 else 0.0

    def report(self) -> str:
        if self.errors:
            return (
                f"{self.name} ({self.count} items): ERRORS={len(self.errors)}, times=NA"
            )
        return (
            f"{self.name} ({self.count} items): "
            f"min={self.min_time * 1000:.1f}ms, max={self.max_time * 1000:.1f}ms, "
            f"avg={self.avg_time * 1000:.1f}ms, success={self.success_rate * 100:.0f}%"
        )


def _time_request(func: Any, *args: Any, **kwargs: Any) -> tuple[float, Any]:
    """Time a function call. Returns (elapsed_time, result)."""
    start = time.perf_counter()
    result = func(*args, **kwargs)
    elapsed = time.perf_counter() - start
    return elapsed, result


# ─── GET /outline Pressure Tests ─────────────────────────────────────────────


class TestOutlinePressure:
    """Pressure tests for GET /outline endpoint."""

    @pytest.mark.parametrize(
        "volume_count,chapters_per_volume",
        [
            (10, 10),
            (50, 10),
            (100, 10),
        ],
    )
    def test_outline_response_time(
        self, pressure_client: TestClient, volume_count: int, chapters_per_volume: int
    ) -> None:
        """Test outline endpoint response time with varying volume counts."""
        # Create dataset
        create_start = time.perf_counter()
        _create_project_with_volumes(
            pressure_client, PROJECT_ID, volume_count, chapters_per_volume, AUTH_HEADER
        )
        create_time = time.perf_counter() - create_start

        total_chapters = volume_count * chapters_per_volume

        # Measure outline response time
        elapsed, response = _time_request(
            pressure_client.get,
            f"/api/projects/{PROJECT_ID}/outline",
            headers=AUTH_HEADER,
        )

        # Verify response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        body = response.json()
        assert len(body["volumes"]) == volume_count
        assert body["totals"]["chapterCount"] == total_chapters

        # Report timing
        print(
            f"\n  [GET /outline] {volume_count} volumes × {chapters_per_volume} chapters:"
        )
        print(f"    Dataset creation: {create_time * 1000:.1f}ms")
        print(f"    GET /outline response: {elapsed * 1000:.1f}ms")
        print(f"    Volume count: {body['totals']['volumeCount']}")
        print(f"    Chapter count: {body['totals']['chapterCount']}")

        # Performance assertions
        if volume_count == 100:
            assert elapsed < 0.5, (
                f"Outline with 100 volumes took {elapsed * 1000:.1f}ms, expected < 500ms"
            )


# ─── POST /chapters/bulk-move Pressure Tests ─────────────────────────────────


class TestBulkMovePressure:
    """Pressure tests for POST /chapters/bulk-move endpoint."""

    @pytest.mark.parametrize("move_count", [10, 50, 100])
    def test_bulk_move_response_time(
        self, pressure_client: TestClient, move_count: int
    ) -> None:
        """Test bulk-move endpoint response time with varying chapter counts."""
        # Create source and target volumes
        source_vol_id = _create_volume(
            pressure_client, PROJECT_ID, "Source Volume", AUTH_HEADER
        )
        target_vol_id = _create_volume(
            pressure_client, PROJECT_ID, "Target Volume", AUTH_HEADER
        )

        # Create chapters to move
        chapter_ids = _bulk_create_chapters(
            pressure_client, PROJECT_ID, source_vol_id, move_count, AUTH_HEADER
        )

        # Measure bulk-move response time
        elapsed, response = _time_request(
            pressure_client.post,
            f"/api/projects/{PROJECT_ID}/chapters/bulk-move",
            json={"chapterIds": chapter_ids, "targetVolumeId": target_vol_id},
            headers=AUTH_HEADER,
        )

        # Verify response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        body = response.json()
        assert body["ok"] is True
        assert body["movedCount"] == move_count

        # Report timing
        print(f"\n  [POST /chapters/bulk-move] {move_count} chapters:")
        print(f"    Response time: {elapsed * 1000:.1f}ms")
        print(f"    Moved count: {body['movedCount']}")

        # Performance assertions
        if move_count == 100:
            assert elapsed < 0.2, (
                f"Bulk move of 100 chapters took {elapsed * 1000:.1f}ms, expected < 200ms"
            )


# ─── POST /chapters/bulk-trash Pressure Tests ────────────────────────────────


class TestBulkTrashPressure:
    """Pressure tests for POST /chapters/bulk-trash endpoint."""

    @pytest.mark.parametrize("trash_count", [10, 50, 100])
    def test_bulk_trash_response_time(
        self, pressure_client: TestClient, trash_count: int
    ) -> None:
        """Test bulk-trash endpoint response time with varying chapter counts."""
        # Create a volume for test chapters
        vol_id = _create_volume(
            pressure_client, PROJECT_ID, "Trash Test Volume", AUTH_HEADER
        )

        # Create chapters to trash
        chapter_ids = _bulk_create_chapters(
            pressure_client, PROJECT_ID, vol_id, trash_count, AUTH_HEADER
        )

        # Measure bulk-trash response time
        elapsed, response = _time_request(
            pressure_client.post,
            f"/api/projects/{PROJECT_ID}/chapters/bulk-trash",
            json={"chapterIds": chapter_ids},
            headers=AUTH_HEADER,
        )

        # Verify response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        body = response.json()
        assert body["ok"] is True
        assert body["trashedCount"] == trash_count

        # Report timing
        print(f"\n  [POST /chapters/bulk-trash] {trash_count} chapters:")
        print(f"    Response time: {elapsed * 1000:.1f}ms")
        print(f"    Trashed count: {body['trashedCount']}")

        # Performance assertions
        if trash_count == 100:
            assert elapsed < 0.2, (
                f"Bulk trash of 100 chapters took {elapsed * 1000:.1f}ms, expected < 200ms"
            )


# ─── DELETE /volumes/{volume_id} Pressure Tests ───────────────────────────────


class TestDeleteVolumePressure:
    """Pressure tests for DELETE /volumes/{volume_id} endpoint."""

    @pytest.mark.parametrize("chapter_count", [10, 50, 100])
    def test_delete_volume_with_chapters_response_time(
        self, pressure_client: TestClient, chapter_count: int
    ) -> None:
        """Test volume deletion with varying chapter counts."""
        # Create a volume with chapters
        vol_id, _ = _create_volume_with_chapters(
            pressure_client,
            PROJECT_ID,
            f"Delete Test Volume ({chapter_count})",
            chapter_count,
            AUTH_HEADER,
        )

        # Measure delete volume response time
        elapsed, response = _time_request(
            pressure_client.delete,
            f"/api/projects/{PROJECT_ID}/volumes/{vol_id}",
            headers=AUTH_HEADER,
        )

        # Verify response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        body = response.json()
        assert body["ok"] is True
        assert body["trashedChapterCount"] == chapter_count

        # Report timing
        print(
            f"\n  [DELETE /volumes/{{volume_id}}] volume with {chapter_count} chapters:"
        )
        print(f"    Response time: {elapsed * 1000:.1f}ms")
        print(f"    Trashed chapter count: {body['trashedChapterCount']}")

        # Performance assertions
        if chapter_count == 100:
            assert elapsed < 0.5, (
                f"Delete volume with 100 chapters took {elapsed * 1000:.1f}ms, expected < 500ms"
            )


# ─── Performance Benchmark Summary ────────────────────────────────────────────


class TestPerformanceBenchmark:
    """Comprehensive performance benchmark comparing all endpoints."""

    def test_performance_comparison_100_items(
        self, pressure_client: TestClient
    ) -> None:
        """
        Compare performance across all endpoints with 100 items.
        This is the main benchmark test.
        """
        results: list[TimingResult] = []
        headers = AUTH_HEADER
        project_id = PROJECT_ID

        # ── Test 1: GET /outline with 100 volumes × 10 chapters = 1000 chapters ──
        print("\n" + "=" * 70)
        print("PERFORMANCE BENCHMARK - 100 Items Test")
        print("=" * 70)

        result = TimingResult("GET /outline", 1000)  # 100 volumes × 10 chapters
        volumes_data = _create_project_with_volumes(
            pressure_client, project_id, 100, 10, headers
        )
        elapsed, response = _time_request(
            pressure_client.get,
            f"/api/projects/{project_id}/outline",
            headers=headers,
        )
        result.add(elapsed)
        results.append(result)
        print(f"\n  [1/4] GET /outline (100 volumes, 1000 chapters total):")
        print(f"        Response time: {elapsed * 1000:.1f}ms")

        # Verify counts
        body = response.json()
        assert body["totals"]["volumeCount"] == 100
        assert body["totals"]["chapterCount"] == 1000

        # ── Test 2: POST /chapters/bulk-move with 100 chapters ──
        # Create fresh volumes for move test
        source_vol_id = _create_volume(
            pressure_client, project_id, "Move Source", headers
        )
        target_vol_id = _create_volume(
            pressure_client, project_id, "Move Target", headers
        )
        chapter_ids = _bulk_create_chapters(
            pressure_client, project_id, source_vol_id, 100, headers
        )

        result = TimingResult("POST /chapters/bulk-move", 100)
        elapsed, response = _time_request(
            pressure_client.post,
            f"/api/projects/{project_id}/chapters/bulk-move",
            json={"chapterIds": chapter_ids, "targetVolumeId": target_vol_id},
            headers=headers,
        )
        result.add(elapsed)
        results.append(result)
        print(f"\n  [2/4] POST /chapters/bulk-move (100 chapters):")
        print(f"        Response time: {elapsed * 1000:.1f}ms")

        # ── Test 3: POST /chapters/bulk-trash with 100 chapters ──
        # Create fresh volume for trash test
        trash_vol_id = _create_volume(
            pressure_client, project_id, "Trash Volume", headers
        )
        trash_ch_ids = _bulk_create_chapters(
            pressure_client, project_id, trash_vol_id, 100, headers
        )

        result = TimingResult("POST /chapters/bulk-trash", 100)
        elapsed, response = _time_request(
            pressure_client.post,
            f"/api/projects/{project_id}/chapters/bulk-trash",
            json={"chapterIds": trash_ch_ids},
            headers=headers,
        )
        result.add(elapsed)
        results.append(result)
        print(f"\n  [3/4] POST /chapters/bulk-trash (100 chapters):")
        print(f"        Response time: {elapsed * 1000:.1f}ms")

        # ── Test 4: DELETE /volumes/{volume_id} with 100 chapters ──
        delete_vol_id, _ = _create_volume_with_chapters(
            pressure_client, project_id, "Delete Volume", 100, headers
        )

        result = TimingResult("DELETE /volumes/{volume_id}", 100)
        elapsed, response = _time_request(
            pressure_client.delete,
            f"/api/projects/{project_id}/volumes/{delete_vol_id}",
            headers=headers,
        )
        result.add(elapsed)
        results.append(result)
        print(f"\n  [4/4] DELETE /volumes/{{volume_id}} (volume with 100 chapters):")
        print(f"        Response time: {elapsed * 1000:.1f}ms")

        # ── Summary ──
        print("\n" + "-" * 70)
        print("BENCHMARK SUMMARY (100 items)")
        print("-" * 70)
        for r in results:
            print(f"  {r.report()}")
        print("-" * 70)

        # Performance thresholds check
        outline_time = results[0].avg_time
        bulk_move_time = results[1].avg_time
        bulk_trash_time = results[2].avg_time
        delete_vol_time = results[3].avg_time

        print("\nPERFORMANCE THRESHOLDS CHECK:")
        print(
            f"  GET /outline < 500ms:        {'PASS ✓' if outline_time < 0.5 else 'FAIL ✗'} ({outline_time * 1000:.1f}ms)"
        )
        print(
            f"  bulk-move < 200ms:            {'PASS ✓' if bulk_move_time < 0.2 else 'FAIL ✗'} ({bulk_move_time * 1000:.1f}ms)"
        )
        print(
            f"  bulk-trash < 200ms:          {'PASS ✓' if bulk_trash_time < 0.2 else 'FAIL ✗'} ({bulk_trash_time * 1000:.1f}ms)"
        )
        print(
            f"  delete volume < 500ms:       {'PASS ✓' if delete_vol_time < 0.5 else 'FAIL ✗'} ({delete_vol_time * 1000:.1f}ms)"
        )

        # Assert all thresholds pass
        assert outline_time < 0.5, (
            f"GET /outline: {outline_time * 1000:.1f}ms exceeds 500ms threshold"
        )
        assert bulk_move_time < 0.2, (
            f"bulk-move: {bulk_move_time * 1000:.1f}ms exceeds 200ms threshold"
        )
        assert bulk_trash_time < 0.2, (
            f"bulk-trash: {bulk_trash_time * 1000:.1f}ms exceeds 200ms threshold"
        )
        assert delete_vol_time < 0.5, (
            f"delete volume: {delete_vol_time * 1000:.1f}ms exceeds 500ms threshold"
        )


# ─── Degradation Point Tests ─────────────────────────────────────────────────


class TestPerformanceDegradation:
    """Tests to identify performance degradation points."""

    @pytest.mark.parametrize("volume_count", [100, 200, 500])
    def test_outline_degradation_point(
        self, pressure_client: TestClient, volume_count: int
    ) -> None:
        """Find the degradation point for GET /outline."""
        # Create dataset
        _create_project_with_volumes(
            pressure_client, PROJECT_ID, volume_count, 10, AUTH_HEADER
        )

        # Measure response time
        elapsed, response = _time_request(
            pressure_client.get,
            f"/api/projects/{PROJECT_ID}/outline",
            headers=AUTH_HEADER,
        )

        response_time_ms = elapsed * 1000
        print(f"\n  GET /outline with {volume_count} volumes: {response_time_ms:.1f}ms")

        assert response.status_code == 200
        body = response.json()
        assert body["totals"]["volumeCount"] == volume_count

        # Warning threshold
        if response_time_ms > 1000:
            print(f"    ⚠️  WARNING: Response time exceeds 1000ms!")


# ─── Run Summary ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
