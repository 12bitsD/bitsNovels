from fastapi.testclient import TestClient

from server.main import app


def _auth_headers(user: str = "user-a") -> dict[str, str]:
    return {"Authorization": f"Bearer token-of-{user}"}


def test_parser_creates_faction_with_ai_source(client: TestClient) -> None:
    from server.services import parser_service

    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": "张三加入“天机阁”，随后与“白鹿盟”对峙。"},
        headers=_auth_headers(),
    )
    assert response.status_code == 202

    parser_service.process_parser_queue()

    list_response = client.get(
        "/api/projects/project-a-1/kb/faction?query=天机",
        headers=_auth_headers(),
    )

    assert list_response.status_code == 200
    body = list_response.json()
    assert body["total"] == 1
    faction = body["items"][0]
    assert faction["name"] == "天机阁"
    assert faction["source"] == "ai"
    assert faction["confirmed"] is False
    assert faction["chapterIds"] == ["chapter-a-1"]


def test_list_factions_supports_query_and_type_filter(client: TestClient) -> None:
    from server.services.kb_core_service import create_kb_entity

    create_kb_entity(
        "project-a-1",
        "faction",
        {"name": "青州国", "factionType": "country", "aliases": ["青州"]},
    )
    create_kb_entity(
        "project-a-1",
        "faction",
        {"name": "青州帮", "factionType": "gang", "aliases": ["青帮"]},
    )

    response = client.get(
        "/api/projects/project-a-1/kb/faction?query=青州&factionType=country",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "青州国"


def test_get_faction_detail_returns_relationship_fields(client: TestClient) -> None:
    from server.services.kb_core_service import create_kb_entity

    ally = create_kb_entity(
        "project-a-1", "faction", {"name": "盟友会", "factionType": "company"}
    )
    rival = create_kb_entity(
        "project-a-1", "faction", {"name": "宿敌盟", "factionType": "gang"}
    )
    created = create_kb_entity(
        "project-a-1",
        "faction",
        {
            "name": "天机阁",
            "aliases": ["天机组织"],
            "factionType": "sect",
            "summary": "情报组织",
            "memberCharacterIds": ["kb-100"],
            "allyFactionIds": [ally["id"]],
            "rivalFactionIds": [rival["id"]],
            "chapterIds": ["chapter-a-1"],
        },
    )

    response = client.get(
        f"/api/projects/project-a-1/kb/faction/{created['id']}",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    faction = response.json()["faction"]
    assert faction["id"] == created["id"]
    assert faction["name"] == "天机阁"
    assert faction["aliases"] == ["天机组织"]
    assert faction["summary"] == "情报组织"
    assert faction["memberCharacterIds"] == ["kb-100"]
    assert faction["allyFactionIds"] == [ally["id"]]
    assert faction["rivalFactionIds"] == [rival["id"]]


def test_confirm_and_bulk_confirm_factions(client: TestClient) -> None:
    from server.services.kb_core_service import create_kb_entity

    first = create_kb_entity(
        "project-a-1", "faction", {"name": "流云宗", "source": "ai"}
    )
    second = create_kb_entity(
        "project-a-1", "faction", {"name": "九霄盟", "source": "ai"}
    )

    confirm_response = client.post(
        f"/api/projects/project-a-1/kb/faction/{first['id']}/confirm",
        headers=_auth_headers(),
    )
    assert confirm_response.status_code == 200
    assert confirm_response.json()["faction"]["confirmed"] is True

    bulk_response = client.post(
        "/api/projects/project-a-1/kb/faction/bulk-confirm",
        json={"entityIds": [first["id"], second["id"]]},
        headers=_auth_headers(),
    )

    assert bulk_response.status_code == 200
    assert bulk_response.json()["confirmedCount"] == 2
    assert app.state.kb_items[second["id"]]["confirmed"] is True


def test_mark_faction_as_not_faction_soft_deletes_and_excludes_name(
    client: TestClient,
) -> None:
    from server.services.kb_core_service import create_kb_entity

    created = create_kb_entity(
        "project-a-1", "faction", {"name": "杂牌帮", "source": "ai"}
    )

    response = client.post(
        f"/api/projects/project-a-1/kb/faction/{created['id']}/not-faction",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert response.json()["faction"]["deletedAt"] is not None
    parser_excludes = app.state.kb_settings["project-a-1"]["parserExcludes"]
    assert parser_excludes["factionNames"] == ["杂牌帮"]


def test_patch_faction_members_syncs_character_membership_and_removes_circular_links(
    client: TestClient,
) -> None:
    from server.services.kb_core_service import create_kb_entity

    faction = create_kb_entity(
        "project-a-1", "faction", {"name": "天机阁", "factionType": "sect"}
    )
    ally = create_kb_entity(
        "project-a-1", "faction", {"name": "白鹿盟", "factionType": "company"}
    )
    character = create_kb_entity(
        "project-a-1", "character", {"name": "林九", "chapterIds": ["chapter-a-1"]}
    )

    response = client.patch(
        f"/api/projects/project-a-1/kb/faction/{faction['id']}",
        json={
            "memberCharacterIds": [character["id"]],
            "allyFactionIds": [ally["id"], faction["id"]],
            "rivalFactionIds": [faction["id"]],
        },
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    updated = response.json()["faction"]
    assert updated["memberCharacterIds"] == [character["id"]]
    assert updated["allyFactionIds"] == [ally["id"]]
    assert updated["rivalFactionIds"] == []
    assert app.state.kb_characters[character["id"]]["factionId"] == faction["id"]
