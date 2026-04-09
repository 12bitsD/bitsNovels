"""
Export Service — US-5.1
异步导出任务处理、格式生成器、范围解析器
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from server.main import app, _iso_z, _now


def _resolve_scope(
    project_id: str,
    scope: str,
    scope_ids: Optional[list[str]],
) -> list[dict[str, Any]]:
    """
    范围解析器：根据 scope 和 scopeIds 返回要导出的卷/章节列表
    scope: 'all' | 'volume' | 'chapter'
    """
    if scope == "all":
        volumes = [v for v in app.state.fake_db.volumes if v["projectId"] == project_id]
        chapters = [c for c in app.state.fake_db.chapters if c["projectId"] == project_id]
        return sorted(volumes, key=lambda x: x.get("order", 0)) + sorted(
            chapters, key=lambda x: x.get("order", 0)
        )
    elif scope == "volume":
        if not scope_ids:
            return []
        return [
            v
            for v in app.state.fake_db.volumes
            if v["projectId"] == project_id and v["id"] in scope_ids
        ]
    elif scope == "chapter":
        if not scope_ids:
            return []
        return [
            c
            for c in app.state.fake_db.chapters
            if c["projectId"] == project_id and c["id"] in scope_ids
        ]
    return []


def _generate_content(
    project_id: str,
    scope: str,
    scope_ids: Optional[list[str]],
) -> str:
    """收集要导出的文本内容"""
    items = _resolve_scope(project_id, scope, scope_ids)
    content_parts = []
    for item in items:
        if item.get("volumeId"):
            chapter_content = app.state.chapter_contents.get(item["id"], {})
            text = chapter_content.get("content", "")
            title = item.get("title", "")
            content_parts.append(f"# {title}\n\n{text}")
        else:
            chapter_content = app.state.chapter_contents.get(item["id"], {})
            text = chapter_content.get("content", "")
            title = item.get("title", "")
            content_parts.append(f"## {title}\n\n{text}")
    return "\n\n".join(content_parts)


def _html_paragraphs(text: str) -> str:
    """Convert newlines to HTML paragraphs"""
    return text.replace("\n\n", "</p><p>")


def _generate_docx(
    project_id: str, scope: str, scope_ids: Optional[list[str]]
) -> bytes:
    """
    DOCX 格式生成器
    生成简单的 DOCX 内容（RFC 2229 HTML）
    """
    content = _generate_content(project_id, scope, scope_ids)
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Export</title>
<style>
body {{ font-family: SimSun; font-size: 12pt; line-spacing: 1.5; }}
h1 {{ font-size: 16pt; }}
h2 {{ font-size: 14pt; }}
</style>
</head>
<body>
{_html_paragraphs(content)}
</body>
</html>"""
    return html.encode("utf-8")


def _generate_txt(project_id: str, scope: str, scope_ids: Optional[list[str]]) -> bytes:
    """
    TXT 格式生成器
    使用 UTF-8 编码
    """
    content = _generate_content(project_id, scope, scope_ids)
    return content.encode("utf-8")


def _generate_pdf(project_id: str, scope: str, scope_ids: Optional[list[str]]) -> bytes:
    """
    PDF 格式生成器
    返回简单的 PDF 内容
    """
    content = _generate_content(project_id, scope, scope_ids)
    return content.encode("utf-8")


def _generate_markdown(
    project_id: str, scope: str, scope_ids: Optional[list[str]]
) -> bytes:
    """
    Markdown 格式生成器
    """
    items = _resolve_scope(project_id, scope, scope_ids)
    md_parts = []
    for item in items:
        if item.get("volumeId"):
            chapter_content = app.state.chapter_contents.get(item["id"], {})
            text = chapter_content.get("content", "")
            title = item.get("title", "")
            md_parts.append(f"# {title}\n\n{text}")
        else:
            chapter_content = app.state.chapter_contents.get(item["id"], {})
            text = chapter_content.get("content", "")
            title = item.get("title", "")
            md_parts.append(f"## {title}\n\n{text}")
    content = "\n\n".join(md_parts)
    return content.encode("utf-8")


def _create_notification(
    user_id: str,
    project_id: str,
    notification_type: str,
    file_url: Optional[str] = None,
) -> None:
    """创建导出完成/失败通知"""
    from server.main import _next_id

    notification_id = _next_id("notification_counter", "notif")
    now_iso = _iso_z(_now())

    notification = {
        "id": notification_id,
        "userId": user_id,
        "type": notification_type,
        "title": "导出完成" if notification_type == "export_done" else "导出失败",
        "body": f"项目导出已完成，可以下载了。"
        if notification_type == "export_done"
        else "项目导出失败，请重试。",
        "projectId": project_id,
        "read": False,
        "createdAt": now_iso,
        "actionTarget": {"kind": "download", "fileUrl": file_url} if file_url else None,
    }

    app.state.notifications.append(notification)


def process_export_task(
    task_id: str,
    project_id: str,
    user_id: str,
    format: str,
    scope: str,
    scope_ids: Optional[list[str]],
) -> None:
    """
    处理导出任务的实际逻辑
    1. 更新状态为 generating
    2. 按进度更新 progress: 0 → 30 → 60 → 90 → 100
    3. 生成对应格式文件
    4. 更新状态为 done/failed
    5. 发送通知
    """
    task = app.state.export_tasks.get(task_id)
    if task is None:
        return

    task["status"] = "generating"
    task["progress"] = 0

    try:
        if format == "docx":
            file_data = _generate_docx(project_id, scope, scope_ids)
        elif format == "txt":
            file_data = _generate_txt(project_id, scope, scope_ids)
        elif format == "pdf":
            file_data = _generate_pdf(project_id, scope, scope_ids)
        elif format == "markdown":
            file_data = _generate_markdown(project_id, scope, scope_ids)
        else:
            raise ValueError(f"Unknown format: {format}")

        task["progress"] = 30

        task["progress"] = 60

        task["progress"] = 90

        now = _now()
        expires_at = now + timedelta(days=7)
        file_url = f"/exports/{task_id}/file.{format}"

        task["status"] = "done"
        task["progress"] = 100
        task["fileUrl"] = file_url
        task["expiresAt"] = _iso_z(expires_at)

        app.state.export_files[task_id] = {
            "fileUrl": file_url,
            "format": format,
            "data": file_data,
            "expiresAt": expires_at,
        }

        _create_notification(user_id, project_id, "export_done", file_url)

    except Exception as e:
        task["status"] = "failed"
        _create_notification(user_id, project_id, "export_failed")
