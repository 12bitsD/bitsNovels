from fastapi.testclient import TestClient

from server.main import app


def _auth_headers(user: str = "user-a") -> dict[str, str]:
    return {"Authorization": f"Bearer token-of-{user}"}


def test_parser_creates_character_with_ai_source_and_appearance_stats(
    client: TestClient,
) -> None:
    from server.services import parser_service

    content = "张三来到长安城，加入天机阁。"

    first_response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": content},
        headers=_auth_headers(),
    )
    assert first_response.status_code == 202
    parser_service.process_parser_queue()

    list_response = client.get(
        "/api/projects/project-a-1/kb/character?query=张三",
        headers=_auth_headers(),
    )

    assert list_response.status_code == 200
    body = list_response.json()
    assert body["total"] == 1
    character = body["items"][0]
    assert character["name"] == "张三"
    assert character["source"] == "ai"
    assert character["confirmed"] is False
    assert character["chapterIds"] == ["chapter-a-1"]
    assert character["appearanceCount"] == 1
    assert character["firstAppearanceChapterId"] == "chapter-a-1"
    assert character["lastAppearanceChapterId"] == "chapter-a-1"


def test_list_characters_supports_search_and_appearance_sort(
    client: TestClient,
) -> None:
    from server.services.kb_core_service import create_kb_entity

    create_kb_entity(
        "project-a-1",
        "character",
        {
            "name": "李四",
            "aliases": ["四哥"],
            "chapterIds": ["chapter-a-1"],
            "source": "manual",
        },
    )
    create_kb_entity(
        "project-a-1",
        "character",
        {
            "name": "李小四",
            "aliases": ["小四"],
            "chapterIds": ["chapter-a-1", "chapter-a-2", "chapter-a-3"],
            "source": "manual",
        },
    )

    response = client.get(
        "/api/projects/project-a-1/kb/character?query=李&sortBy=appearanceCount",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert [item["name"] for item in body["items"]] == ["李小四", "李四"]


def test_get_character_detail_returns_entity_fields(client: TestClient) -> None:
    from server.services.kb_core_service import create_kb_entity

    created = create_kb_entity(
        "project-a-1",
        "character",
        {
            "name": "王五",
            "aliases": ["阿五"],
            "gender": "male",
            "occupation": "捕快",
            "appearance": "黑衣高个",
            "personalityTags": ["谨慎", "忠诚"],
            "chapterIds": ["chapter-a-1"],
        },
    )

    response = client.get(
        f"/api/projects/project-a-1/kb/character/{created['id']}",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    character = response.json()["character"]
    assert character["id"] == created["id"]
    assert character["name"] == "王五"
    assert character["aliases"] == ["阿五"]
    assert character["gender"] == "male"
    assert character["occupation"] == "捕快"
    assert character["appearance"] == "黑衣高个"
    assert character["personalityTags"] == ["谨慎", "忠诚"]


def test_confirm_and_bulk_confirm_characters(client: TestClient) -> None:
    from server.services.kb_core_service import create_kb_entity

    first = create_kb_entity(
        "project-a-1", "character", {"name": "赵六", "source": "ai"}
    )
    second = create_kb_entity(
        "project-a-1", "character", {"name": "孙七", "source": "ai"}
    )

    confirm_response = client.post(
        f"/api/projects/project-a-1/kb/character/{first['id']}/confirm",
        headers=_auth_headers(),
    )
    assert confirm_response.status_code == 200
    assert confirm_response.json()["character"]["confirmed"] is True

    bulk_response = client.post(
        "/api/projects/project-a-1/kb/character/bulk-confirm",
        json={"entityIds": [first["id"], second["id"], "missing-id"]},
        headers=_auth_headers(),
    )

    assert bulk_response.status_code == 200
    assert bulk_response.json()["confirmedCount"] == 2
    assert app.state.kb_items[second["id"]]["confirmed"] is True


def test_mark_character_as_not_character_soft_deletes_and_excludes_name(
    client: TestClient,
) -> None:
    from server.services.kb_core_service import create_kb_entity

    created = create_kb_entity(
        "project-a-1", "character", {"name": "路人甲", "source": "ai"}
    )

    response = client.post(
        f"/api/projects/project-a-1/kb/character/{created['id']}/not-character",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert response.json()["character"]["deletedAt"] is not None
    assert app.state.kb_items[created["id"]]["deletedAt"] is not None
    parser_excludes = app.state.kb_settings["project-a-1"]["parserExcludes"]
    assert parser_excludes["characterNames"] == ["路人甲"]


def test_patch_character_faction_syncs_bidirectionally(client: TestClient) -> None:
    from server.services.kb_core_service import create_kb_entity

    first_faction = create_kb_entity(
        "project-a-1", "faction", {"name": "旧势力", "factionType": "sect"}
    )
    second_faction = create_kb_entity(
        "project-a-1", "faction", {"name": "新势力", "factionType": "sect"}
    )
    character = create_kb_entity(
        "project-a-1",
        "character",
        {
            "name": "顾八",
            "factionId": first_faction["id"],
            "chapterIds": ["chapter-a-1"],
        },
    )
    app.state.kb_factions[first_faction["id"]]["memberCharacterIds"] = [character["id"]]

    response = client.patch(
        f"/api/projects/project-a-1/kb/character/{character['id']}",
        json={"factionId": second_faction["id"]},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    updated = response.json()["character"]
    assert updated["factionId"] == second_faction["id"]
    assert (
        character["id"]
        not in app.state.kb_factions[first_faction["id"]]["memberCharacterIds"]
    )
    assert (
        character["id"]
        in app.state.kb_factions[second_faction["id"]]["memberCharacterIds"]
    )
