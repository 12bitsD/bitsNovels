"""
US-2.4 Item Knowledge Base — 红灯测试

覆盖 KBItem CRUD 端点:
1. GET    /api/projects/:projectId/kb/item           — 列表
2. POST   /api/projects/:projectId/kb/item           — 创建
3. GET    /api/projects/:projectId/kb/item/:entityId — 详情
4. PATCH  /api/projects/:projectId/kb/item/:entityId — 更新
5. DELETE /api/projects/:projectId/kb/item/:entityId — 软删除
6. POST   /api/projects/:projectId/kb/item/:entityId/confirm  — 确认
7. POST   /api/projects/:projectId/kb/item/:entityId/reject    — 拒绝
8. POST   /api/projects/:projectId/kb/item/bulk-confirm        — 批量确认
9. POST   /api/projects/:projectId/kb/item/:entityId/merge     — 合并
10. GET    /api/projects/:projectId/kb/item/:entityId/references — 引用检查
"""

from fastapi.testclient import TestClient

# ─── 1. GET /kb/item — 列表 ───────────────────────────────────────────────────


def test_list_items_empty(client: TestClient) -> None:
    """Returns empty list when no items exist."""
    response = client.get(
        "/api/projects/project-a-1/kb/item",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


def test_list_items_excludes_deleted(client: TestClient) -> None:
    """Soft-deleted items are not returned in list."""
    # Create an item first
    client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "测试道具",
            "aliases": ["test"],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Create another item and delete it
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "待删除道具",
            "aliases": [],
            "itemType": "armor",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]
    client.delete(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # List should only return non-deleted items
    response = client.get(
        "/api/projects/project-a-1/kb/item",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["name"] == "测试道具"


def test_list_items_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission for the project."""
    response = client.get(
        "/api/projects/project-a-1/kb/item",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


# ─── 2. POST /kb/item — 创建 ──────────────────────────────────────────────────


def test_create_item_success(client: TestClient) -> None:
    """Creates a new KBItem with required fields."""
    response = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "玄铁剑",
            "aliases": ["黑剑", "铁剑"],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "item" in body
    item = body["item"]
    assert item["name"] == "玄铁剑"
    assert item["aliases"] == ["黑剑", "铁剑"]
    assert item["itemType"] == "weapon"
    assert item["source"] == "manual"
    assert item["confirmed"] is False
    assert item["ownerCharacterId"] is None
    assert item["ownershipHistory"] == []
    assert item["chapterIds"] == []
    assert "id" in item
    assert "projectId" in item
    assert "createdAt" in item
    assert "updatedAt" in item


def test_create_item_with_owner_and_chapters(client: TestClient) -> None:
    """Creates item with optional owner and chapterIds."""
    response = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "生命药水",
            "aliases": ["HP药"],
            "itemType": "consumable",
            "source": "manual",
            "ownerCharacterId": "char-1",
            "chapterIds": ["chapter-a-1"],
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    item = response.json()["item"]
    assert item["ownerCharacterId"] == "char-1"
    assert item["chapterIds"] == ["chapter-a-1"]


def test_create_item_missing_name(client: TestClient) -> None:
    """Returns 400 if name is missing."""
    response = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ITEM_NAME_REQUIRED"


def test_create_item_invalid_item_type(client: TestClient) -> None:
    """Returns 400 if itemType is invalid."""
    response = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "测试",
            "aliases": [],
            "itemType": "invalid_type",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_ITEM_TYPE"


# ─── 3. GET /kb/item/:entityId — 详情 ─────────────────────────────────────────


def test_get_item_success(client: TestClient) -> None:
    """Returns item detail by ID."""
    # Create an item first
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "玄铁剑",
            "aliases": ["黑剑"],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.get(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["id"] == item_id
    assert item["name"] == "玄铁剑"
    assert item["aliases"] == ["黑剑"]


def test_get_item_not_found(client: TestClient) -> None:
    """Returns 404 if item not found."""
    response = client.get(
        "/api/projects/project-a-1/kb/item/non-existent-id",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_get_item_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission for the project."""
    # Create item as user-a
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "玄铁剑",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]
    # Access as user-b
    response = client.get(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


# ─── 4. PATCH /kb/item/:entityId — 更新 ───────────────────────────────────────


def test_patch_item_name(client: TestClient) -> None:
    """Updates item name."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "旧名称",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.patch(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        json={"name": "新名称"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["name"] == "新名称"


def test_patch_item_aliases(client: TestClient) -> None:
    """Updates item aliases."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "测试道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.patch(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        json={"aliases": ["alias1", "alias2"]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["aliases"] == ["alias1", "alias2"]


def test_patch_item_owner_character(client: TestClient) -> None:
    """Updates item owner and records ownership history."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "测试道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.patch(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        json={
            "ownerCharacterId": "char-new-owner",
            "ownershipNote": "转让给新主人",
            "ownershipChapterId": "chapter-a-1",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["ownerCharacterId"] == "char-new-owner"
    # Should have ownership history record
    assert len(item["ownershipHistory"]) == 1
    record = item["ownershipHistory"][0]
    assert record["toCharacterId"] == "char-new-owner"
    assert record["chapterId"] == "chapter-a-1"
    assert record["note"] == "转让给新主人"


def test_patch_item_chapters(client: TestClient) -> None:
    """Updates chapterIds."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "测试道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.patch(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        json={"chapterIds": ["chapter-a-1", "chapter-a-2"]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["chapterIds"] == ["chapter-a-1", "chapter-a-2"]


def test_patch_item_not_found(client: TestClient) -> None:
    """Returns 404 if item not found."""
    response = client.patch(
        "/api/projects/project-a-1/kb/item/non-existent-id",
        json={"name": "新名称"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ITEM_NOT_FOUND"


# ─── 5. DELETE /kb/item/:entityId — 软删除 ──────────────────────────────────


def test_delete_item_success(client: TestClient) -> None:
    """Soft deletes an item."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "待删除道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.delete(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True
    client.get(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Soft-deleted items are still accessible via GET until restoreUntil passes
    # But they're excluded from list


def test_delete_item_not_found(client: TestClient) -> None:
    """Returns 404 if item not found."""
    response = client.delete(
        "/api/projects/project-a-1/kb/item/non-existent-id",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_delete_item_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission for the project."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "测试道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]
    response = client.delete(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


# ─── 6. POST /kb/item/:entityId/confirm — 确认 ───────────────────────────────


def test_confirm_item_success(client: TestClient) -> None:
    """Marks an AI-detected item as confirmed."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "AI道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "ai",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.post(
        f"/api/projects/project-a-1/kb/item/{item_id}/confirm",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["confirmed"] is True


def test_confirm_item_not_found(client: TestClient) -> None:
    """Returns 404 if item not found."""
    response = client.post(
        "/api/projects/project-a-1/kb/item/non-existent-id/confirm",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ITEM_NOT_FOUND"


# ─── 7. POST /kb/item/:entityId/reject — 拒绝 ────────────────────────────────


def test_reject_item_success(client: TestClient) -> None:
    """Marks an AI-detected item as rejected with remark."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "误识别道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "ai",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.post(
        f"/api/projects/project-a-1/kb/item/{item_id}/reject",
        json={"remark": "这不是道具"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["confirmed"] is False
    assert item["remark"] == "这不是道具"


def test_reject_item_not_found(client: TestClient) -> None:
    """Returns 404 if item not found."""
    response = client.post(
        "/api/projects/project-a-1/kb/item/non-existent-id/reject",
        json={"remark": "误识别"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ITEM_NOT_FOUND"


# ─── 8. POST /kb/item/bulk-confirm — 批量确认 ─────────────────────────────────


def test_bulk_confirm_success(client: TestClient) -> None:
    """Confirms multiple items at once."""
    # Create two AI items
    resp1 = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "AI道具1",
            "aliases": [],
            "itemType": "weapon",
            "source": "ai",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    resp2 = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "AI道具2",
            "aliases": [],
            "itemType": "armor",
            "source": "ai",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id_1 = resp1.json()["item"]["id"]
    item_id_2 = resp2.json()["item"]["id"]

    response = client.post(
        "/api/projects/project-a-1/kb/item/bulk-confirm",
        json={"entityIds": [item_id_1, item_id_2]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["confirmedCount"] == 2

    # Verify both are confirmed
    get1 = client.get(
        f"/api/projects/project-a-1/kb/item/{item_id_1}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    get2 = client.get(
        f"/api/projects/project-a-1/kb/item/{item_id_2}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert get1.json()["item"]["confirmed"] is True
    assert get2.json()["item"]["confirmed"] is True


def test_bulk_confirm_empty_list(client: TestClient) -> None:
    """Returns 400 if entityIds is empty."""
    response = client.post(
        "/api/projects/project-a-1/kb/item/bulk-confirm",
        json={"entityIds": []},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EMPTY_ENTITY_IDS"


# ─── 9. POST /kb/item/:entityId/merge — 合并 ─────────────────────────────────


def test_merge_item_success(client: TestClient) -> None:
    """Merges source item into target item."""
    # Create source item
    source_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "源道具",
            "aliases": ["别名1"],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    source_id = source_resp.json()["item"]["id"]

    # Create target item
    target_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "目标道具",
            "aliases": ["别名2"],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    target_id = target_resp.json()["item"]["id"]

    response = client.post(
        f"/api/projects/project-a-1/kb/item/{source_id}/merge",
        json={"targetId": target_id},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    # Source should be soft-deleted
    get_source = client.get(
        f"/api/projects/project-a-1/kb/item/{source_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert get_source.json()["item"]["deletedAt"] is not None


def test_merge_item_not_found(client: TestClient) -> None:
    """Returns 404 if source item not found."""
    response = client.post(
        "/api/projects/project-a-1/kb/item/non-existent-id/merge",
        json={"targetId": "some-id"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_merge_item_target_not_found(client: TestClient) -> None:
    """Returns 404 if target item not found."""
    # Create source item
    source_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "源道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    source_id = source_resp.json()["item"]["id"]

    response = client.post(
        f"/api/projects/project-a-1/kb/item/{source_id}/merge",
        json={"targetId": "non-existent-target"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "TARGET_ITEM_NOT_FOUND"


# ─── 10. GET /kb/item/:entityId/references — 引用检查 ─────────────────────────


def test_references_none(client: TestClient) -> None:
    """Returns empty references when item is not referenced."""
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "孤立道具",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    response = client.get(
        f"/api/projects/project-a-1/kb/item/{item_id}/references",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["hasReferences"] is False
    assert body["references"] == []


def test_references_not_found(client: TestClient) -> None:
    """Returns 404 if item not found."""
    response = client.get(
        "/api/projects/project-a-1/kb/item/non-existent-id/references",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_list_items_supports_search_and_type_filter(client: TestClient) -> None:
    client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "玄铁剑",
            "aliases": ["黑剑"],
            "itemType": "weapon",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "玄铁甲",
            "aliases": [],
            "itemType": "armor",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    response = client.get(
        "/api/projects/project-a-1/kb/item?query=黑剑&itemType=weapon",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "玄铁剑"


def test_patch_item_same_owner_does_not_duplicate_ownership_history(
    client: TestClient,
) -> None:
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "城主令",
            "aliases": [],
            "itemType": "token",
            "source": "manual",
            "ownerCharacterId": "char-1",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    first_patch = client.patch(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        json={
            "ownerCharacterId": "char-2",
            "ownershipChapterId": "chapter-a-1",
            "ownershipNote": "夺得令牌",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert first_patch.status_code == 200

    second_patch = client.patch(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        json={
            "ownerCharacterId": "char-2",
            "ownershipChapterId": "chapter-a-1",
            "ownershipNote": "重复同步",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert second_patch.status_code == 200
    item = second_patch.json()["item"]
    assert item["ownerCharacterId"] == "char-2"
    assert len(item["ownershipHistory"]) == 1
    assert item["ownershipHistory"][0]["fromCharacterId"] == "char-1"


def test_parser_updates_item_owner_and_appends_history(client: TestClient) -> None:
    import server.services.kb_item_service as kb_item_service

    created = kb_item_service.upsert_item_from_parser(
        "project-a-1",
        {
            "name": "玄铁剑",
            "aliases": ["黑剑"],
            "itemType": "weapon",
            "ownerCharacterId": "char-zhangsan",
            "chapterIds": ["chapter-a-1"],
            "summary": "张三佩剑",
            "note": "初始认主",
        },
    )
    assert created["ownerCharacterId"] == "char-zhangsan"
    assert created["ownershipHistory"] == []

    updated = kb_item_service.upsert_item_from_parser(
        "project-a-1",
        {
            "name": "玄铁剑",
            "aliases": ["神兵"],
            "itemType": "weapon",
            "ownerCharacterId": "char-lisi",
            "chapterIds": ["chapter-a-2"],
            "summary": "李四夺走佩剑",
            "note": "擂台易主",
        },
    )

    assert updated["id"] == created["id"]
    assert updated["ownerCharacterId"] == "char-lisi"
    assert updated["chapterIds"] == ["chapter-a-1", "chapter-a-2"]
    assert updated["aliases"] == ["黑剑", "神兵"]
    assert len(updated["ownershipHistory"]) == 1
    record = updated["ownershipHistory"][0]
    assert record["fromCharacterId"] == "char-zhangsan"
    assert record["toCharacterId"] == "char-lisi"
    assert record["chapterId"] == "chapter-a-2"
    assert record["note"] == "擂台易主"


def test_reject_item_adds_parser_exclude_and_blocks_recreate(
    client: TestClient,
) -> None:
    create_resp = client.post(
        "/api/projects/project-a-1/kb/item",
        json={
            "name": "普通茶杯",
            "aliases": [],
            "itemType": "other",
            "source": "ai",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    item_id = create_resp.json()["item"]["id"]

    reject_resp = client.post(
        f"/api/projects/project-a-1/kb/item/{item_id}/reject",
        json={"remark": "这不是关键道具"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert reject_resp.status_code == 200

    import server.services.kb_item_service as kb_item_service

    skipped = kb_item_service.upsert_item_from_parser(
        "project-a-1",
        {
            "name": "普通茶杯",
            "aliases": ["茶盏"],
            "itemType": "other",
            "chapterIds": ["chapter-a-1"],
            "summary": "桌上的杯子",
        },
    )

    assert skipped is None
    detail_resp = client.get(
        f"/api/projects/project-a-1/kb/item/{item_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    detail = detail_resp.json()["item"]
    assert detail["isRejected"] is True
    assert detail["chapterIds"] == []
