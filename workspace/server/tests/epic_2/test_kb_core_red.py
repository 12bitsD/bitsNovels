from fastapi.testclient import TestClient

from server.main import app


def test_kb_shared_models_validate_contract_shapes() -> None:
    from ...models.kb_models import (
        KBBulkActionRequest,
        KBEntityBase,
        KBListResponse,
        KBSearchParams,
    )

    entity = KBEntityBase(
        id="kb-1",
        projectId="project-a-1",
        source="manual",
        confirmed=False,
        createdAt="2026-04-07T00:00:00Z",
        updatedAt="2026-04-07T00:00:00Z",
    )
    response = KBListResponse(items=[entity.model_dump()], total=1)
    params = KBSearchParams(query="张三", entityTypes=["character", "item"], limit=5)
    bulk = KBBulkActionRequest(entityIds=["kb-1", "kb-2"])

    assert response.total == 1
    assert params.query == "张三"
    assert params.entityTypes == ["character", "item"]
    assert bulk.entityIds == ["kb-1", "kb-2"]


def test_create_update_and_soft_delete_kb_entity_manage_shared_state() -> None:
    from ...services.kb_core_service import (
        create_kb_entity,
        soft_delete_kb_entity,
        update_kb_entity,
    )

    created = create_kb_entity(
        "project-a-1",
        "character",
        {
            "name": "张三",
            "aliases": ["阿三", "张三", "阿三"],
            "chapterIds": ["chapter-a-1"],
            "source": "manual",
            "remark": "初版设定",
        },
    )

    assert created["type"] == "character"
    assert created["aliases"] == ["阿三"]
    assert created["appearanceCount"] == 1
    assert created["firstAppearanceChapterId"] == "chapter-a-1"
    assert created["lastAppearanceChapterId"] == "chapter-a-1"
    assert created["id"] in app.state.kb_items
    assert created["id"] in app.state.kb_characters

    updated = update_kb_entity(
        "project-a-1",
        "character",
        created["id"],
        {
            "aliases": ["三哥", "阿三"],
            "chapterIds": ["chapter-a-1", "chapter-a-2"],
            "remark": "补充备注",
        },
    )

    assert updated["aliases"] == ["阿三", "三哥"]
    assert updated["chapterIds"] == ["chapter-a-1", "chapter-a-2"]
    assert updated["appearanceCount"] == 2
    assert updated["lastAppearanceChapterId"] == "chapter-a-2"
    assert updated["remark"] == "补充备注"

    deleted = soft_delete_kb_entity("project-a-1", "character", created["id"])

    assert deleted["deletedAt"] is not None
    assert deleted["restoreUntil"] is not None


def test_confirm_reject_and_bulk_confirm_entities_update_confirmation_flags() -> None:
    from ...services.kb_core_service import (
        bulk_confirm_entities,
        confirm_kb_entity,
        create_kb_entity,
        reject_kb_entity,
    )

    first = create_kb_entity("project-a-1", "item", {"name": "玄铁剑", "source": "ai"})
    second = create_kb_entity("project-a-1", "item", {"name": "青铜镜", "source": "ai"})

    rejected = reject_kb_entity("project-a-1", "item", first["id"], remark="普通物件")
    assert rejected["confirmed"] is False
    assert rejected["remark"] == "普通物件"
    assert rejected["isRejected"] is True

    confirmed = confirm_kb_entity("project-a-1", "item", first["id"])
    assert confirmed["confirmed"] is True
    assert confirmed["isRejected"] is False

    bulk_result = bulk_confirm_entities(
        "project-a-1", "item", [first["id"], second["id"], "missing-id"]
    )
    assert bulk_result["confirmedCount"] == 2
    assert app.state.kb_items[second["id"]]["confirmed"] is True


def test_merge_entities_moves_references_aliases_and_remarks() -> None:
    from ...services.kb_core_service import create_kb_entity, merge_entities

    target = create_kb_entity(
        "project-a-1",
        "character",
        {"name": "张三", "aliases": ["阿三"], "remark": "主条目"},
    )
    source = create_kb_entity(
        "project-a-1",
        "character",
        {
            "name": "张小三",
            "aliases": ["小三"],
            "remark": "旧备注",
            "chapterIds": ["chapter-a-2"],
        },
    )
    location = create_kb_entity(
        "project-a-1",
        "location",
        {
            "name": "长安城",
            "characterIds": [source["id"]],
            "chapterIds": ["chapter-a-2"],
        },
    )
    item = create_kb_entity(
        "project-a-1",
        "item",
        {
            "name": "玄铁剑",
            "ownerCharacterId": source["id"],
            "chapterIds": ["chapter-a-2"],
        },
    )
    faction = create_kb_entity(
        "project-a-1",
        "faction",
        {"name": "天机阁", "memberCharacterIds": [source["id"]]},
    )

    merged = merge_entities("project-a-1", "character", source["id"], target["id"])

    assert merged["target"]["aliases"] == ["阿三", "张小三", "小三"]
    assert "旧备注" in merged["target"]["remark"]
    assert app.state.kb_items[source["id"]]["deletedAt"] is not None
    assert source["id"] not in app.state.kb_locations[location["id"]]["characterIds"]
    assert target["id"] in app.state.kb_locations[location["id"]]["characterIds"]
    assert app.state.kb_items[item["id"]]["ownerCharacterId"] == target["id"]
    assert target["id"] in app.state.kb_factions[faction["id"]]["memberCharacterIds"]


def test_search_entities_matches_name_alias_and_remark_with_filters() -> None:
    from ...services.kb_core_service import create_kb_entity, search_entities

    create_kb_entity(
        "project-a-1",
        "character",
        {"name": "张三", "aliases": ["阿三"], "remark": "主角"},
    )
    create_kb_entity(
        "project-a-1",
        "item",
        {"name": "玄铁剑", "aliases": ["黑剑"], "summary": "张三的佩剑"},
    )

    name_results = search_entities("project-a-1", "张三")
    alias_results = search_entities("project-a-1", "黑剑", ["item"])

    assert [result["type"] for result in name_results] == ["character", "item"]
    assert alias_results[0]["type"] == "item"
    assert alias_results[0]["matchedField"] == "aliases"


def test_parser_processing_materializes_shared_kb_entities(client: TestClient) -> None:
    from server.services import parser_service

    content = "张三在长安城加入天机阁，并得到玄铁剑，这似乎只是开始。"

    response = client.post(
        "/api/projects/project-a-1/parser/chapters/chapter-a-1/trigger",
        json={"content": content},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 202

    parser_service.process_parser_queue()

    stored_types = {
        entity["type"]
        for entity in app.state.kb_items.values()
        if entity["projectId"] == "project-a-1" and entity.get("deletedAt") is None
    }
    character = next(
        entity for entity in app.state.kb_items.values() if entity.get("name") == "张三"
    )

    assert {"character", "location", "item", "faction", "foreshadow"}.issubset(
        stored_types
    )
    assert character["source"] == "ai"
    assert character["confirmed"] is False
    assert character["appearanceCount"] >= 1
