from fastapi.testclient import TestClient


def test_create_annotation_success(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations",
        json={
            "anchorStart": 3,
            "anchorEnd": 8,
            "selectedText": "测试片段",
            "content": "这里需要补充伏笔",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 201
    annotation = response.json()["annotation"]
    assert annotation["chapterId"] == "chapter-a-1"
    assert annotation["projectId"] == "project-a-1"
    assert annotation["anchorStart"] == 3
    assert annotation["anchorEnd"] == 8
    assert annotation["selectedText"] == "测试片段"
    assert annotation["content"] == "这里需要补充伏笔"
    assert annotation["resolved"] is False
    assert "id" in annotation
    assert "createdAt" in annotation
    assert "updatedAt" in annotation


def test_create_annotation_rejects_invalid_range(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations",
        json={
            "anchorStart": 10,
            "anchorEnd": 5,
            "selectedText": "错误范围",
            "content": "不应该创建",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ANNOTATION_RANGE_INVALID"


def test_list_annotations_sorted_and_filtered(client: TestClient) -> None:
    headers = {"Authorization": "Bearer token-of-user-a"}
    first = client.post(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations",
        json={
            "anchorStart": 15,
            "anchorEnd": 20,
            "selectedText": "后段",
            "content": "后面的批注",
        },
        headers=headers,
    )
    second = client.post(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations",
        json={
            "anchorStart": 2,
            "anchorEnd": 4,
            "selectedText": "前段",
            "content": "前面的批注",
        },
        headers=headers,
    )
    annotation_id = first.json()["annotation"]["id"]
    client.patch(
        f"/api/projects/project-a-1/annotations/{annotation_id}",
        json={"resolved": True},
        headers=headers,
    )

    response = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations?resolved=false",
        headers=headers,
    )

    assert response.status_code == 200
    annotations = response.json()["annotations"]
    assert len(annotations) == 1
    assert annotations[0]["anchorStart"] == 2
    assert annotations[0]["resolved"] is False
    assert second.json()["annotation"]["id"] == annotations[0]["id"]


def test_update_annotation_content_and_resolved(client: TestClient) -> None:
    headers = {"Authorization": "Bearer token-of-user-a"}
    create_response = client.post(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations",
        json={
            "anchorStart": 1,
            "anchorEnd": 3,
            "selectedText": "正文",
            "content": "初始批注",
        },
        headers=headers,
    )
    annotation_id = create_response.json()["annotation"]["id"]

    response = client.patch(
        f"/api/projects/project-a-1/annotations/{annotation_id}",
        json={"content": "更新后的批注", "resolved": True},
        headers=headers,
    )

    assert response.status_code == 200
    annotation = response.json()["annotation"]
    assert annotation["id"] == annotation_id
    assert annotation["content"] == "更新后的批注"
    assert annotation["resolved"] is True


def test_delete_annotation_success(client: TestClient) -> None:
    headers = {"Authorization": "Bearer token-of-user-a"}
    create_response = client.post(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations",
        json={
            "anchorStart": 4,
            "anchorEnd": 9,
            "selectedText": "待删除",
            "content": "删除这个批注",
        },
        headers=headers,
    )
    annotation_id = create_response.json()["annotation"]["id"]

    delete_response = client.delete(
        f"/api/projects/project-a-1/annotations/{annotation_id}",
        headers=headers,
    )
    list_response = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations",
        headers=headers,
    )

    assert delete_response.status_code == 200
    assert delete_response.json()["ok"] is True
    assert list_response.json()["annotations"] == []


def test_annotation_forbidden(client: TestClient) -> None:
    response = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1/annotations",
        headers={"Authorization": "Bearer token-of-user-b"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
