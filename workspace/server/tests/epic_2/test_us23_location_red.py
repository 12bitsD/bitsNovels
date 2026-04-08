from fastapi.testclient import TestClient


def test_list_locations_empty(client: TestClient) -> None:
    response = client.get(
        "/api/projects/project-a-1/kb/location",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


def test_create_location_with_parent_and_relations(client: TestClient) -> None:
    parent_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "长安城",
            "aliases": ["长安"],
            "locationType": "city",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    parent_id = parent_resp.json()["location"]["id"]

    response = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "朱雀大街",
            "aliases": ["朱雀街"],
            "locationType": "building",
            "parentId": parent_id,
            "description": "长安主街",
            "characterIds": ["char-zhangsan"],
            "chapterIds": ["chapter-a-1"],
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 201
    location = response.json()["location"]
    assert location["name"] == "朱雀大街"
    assert location["locationType"] == "building"
    assert location["parentId"] == parent_id
    assert location["description"] == "长安主街"
    assert location["characterIds"] == ["char-zhangsan"]
    assert location["chapterIds"] == ["chapter-a-1"]


def test_list_locations_supports_search_and_type_filter(client: TestClient) -> None:
    client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "长安城",
            "aliases": ["长安"],
            "locationType": "city",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "终南山",
            "aliases": ["终南"],
            "locationType": "nature",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    response = client.get(
        "/api/projects/project-a-1/kb/location?query=长安&locationType=city",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "长安城"


def test_get_location_detail_success(client: TestClient) -> None:
    create_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "太白楼",
            "aliases": [],
            "locationType": "building",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    location_id = create_resp.json()["location"]["id"]

    response = client.get(
        f"/api/projects/project-a-1/kb/location/{location_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    assert response.json()["location"]["id"] == location_id


def test_patch_location_updates_relationships(client: TestClient) -> None:
    parent_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "长安城",
            "aliases": [],
            "locationType": "city",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    parent_id = parent_resp.json()["location"]["id"]
    create_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "无名客栈",
            "aliases": [],
            "locationType": "building",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    location_id = create_resp.json()["location"]["id"]

    response = client.patch(
        f"/api/projects/project-a-1/kb/location/{location_id}",
        json={
            "parentId": parent_id,
            "description": "长安落脚处",
            "characterIds": ["char-zhangsan", "char-lisi"],
            "chapterIds": ["chapter-a-1", "chapter-a-2"],
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    location = response.json()["location"]
    assert location["parentId"] == parent_id
    assert location["characterIds"] == ["char-zhangsan", "char-lisi"]
    assert location["chapterIds"] == ["chapter-a-1", "chapter-a-2"]


def test_tree_query_returns_flat_parent_references(client: TestClient) -> None:
    root_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "长安城",
            "aliases": [],
            "locationType": "city",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    root_id = root_resp.json()["location"]["id"]
    child_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "朱雀大街",
            "aliases": [],
            "locationType": "building",
            "parentId": root_id,
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    child_id = child_resp.json()["location"]["id"]
    client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "悦来客栈",
            "aliases": [],
            "locationType": "building",
            "parentId": child_id,
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    response = client.get(
        "/api/projects/project-a-1/kb/location/tree",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["name"] for item in items] == ["长安城", "朱雀大街", "悦来客栈"]
    assert items[0]["parentId"] is None
    assert items[1]["parentId"] == root_id
    assert items[2]["parentId"] == child_id


def test_confirm_and_reject_location(client: TestClient) -> None:
    create_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "AI地点",
            "aliases": [],
            "locationType": "other",
            "source": "ai",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    location_id = create_resp.json()["location"]["id"]

    confirm_resp = client.post(
        f"/api/projects/project-a-1/kb/location/{location_id}/confirm",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["location"]["confirmed"] is True

    reject_resp = client.post(
        f"/api/projects/project-a-1/kb/location/{location_id}/reject",
        json={"remark": "不是有效地点"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert reject_resp.status_code == 200
    location = reject_resp.json()["location"]
    assert location["confirmed"] is False
    assert location["isRejected"] is True
    assert location["remark"] == "不是有效地点"


def test_delete_location_excludes_it_from_listing(client: TestClient) -> None:
    create_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "废弃村落",
            "aliases": [],
            "locationType": "village",
            "source": "manual",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    location_id = create_resp.json()["location"]["id"]

    delete_resp = client.delete(
        f"/api/projects/project-a-1/kb/location/{location_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert delete_resp.status_code == 200

    list_resp = client.get(
        "/api/projects/project-a-1/kb/location",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert list_resp.status_code == 200
    assert list_resp.json()["items"] == []


def test_parser_updates_existing_location_chapters_and_aliases(
    client: TestClient,
) -> None:
    import server.services.kb_location_service as kb_location_service

    created = kb_location_service.upsert_location_from_parser(
        "project-a-1",
        {
            "name": "长安城",
            "aliases": ["长安"],
            "locationType": "city",
            "chapterIds": ["chapter-a-1"],
            "characterIds": ["char-zhangsan"],
            "description": "帝都",
        },
    )

    updated = kb_location_service.upsert_location_from_parser(
        "project-a-1",
        {
            "name": "长安城",
            "aliases": ["帝京"],
            "locationType": "city",
            "chapterIds": ["chapter-a-2"],
            "characterIds": ["char-lisi"],
            "description": "皇城所在",
        },
    )

    assert updated["id"] == created["id"]
    assert updated["chapterIds"] == ["chapter-a-1", "chapter-a-2"]
    assert updated["characterIds"] == ["char-zhangsan", "char-lisi"]
    assert updated["aliases"] == ["长安", "帝京"]
    assert updated["description"] == "皇城所在"


def test_reject_location_adds_parser_exclude_and_blocks_recreate(
    client: TestClient,
) -> None:
    create_resp = client.post(
        "/api/projects/project-a-1/kb/location",
        json={
            "name": "路边茶摊",
            "aliases": [],
            "locationType": "other",
            "source": "ai",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    location_id = create_resp.json()["location"]["id"]

    reject_resp = client.post(
        f"/api/projects/project-a-1/kb/location/{location_id}/reject",
        json={"remark": "不是需要管理的地点"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert reject_resp.status_code == 200

    import server.services.kb_location_service as kb_location_service

    skipped = kb_location_service.upsert_location_from_parser(
        "project-a-1",
        {
            "name": "路边茶摊",
            "aliases": ["茶摊"],
            "locationType": "other",
            "chapterIds": ["chapter-a-1"],
        },
    )

    assert skipped is None
