from fastapi.testclient import TestClient


def test_get_chapter_note_default_empty(client: TestClient) -> None:
    response = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1/note",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    note = response.json()["note"]
    assert note["chapterId"] == "chapter-a-1"
    assert note["content"] == ""
    assert note["charCount"] == 0
    assert note["hasNote"] is False


def test_patch_chapter_note_autosave_success(client: TestClient) -> None:
    headers = {"Authorization": "Bearer token-of-user-a"}
    content = "<p>本章伏笔：玉佩来源未解释。</p>"

    patch_response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1/note",
        json={"content": content, "saveSource": "auto"},
        headers=headers,
    )
    get_response = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1/note",
        headers=headers,
    )

    assert patch_response.status_code == 200
    note = patch_response.json()["note"]
    assert note["content"] == content
    assert note["charCount"] == 11
    assert note["hasNote"] is True
    assert get_response.json()["note"]["content"] == content


def test_patch_chapter_note_rejects_too_long_content(client: TestClient) -> None:
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1/note",
        json={"content": "a" * 2001, "saveSource": "manual"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "CHAPTER_NOTE_TOO_LONG"


def test_patch_chapter_note_archived_project(client: TestClient) -> None:
    headers = {"Authorization": "Bearer token-of-user-a"}
    client.post("/api/projects/project-a-1/archive", headers=headers)

    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1/note",
        json={"content": "<p>归档后不可改</p>", "saveSource": "manual"},
        headers=headers,
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PROJECT_ARCHIVED_READ_ONLY"


def test_chapter_note_forbidden(client: TestClient) -> None:
    response = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1/note",
        headers={"Authorization": "Bearer token-of-user-b"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
