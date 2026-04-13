from datetime import timedelta
from typing import Optional

from fastapi.testclient import TestClient

from server.main import app


def _auth_headers(user: str = "user-a") -> dict[str, str]:
    return {"Authorization": f"Bearer token-of-{user}"}


def _set_chapter_content(chapter_id: str, content: str) -> None:
    app.state.chapter_contents[chapter_id] = {
        "content": content,
        "charCount": len(content),
    }


def _add_chapter(
    chapter_id: str,
    order: int,
    *,
    project_id: str = "project-a-1",
    volume_id: str = "volume-a-1",
    title: Optional[str] = None,
) -> None:
    now_iso = app.state.session_clock.now.isoformat().replace("+00:00", "Z")
    app.state.fake_db.chapters.append(
        {
            "id": chapter_id,
            "projectId": project_id,
            "volumeId": volume_id,
            "title": title or chapter_id,
            "order": order,
            "chars": 0,
            "lastEditedAt": now_iso,
            "parserStatus": "pending",
        }
    )


def test_manual_trigger_returns_202_and_updates_chapter_status(
    client: TestClient,
) -> None:
    _set_chapter_content("chapter-a-1", "张三来到长安城，发现玄铁剑。")

    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": "张三来到长安城，发现玄铁剑。"},
        headers=_auth_headers(),
    )

    assert response.status_code == 202
    body = response.json()
    assert body["task"]["chapterId"] == "chapter-a-1"
    assert body["task"]["trigger"] == "manual"
    assert body["task"]["status"] == "queued"
    assert body["task"]["priority"] == 10

    status_response = client.get(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/status",
        headers=_auth_headers(),
    )
    assert status_response.status_code == 200
    state = status_response.json()["state"]
    assert state["chapterId"] == "chapter-a-1"
    assert state["status"] == "queued"
    assert state["trigger"] == "manual"
    assert state["retryCount"] == 0


def test_auto_trigger_debounces_repeated_requests_within_60_seconds(
    client: TestClient,
) -> None:
    first_content = "李四走进白鹿书院。"
    last_content = "李四走进白鹿书院，遇见王五。"

    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/auto-trigger",
        json={"content": first_content},
        headers=_auth_headers(),
    )
    assert response.status_code == 202

    app.state.session_clock.advance(timedelta(seconds=30))

    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/auto-trigger",
        json={"content": last_content},
        headers=_auth_headers(),
    )
    assert response.status_code == 202

    assert len(app.state.parser_queue) == 1
    queued_task_id = app.state.parser_queue[0]
    queued_task = app.state.parser_tasks[queued_task_id]
    assert queued_task["trigger"] == "auto"
    assert queued_task["status"] == "queued"
    assert queued_task["contentSnapshot"] == last_content


def test_batch_parse_creates_job_and_manual_trigger_has_higher_priority(
    client: TestClient,
) -> None:
    _add_chapter("chapter-a-2", order=1, title="第二章")
    _add_chapter("chapter-a-3", order=2, title="第三章")
    _set_chapter_content("chapter-a-1", "张三来到长安城。")
    _set_chapter_content("chapter-a-2", "李四走进白鹿书院。")
    _set_chapter_content("chapter-a-3", "赵六进入青州城。")

    batch_response = client.post(
        "/api/projects/project-a-1/parser/batch",
        json={"scope": "selected", "chapterIds": ["chapter-a-1", "chapter-a-2"]},
        headers=_auth_headers(),
    )
    assert batch_response.status_code == 202
    body = batch_response.json()
    assert body["job"]["scope"] == "selected"
    assert body["job"]["totalChapters"] == 2
    assert body["job"]["status"] == "pending"

    manual_response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-3/trigger",
        json={"content": "赵六进入青州城。"},
        headers=_auth_headers(),
    )
    assert manual_response.status_code == 202

    queue_tasks = [
        app.state.parser_tasks[task_id] for task_id in app.state.parser_queue
    ]
    assert queue_tasks[0]["trigger"] == "manual"
    assert queue_tasks[0]["chapterId"] == "chapter-a-3"
    assert queue_tasks[1]["trigger"] == "batch"


def test_cancel_batch_only_cancels_not_started_chapters(client: TestClient) -> None:
    from server.services import parser_service

    for index in range(2, 6):
        _add_chapter(f"chapter-a-{index}", order=index - 1, title=f"第{index}章")
        _set_chapter_content(f"chapter-a-{index}", f"角色{index}进入地点{index}城。")
    _add_chapter("chapter-a-6", order=5, title="第6章")
    _set_chapter_content("chapter-a-1", "张三来到长安城。")
    _set_chapter_content("chapter-a-6", "角色6进入地点6城。")

    response = client.post(
        "/api/projects/project-a-1/parser/batch",
        json={
            "scope": "selected",
            "chapterIds": [
                "chapter-a-1",
                "chapter-a-2",
                "chapter-a-3",
                "chapter-a-4",
                "chapter-a-5",
                "chapter-a-6",
            ],
        },
        headers=_auth_headers(),
    )
    assert response.status_code == 202
    job_id = response.json()["job"]["id"]

    parser_service.dispatch_parser_tasks()

    cancel_response = client.post(
        f"/api/projects/project-a-1/parser/batch/{job_id}/cancel",
        headers=_auth_headers(),
    )
    assert cancel_response.status_code == 200
    cancel_body = cancel_response.json()
    assert cancel_body["job"]["status"] == "cancelled"
    assert cancel_body["job"]["cancelledChapters"] >= 1

    statuses = {
        chapter_id: state["status"]
        for chapter_id, state in app.state.parser_states.items()
        if state.get("batchJobId") == job_id
    }
    assert "parsing" in statuses.values()
    assert "cancelled" in statuses.values()


def test_batch_progress_returns_job_counts(client: TestClient) -> None:
    _add_chapter("chapter-a-2", order=1, title="第二章")
    _set_chapter_content("chapter-a-1", "张三来到长安城。")
    _set_chapter_content("chapter-a-2", "李四走进白鹿书院。")

    response = client.post(
        "/api/projects/project-a-1/parser/batch",
        json={"scope": "selected", "chapterIds": ["chapter-a-1", "chapter-a-2"]},
        headers=_auth_headers(),
    )
    assert response.status_code == 202
    job_id = response.json()["job"]["id"]

    progress_response = client.get(
        f"/api/projects/project-a-1/parser/batch/{job_id}/progress",
        headers=_auth_headers(),
    )
    assert progress_response.status_code == 200
    progress = progress_response.json()["job"]
    assert progress["id"] == job_id
    assert progress["totalChapters"] == 2
    assert progress["completedChapters"] == 0
    assert progress["failedChapters"] == 0
    assert progress["progress"] == 0


def test_process_parser_queue_transitions_state_to_parsed_and_sends_notification(
    client: TestClient,
) -> None:
    from server.services import parser_service

    content = "张三在长安城加入天机阁，并得到玄铁剑。"
    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": content},
        headers=_auth_headers(),
    )
    assert response.status_code == 202

    parser_service.process_parser_queue()

    status_response = client.get(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/status",
        headers=_auth_headers(),
    )
    assert status_response.status_code == 200
    state = status_response.json()["state"]
    assert state["status"] == "parsed"
    assert state["retryCount"] == 0
    assert state["lastParsedAt"] is not None
    assert state["resultSummary"]["newCharacters"] >= 1
    assert state["resultSummary"]["newLocations"] >= 1

    project_status = client.get(
        "/api/projects/project-a-1/parser/status",
        headers=_auth_headers(),
    )
    assert project_status.status_code == 200
    summary = project_status.json()["summary"]
    assert summary["parsedCount"] >= 1
    assert summary["queuedCount"] == 0

    notifications = [
        item
        for item in app.state.fake_db.notifications
        if item.get("projectId") == "project-a-1" and item["type"] == "parse_done"
    ]
    assert notifications


def test_timeout_retries_once_then_marks_failed_and_notifies(
    client: TestClient,
) -> None:
    from server.services import parser_service

    app.state.fake_db.add_failpoint("parser_timeout:chapter-a-1")

    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": "触发超时重试"},
        headers=_auth_headers(),
    )
    assert response.status_code == 202

    parser_service.process_parser_queue()

    status_response = client.get(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/status",
        headers=_auth_headers(),
    )
    assert status_response.status_code == 200
    state = status_response.json()["state"]
    assert state["status"] == "failed"
    assert state["retryCount"] == 1
    assert "timed out" in state["failureReason"].lower()

    failed_notifications = [
        item
        for item in app.state.fake_db.notifications
        if item.get("projectId") == "project-a-1" and item["type"] == "parse_failed"
    ]
    assert failed_notifications


def test_dispatch_limits_active_parser_concurrency_to_five(client: TestClient) -> None:
    from server.services import parser_service

    for index in range(2, 8):
        _add_chapter(f"chapter-a-{index}", order=index - 1, title=f"第{index}章")
        _set_chapter_content(f"chapter-a-{index}", f"角色{index}进入地点{index}城。")
    _set_chapter_content("chapter-a-1", "张三来到长安城。")

    response = client.post(
        "/api/projects/project-a-1/parser/batch",
        json={"scope": "all"},
        headers=_auth_headers(),
    )
    assert response.status_code == 202

    started = parser_service.dispatch_parser_tasks()
    assert len(started) == 5

    chapter_statuses = [
        state["status"]
        for state in app.state.parser_states.values()
        if state["chapterId"].startswith("chapter-a-")
    ]
    assert chapter_statuses.count("parsing") == 5
    assert "queued" in chapter_statuses


def test_detect_entities_returns_pure_detection_result() -> None:
    from server.services import parser_service

    content = "张三在长安城加入天机阁，并得到玄铁剑。"
    result = parser_service.detect_entities(content)

    assert result.characters == parser_service._detect_characters(content)
    assert result.locations == parser_service._detect_locations(content)
    assert result.items == parser_service._detect_items(content)
    assert result.item_owners == {
        item_name: owner_name
        for owner_name, item_name in parser_service._detect_item_owners(content)
    }
    assert result.factions == parser_service._detect_factions(content)


def test_trigger_endpoint_follows_frozen_contract_request_response_shape(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={
            "trigger": "manual",
            "contentHash": "a" * 64,
            "sourceEvent": "manual_retry",
        },
        headers=_auth_headers(),
    )

    assert response.status_code == 202
    body = response.json()
    assert body["success"] is True
    assert body["data"]["chapterId"] == "chapter-a-1"
    assert body["data"]["status"] == "queued"


def test_auto_trigger_skips_enqueue_when_content_hash_matches_last_parsed(
    client: TestClient,
) -> None:
    from server.services import parser_service

    content = "张三来到长安城，发现玄铁剑。"
    trigger_response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": content},
        headers=_auth_headers(),
    )
    assert trigger_response.status_code == 202
    parser_service.process_parser_queue()
    assert len(app.state.parser_queue) == 0

    auto_response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/auto-trigger",
        json={"content": content},
        headers=_auth_headers(),
    )
    assert auto_response.status_code == 200
    assert auto_response.json()["error"]["code"] == "PARSER_DEBOUNCED"
    assert len(app.state.parser_queue) == 0


def test_failed_parse_status_exposes_fallback_meta_for_degraded_path(
    client: TestClient,
) -> None:
    from server.services import parser_service

    app.state.fake_db.add_failpoint("parser_timeout:chapter-a-1")
    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": "触发超时后走降级策略"},
        headers=_auth_headers(),
    )
    assert response.status_code == 202

    parser_service.process_parser_queue()

    status_response = client.get(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/status",
        headers=_auth_headers(),
    )
    assert status_response.status_code == 200
    state = status_response.json()["state"]
    assert state["status"] == "failed"
    assert state["fallback"]["used"] is True
    assert state["fallback"]["reason"] == "upstream_timeout"


def test_retry_failure_stops_after_single_retry_without_requeue(
    client: TestClient,
) -> None:
    from server.services import parser_service

    app.state.fake_db.add_failpoint("parser_timeout:chapter-a-1")
    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": "重试失败后不应再次入队"},
        headers=_auth_headers(),
    )
    assert response.status_code == 202

    parser_service.process_parser_queue()

    state = app.state.parser_states["chapter-a-1"]
    assert state["status"] == "failed"
    assert state["retryCount"] == 1
    assert state["lastTaskId"] is not None
    failed_task = app.state.parser_tasks[state["lastTaskId"]]
    assert failed_task["status"] == "failed"
    assert failed_task["retryCount"] == 1
    assert failed_task["completedAt"] is not None
    assert app.state.parser_queue == []
    assert app.state.parser_active_task_ids == []

    failed_notification_count = len(
        [
            item
            for item in app.state.fake_db.notifications
            if item.get("projectId") == "project-a-1" and item["type"] == "parse_failed"
        ]
    )
    parser_service.process_parser_queue()
    assert app.state.parser_queue == []
    assert app.state.parser_active_task_ids == []
    assert (
        len(
            [
                item
                for item in app.state.fake_db.notifications
                if item.get("projectId") == "project-a-1"
                and item["type"] == "parse_failed"
            ]
        )
        == failed_notification_count
    )


def test_project_status_pagination_clamps_and_handles_out_of_range_page(
    client: TestClient,
) -> None:
    _add_chapter("chapter-a-2", order=1, title="第二章")
    _add_chapter("chapter-a-3", order=2, title="第三章")

    clamped_response = client.get(
        "/api/projects/project-a-1/parser/status?page=0&pageSize=999",
        headers=_auth_headers(),
    )
    assert clamped_response.status_code == 200
    clamped_payload = clamped_response.json()
    assert clamped_payload["pagination"]["page"] == 1
    assert clamped_payload["pagination"]["pageSize"] == 100
    assert clamped_payload["pagination"]["total"] >= 3
    assert len(clamped_payload["items"]) == clamped_payload["pagination"]["total"]

    out_of_range_response = client.get(
        "/api/projects/project-a-1/parser/status?page=99&pageSize=1",
        headers=_auth_headers(),
    )
    assert out_of_range_response.status_code == 200
    out_of_range_payload = out_of_range_response.json()
    assert out_of_range_payload["pagination"]["page"] == 99
    assert out_of_range_payload["pagination"]["pageSize"] == 1
    assert out_of_range_payload["pagination"]["total"] >= 3
    assert out_of_range_payload["pagination"]["totalPages"] >= 3
    assert out_of_range_payload["items"] == []
