from datetime import timedelta

from fastapi.testclient import TestClient

from server.main import app


def _auth_headers(user: str = "user-a") -> dict[str, str]:
    return {"Authorization": f"Bearer token-of-{user}"}


def _add_chapter(chapter_id: str, order: int, *, title: str | None = None) -> None:
    now_iso = app.state.session_clock.now.isoformat().replace("+00:00", "Z")
    app.state.fake_db.chapters.append(
        {
            "id": chapter_id,
            "projectId": "project-a-1",
            "volumeId": "volume-a-1",
            "title": title or chapter_id,
            "order": order,
            "chars": 0,
            "lastEditedAt": now_iso,
            "parserStatus": "pending",
        }
    )


def test_create_and_get_manual_foreshadow(client: TestClient) -> None:
    create_response = client.post(
        "/api/projects/project-a-1/kb/foreshadow",
        json={
            "name": "血玉会反噬主人",
            "summary": "主角得到血玉时出现不祥征兆",
            "plantedChapterId": "chapter-a-1",
            "quote": "那枚血玉在月光下像活物般跳动。",
            "expectedResolveChapterId": "chapter-a-3",
        },
        headers=_auth_headers(),
    )

    assert create_response.status_code == 201
    foreshadow = create_response.json()["foreshadow"]
    assert foreshadow["name"] == "血玉会反噬主人"
    assert foreshadow["status"] == "unresolved"
    assert foreshadow["source"] == "manual"
    assert foreshadow["aiSuggestions"] == []
    assert foreshadow["notifyState"] == {"reminded": False, "warned": False}

    detail_response = client.get(
        f"/api/projects/project-a-1/kb/foreshadow/{foreshadow['id']}",
        headers=_auth_headers(),
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()["foreshadow"]
    assert detail["id"] == foreshadow["id"]
    assert detail["expectedResolveChapterId"] == "chapter-a-3"


def test_list_foreshadows_supports_status_grouping_filter_and_search(
    client: TestClient,
) -> None:
    first = client.post(
        "/api/projects/project-a-1/kb/foreshadow",
        json={
            "name": "青铜门的钥匙",
            "summary": "第一章埋下钥匙线索",
            "plantedChapterId": "chapter-a-1",
            "quote": "门缝里似乎闪过一道青光。",
        },
        headers=_auth_headers(),
    ).json()["foreshadow"]
    second = client.post(
        "/api/projects/project-a-1/kb/foreshadow",
        json={
            "name": "白虎机关",
            "summary": "第二章交代机关缺口",
            "plantedChapterId": "chapter-a-1",
            "quote": "他隐约觉得石壁后的齿轮还未停下。",
        },
        headers=_auth_headers(),
    ).json()["foreshadow"]

    patch_response = client.patch(
        f"/api/projects/project-a-1/kb/foreshadow/{second['id']}",
        json={
            "status": "resolved",
            "resolvedChapterId": "chapter-a-2",
            "resolveNote": "机关在第二章被主角破解",
        },
        headers=_auth_headers(),
    )
    assert patch_response.status_code == 200

    grouped_response = client.get(
        "/api/projects/project-a-1/kb/foreshadow?groupBy=status",
        headers=_auth_headers(),
    )
    assert grouped_response.status_code == 200
    grouped_body = grouped_response.json()
    assert grouped_body["total"] == 2
    assert grouped_body["groups"]["unresolved"][0]["id"] == first["id"]
    assert grouped_body["groups"]["resolved"][0]["id"] == second["id"]

    filtered_response = client.get(
        "/api/projects/project-a-1/kb/foreshadow?status=resolved&query=机关",
        headers=_auth_headers(),
    )
    assert filtered_response.status_code == 200
    filtered_body = filtered_response.json()
    assert filtered_body["total"] == 1
    assert filtered_body["items"][0]["id"] == second["id"]


def test_status_transition_requires_resolution_fields_and_clears_notification_state(
    client: TestClient,
) -> None:
    created = client.post(
        "/api/projects/project-a-1/kb/foreshadow",
        json={
            "name": "镜中人",
            "summary": "镜中倒影埋下身份伏笔",
            "plantedChapterId": "chapter-a-1",
            "quote": "镜中那张脸比他慢了一拍。",
            "expectedResolveChapterId": "chapter-a-2",
        },
        headers=_auth_headers(),
    ).json()["foreshadow"]

    invalid_response = client.patch(
        f"/api/projects/project-a-1/kb/foreshadow/{created['id']}",
        json={"status": "resolved"},
        headers=_auth_headers(),
    )
    assert invalid_response.status_code == 400
    assert invalid_response.json()["error"]["code"] == "FORESHADOW_RESOLUTION_REQUIRED"

    partial_response = client.patch(
        f"/api/projects/project-a-1/kb/foreshadow/{created['id']}",
        json={"status": "partially_resolved"},
        headers=_auth_headers(),
    )
    assert partial_response.status_code == 200
    assert partial_response.json()["foreshadow"]["status"] == "partially_resolved"

    app.state.kb_foreshadows[created["id"]]["notifyState"] = {
        "reminded": True,
        "warned": True,
    }
    resolved_response = client.patch(
        f"/api/projects/project-a-1/kb/foreshadow/{created['id']}",
        json={
            "status": "resolved",
            "resolvedChapterId": "chapter-a-2",
            "resolveNote": "镜中人是主角失散双胞胎",
        },
        headers=_auth_headers(),
    )
    assert resolved_response.status_code == 200
    resolved = resolved_response.json()["foreshadow"]
    assert resolved["status"] == "resolved"
    assert resolved["notifyState"] == {"reminded": False, "warned": False}


def test_parser_creates_ai_foreshadow_and_appends_ai_suggestions(
    client: TestClient,
) -> None:
    from server.services import parser_service

    create_response = client.post(
        "/api/projects/project-a-1/kb/foreshadow",
        json={
            "name": "玉佩秘密",
            "summary": "玉佩上的纹路暗示皇室身份",
            "plantedChapterId": "chapter-a-1",
            "quote": "那块玉佩背面的龙纹若隐若现。",
            "expectedResolveChapterId": "chapter-a-4",
        },
        headers=_auth_headers(),
    )
    assert create_response.status_code == 201

    _add_chapter("chapter-a-2", 1, title="第二章")
    content = "他看着那块玉佩，似乎一切都另有深意。原来玉佩正是皇族信物。"
    trigger_response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-2/trigger",
        json={"content": content},
        headers=_auth_headers(),
    )
    assert trigger_response.status_code == 202

    parser_service.process_parser_queue()

    ai_entities = [
        entity
        for entity in app.state.kb_foreshadows.values()
        if entity["projectId"] == "project-a-1" and entity["source"] == "ai"
    ]
    assert ai_entities
    assert ai_entities[0]["confirmed"] is False

    manual = client.get(
        f"/api/projects/project-a-1/kb/foreshadow/{create_response.json()['foreshadow']['id']}",
        headers=_auth_headers(),
    ).json()["foreshadow"]
    assert len(manual["aiSuggestions"]) == 1
    assert manual["aiSuggestions"][0]["chapterId"] == "chapter-a-2"
    assert "玉佩" in manual["aiSuggestions"][0]["message"]


def test_notification_check_sends_reminder_and_warning_only_once(
    client: TestClient,
) -> None:
    for index in range(2, 9):
        _add_chapter(f"chapter-a-{index}", index - 1, title=f"第{index}章")

    created = client.post(
        "/api/projects/project-a-1/kb/foreshadow",
        json={
            "name": "龙脉会苏醒",
            "summary": "第一章提到龙脉异动",
            "plantedChapterId": "chapter-a-1",
            "quote": "山体深处传来像心跳一样的震动。",
            "expectedResolveChapterId": "chapter-a-3",
        },
        headers=_auth_headers(),
    ).json()["foreshadow"]

    reminder_response = client.post(
        "/api/projects/project-a-1/kb/foreshadow/check-notifications",
        json={"currentChapterId": "chapter-a-3"},
        headers=_auth_headers(),
    )
    assert reminder_response.status_code == 200
    assert reminder_response.json()["triggered"] == {"reminders": 1, "warnings": 0}

    reminder_again = client.post(
        "/api/projects/project-a-1/kb/foreshadow/check-notifications",
        json={"currentChapterId": "chapter-a-3"},
        headers=_auth_headers(),
    )
    assert reminder_again.status_code == 200
    assert reminder_again.json()["triggered"] == {"reminders": 0, "warnings": 0}

    warning_response = client.post(
        "/api/projects/project-a-1/kb/foreshadow/check-notifications",
        json={"currentChapterId": "chapter-a-8"},
        headers=_auth_headers(),
    )
    assert warning_response.status_code == 200
    assert warning_response.json()["triggered"] == {"reminders": 0, "warnings": 1}

    warning_again = client.post(
        "/api/projects/project-a-1/kb/foreshadow/check-notifications",
        json={"currentChapterId": "chapter-a-8"},
        headers=_auth_headers(),
    )
    assert warning_again.status_code == 200
    assert warning_again.json()["triggered"] == {"reminders": 0, "warnings": 0}

    foreshadow = client.get(
        f"/api/projects/project-a-1/kb/foreshadow/{created['id']}",
        headers=_auth_headers(),
    ).json()["foreshadow"]
    assert foreshadow["notifyState"] == {"reminded": True, "warned": True}

    types = [
        item["type"]
        for item in app.state.fake_db.notifications
        if item.get("projectId") == "project-a-1"
    ]
    assert types.count("foreshadow_reminder") == 1
    assert types.count("foreshadow_warning") == 1


def test_abandon_clears_notification_state_and_soft_delete_surfaces_in_trash(
    client: TestClient,
) -> None:
    _add_chapter("chapter-a-2", 1, title="第二章")
    _add_chapter("chapter-a-3", 2, title="第三章")

    created = client.post(
        "/api/projects/project-a-1/kb/foreshadow",
        json={
            "name": "青灯主人身份",
            "summary": "老僧身份另有来历",
            "plantedChapterId": "chapter-a-1",
            "quote": "他提灯离开时背影像极了画中人。",
            "expectedResolveChapterId": "chapter-a-2",
        },
        headers=_auth_headers(),
    ).json()["foreshadow"]

    reminder_response = client.post(
        "/api/projects/project-a-1/kb/foreshadow/check-notifications",
        json={"currentChapterId": "chapter-a-2"},
        headers=_auth_headers(),
    )
    assert reminder_response.status_code == 200

    abandon_response = client.patch(
        f"/api/projects/project-a-1/kb/foreshadow/{created['id']}",
        json={"status": "abandoned"},
        headers=_auth_headers(),
    )
    assert abandon_response.status_code == 200
    assert abandon_response.json()["foreshadow"]["notifyState"] == {
        "reminded": False,
        "warned": False,
    }

    delete_response = client.delete(
        f"/api/projects/project-a-1/kb/foreshadow/{created['id']}",
        headers=_auth_headers(),
    )
    assert delete_response.status_code == 200

    trash_response = client.get(
        "/api/projects/project-a-1/trash?sourceType=kb",
        headers=_auth_headers(),
    )
    assert trash_response.status_code == 200
    trash_items = trash_response.json()["items"]
    assert any(
        item["entityType"] == "foreshadow" and item["entityId"] == created["id"]
        for item in trash_items
    )
