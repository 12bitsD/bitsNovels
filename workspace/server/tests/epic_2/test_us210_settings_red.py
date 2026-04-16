from fastapi.testclient import TestClient


def _auth_headers(user: str = "user-a") -> dict[str, str]:
    token = "token-of-user-a" if user == "user-a" else "token-of-user-b"
    return {"Authorization": f"Bearer {token}"}


def test_kb_settings_crud_happy_path_red(client: TestClient) -> None:
    create = client.post(
        "/api/projects/project-a-1/kb/settings",
        headers=_auth_headers(),
        json={
            "title": "帝国纪年体系",
            "category": "历史",
            "content": "采用三段纪年：奠基纪、扩张纪、裂变纪。",
        },
    )
    assert create.status_code == 201
    setting = create.json()["setting"]
    setting_id = setting["id"]
    assert setting["title"] == "帝国纪年体系"
    assert setting["category"] == "历史"
    assert setting["source"] in ("manual", "ai")
    assert setting["confirmed"] is False

    detail = client.get(
        f"/api/projects/project-a-1/kb/settings/{setting_id}",
        headers=_auth_headers(),
    )
    assert detail.status_code == 200
    assert detail.json()["setting"]["id"] == setting_id

    patch = client.patch(
        f"/api/projects/project-a-1/kb/settings/{setting_id}",
        headers=_auth_headers(),
        json={"content": "改成两段纪年：奠基纪、裂变纪。"},
    )
    assert patch.status_code == 200
    assert patch.json()["setting"]["content"] == "改成两段纪年：奠基纪、裂变纪。"

    listing = client.get(
        "/api/projects/project-a-1/kb/settings",
        headers=_auth_headers(),
    )
    assert listing.status_code == 200
    assert listing.json()["total"] >= 1

    delete = client.delete(
        f"/api/projects/project-a-1/kb/settings/{setting_id}",
        headers=_auth_headers(),
    )
    assert delete.status_code == 200

    listing_after = client.get(
        "/api/projects/project-a-1/kb/settings",
        headers=_auth_headers(),
    )
    assert listing_after.status_code == 200
    ids = [item["id"] for item in listing_after.json()["items"]]
    assert setting_id not in ids


def test_kb_settings_reorder_and_references_red(client: TestClient) -> None:
    first = client.post(
        "/api/projects/project-a-1/kb/settings",
        headers=_auth_headers(),
        json={"title": "A", "category": "历史", "content": "a"},
    )
    second = client.post(
        "/api/projects/project-a-1/kb/settings",
        headers=_auth_headers(),
        json={"title": "B", "category": "地理", "content": "b"},
    )
    assert first.status_code == 201
    assert second.status_code == 201
    first_id = first.json()["setting"]["id"]
    second_id = second.json()["setting"]["id"]

    reorder = client.patch(
        "/api/projects/project-a-1/kb/settings/reorder",
        headers=_auth_headers(),
        json={"orderedIds": [second_id, first_id]},
    )
    assert reorder.status_code == 200

    listing = client.get("/api/projects/project-a-1/kb/settings", headers=_auth_headers())
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert [items[0]["id"], items[1]["id"]] == [second_id, first_id]

    refs = client.post(
        f"/api/projects/project-a-1/kb/settings/{first_id}/references",
        headers=_auth_headers(),
        json={
            "relatedEntityRefs": [
                {"entityType": "character", "entityId": "kb-character-1"}
            ]
        },
    )
    assert refs.status_code == 200
    related = refs.json()["setting"]["relatedEntityRefs"]
    assert related == [{"entityType": "character", "entityId": "kb-character-1"}]


def test_kb_settings_requires_auth_and_project_scope_red(client: TestClient) -> None:
    unauth = client.get("/api/projects/project-a-1/kb/settings")
    assert unauth.status_code == 401

    other_user_forbidden = client.get(
        "/api/projects/project-a-1/kb/settings",
        headers=_auth_headers("user-b"),
    )
    assert other_user_forbidden.status_code == 403

