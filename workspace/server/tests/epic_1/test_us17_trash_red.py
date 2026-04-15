from datetime import timedelta
from typing import cast

from fastapi.testclient import TestClient

from server.main import app


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer token-of-user-a"}


def _create_item(client: TestClient, name: str = "玄铁剑") -> dict[str, str]:
    response = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": name,
            "aliases": ["测试别名"],
            "itemType": "weapon",
            "source": "manual",
            "chapterIds": ["chapter-a-1"],
        },
        headers=_auth_headers(),
    )
    assert response.status_code == 201
    return cast(dict[str, str], response.json()["item"])


def _soft_delete_item(client: TestClient, item_id: str) -> None:
    response = client.delete(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        headers=_auth_headers(),
    )
    assert response.status_code == 200


def test_soft_deleted_kb_item_appears_in_trash_list(client: TestClient) -> None:
    item = _create_item(client)

    _soft_delete_item(client, item["id"])

    response = client.get(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["trashStorageMB"] > 0
    trash_item = body["items"][0]
    assert trash_item["entityId"] == item["id"]
    assert trash_item["sourceType"] == "kb"
    assert trash_item["entityType"] == "item"
    assert trash_item["title"] == "玄铁剑"
    assert trash_item["deletedAt"]
    assert trash_item["expiresAt"]
    assert trash_item["remainingDays"] == 30


def test_trash_list_sorts_newest_deleted_first_across_chapter_and_kb_items(
    client: TestClient,
) -> None:
    chapter_delete = client.delete(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers=_auth_headers(),
    )
    assert chapter_delete.status_code == 200

    app.state.session_clock.advance(timedelta(hours=1))
    item = _create_item(client, name="后删除的道具")
    _soft_delete_item(client, item["id"])

    response = client.get(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["items"][0]["title"] == "后删除的道具"
    assert body["items"][0]["sourceType"] == "kb"
    assert body["items"][1]["title"] == "第一章"
    assert body["items"][1]["sourceType"] == "chapter"


def test_restore_kb_item_removes_it_from_trash_and_active_lists(
    client: TestClient,
) -> None:
    item = _create_item(client, name="可恢复道具")
    _soft_delete_item(client, item["id"])

    trash_list = client.get(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    )
    trash_item_id = trash_list.json()["items"][0]["id"]

    response = client.post(
        f"/api/projects/project-a-1/trash/{trash_item_id}/restore",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["restoredToVolumeId"] is None
    assert body["restoredToPosition"] is None
    assert body["fallbackToDefaultVolume"] is False

    list_response = client.get(
        "/api/projects/project-a-1/kb/item",
        headers=_auth_headers(),
    )
    assert list_response.status_code == 200
    assert [entry["id"] for entry in list_response.json()["items"]] == [item["id"]]

    trash_after_restore = client.get(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    )
    assert trash_after_restore.status_code == 200
    assert trash_after_restore.json()["items"] == []


def test_restore_chapter_uses_original_volume_when_still_available(
    client: TestClient,
) -> None:
    delete_response = client.delete(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers=_auth_headers(),
    )
    assert delete_response.status_code == 200

    trash_item_id = client.get(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    ).json()["items"][0]["id"]

    response = client.post(
        f"/api/projects/project-a-1/trash/{trash_item_id}/restore",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "restoredToVolumeId": "volume-a-1",
        "restoredToPosition": 0,
        "fallbackToDefaultVolume": False,
    }

    outline = client.get(
        "/api/projects/project-a-1/outline",
        headers=_auth_headers(),
    )
    assert outline.status_code == 200
    restored_chapter = outline.json()["volumes"][0]["chapters"][0]
    assert restored_chapter["id"] == "chapter-a-1"
    assert restored_chapter["title"] == "第一章"


def test_delete_trash_item_permanently_removes_kb_item(client: TestClient) -> None:
    item = _create_item(client, name="永久删除道具")
    _soft_delete_item(client, item["id"])

    trash_item_id = client.get(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    ).json()["items"][0]["id"]

    response = client.delete(
        f"/api/projects/project-a-1/trash/{trash_item_id}",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "deletedItemId": trash_item_id}

    get_item = client.get(
        f"/api/projects/project-a-1/kb/item/{item['id']}",
        headers=_auth_headers(),
    )
    assert get_item.status_code == 404
    assert get_item.json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_expired_trash_items_are_auto_cleaned_from_stats_and_list(
    client: TestClient,
) -> None:
    item = _create_item(client, name="过期道具")
    _soft_delete_item(client, item["id"])

    app.state.session_clock.advance(timedelta(days=31))

    stats_response = client.get(
        "/api/projects/project-a-1/trash/stats",
        headers=_auth_headers(),
    )
    assert stats_response.status_code == 200
    assert stats_response.json()["totalItems"] == 0
    assert stats_response.json()["trashStorageMB"] == 0

    list_response = client.get(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    )
    assert list_response.status_code == 200
    assert list_response.json()["items"] == []


def test_clear_trash_deletes_all_kb_and_chapter_entries(client: TestClient) -> None:
    chapter_delete = client.delete(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers=_auth_headers(),
    )
    assert chapter_delete.status_code == 200
    item = _create_item(client, name="待清空道具")
    _soft_delete_item(client, item["id"])

    response = client.delete(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "deletedCount": 2}

    trash_list = client.get(
        "/api/projects/project-a-1/trash",
        headers=_auth_headers(),
    )
    assert trash_list.status_code == 200
    assert trash_list.json()["total"] == 0


def test_trash_stats_reports_item_count_and_storage_usage(client: TestClient) -> None:
    chapter_delete = client.delete(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers=_auth_headers(),
    )
    assert chapter_delete.status_code == 200
    item = _create_item(client, name="统计道具")
    _soft_delete_item(client, item["id"])

    response = client.get(
        "/api/projects/project-a-1/trash/stats",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["totalItems"] == 2
    assert body["byType"] == {"chapter": 1, "kb:item": 1}
    assert body["trashStorageMB"] > 0
    assert body["expiresSoonCount"] == 0
