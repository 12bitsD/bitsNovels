# Sprint 3 Implementation Plan

> **日期**: 2026-03-31  
> **Sprint**: Week 5-6  
> **目标**: US-3.1 (编辑器核心) + US-6.6 (通知中心)  
> **预计工期**: 2周

---

## Overview

Sprint 3是项目的核心基础设施Sprint，包含两个高优先级US：

1. **US-3.1 编辑器核心** (XL复杂度) - 后续12个US的前置依赖
2. **US-6.6 通知中心** (M复杂度) - 跨Epic通知基础设施

### 技术约束

- **必须TDD**: 先写测试，再写实现
- **覆盖率门槛**: ≥ 73%
- **契约冻结**: BE必须先冻结contract.md，FE才能开始实现
- **字数计算**: 服务端统一计算，只统计正文可见字符
- **自动保存**: 3秒防抖，幂等更新

---

## Phase 1: 契约与架构设计 (Day 1-2)

### Task 1.1: 更新 Epic 3 Contract.md

**目标**: 明确US-3.1涉及的数据结构和API契约

**需要定义的契约**:
```typescript
// Chapter内容相关
interface ChapterContent {
  id: string
  projectId: string
  volumeId: string
  title: string
  content: string          // 富文本JSON
  charCount: number        // 服务端计算
  parseStatus: 'none' | 'pending' | 'parsing' | 'parsed' | 'failed'
  lastEditedAt: string
  updatedAt: string
  createdAt: string
}

// 保存请求/响应
interface SaveChapterRequest {
  content: string
  saveSource: 'auto' | 'manual'
}

interface SaveChapterResponse {
  chapterId: string
  charCount: number
  lastEditedAt: string
  updatedAt: string
}

// 字数统计响应
interface ChapterStats {
  charCount: number        // 总字数
  selectionCount?: number  // 选区字数
}
```

**API端点设计**:
- `GET /api/chapters/{chapterId}` - 获取章节内容及元数据
- `PATCH /api/chapters/{chapterId}` - 保存章节内容（自动/手动）
- `GET /api/chapters/{chapterId}/stats` - 获取字数统计

**验收标准**:
- [ ] contract.md更新完成
- [ ] 数据结构定义清晰
- [ ] API端点设计符合RESTful规范
- [ ] 与Epic 6的通知契约对齐

---

### Task 1.2: 更新 Epic 6 Contract.md (通知部分)

**目标**: 定义US-6.6通知中心的数据结构

**需要定义的契约**:
```typescript
// 通知类型
 type NotificationType =
  | 'parse_done'
  | 'parse_failed'
  | 'backup_done'
  | 'export_done'
  | 'consistency_issue'
  | 'storage_warning'
  | 'storage_critical'
  | 'system_announcement'

// 通知分类
 type NotificationCenterCategory =
  | 'all'
  | 'ai_parse'
  | 'backup_export'
  | 'consistency_foreshadow'
  | 'system'

// 通知对象
interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  projectId?: string
  read: boolean
  actionTarget?: {
    kind: 'project_settings' | 'consistency_panel' | 'download' | 'storage_settings'
    url?: string
    projectId?: string
    entityId?: string
  }
  createdAt: string
}

// 分页响应
interface NotificationsResponse {
  items: Notification[]
  total: number
  cursor?: string
  hasMore: boolean
}
```

**API端点设计**:
- `GET /api/me/notifications` - 分页查询通知
- `POST /api/me/notifications/{id}/read` - 单条标记已读
- `POST /api/me/notifications/read-all` - 全部标记已读
- `DELETE /api/me/notifications/{id}` - 删除单条通知
- `DELETE /api/me/notifications?scope=read` - 清空已读通知
- `GET /api/me/notifications/unread-count` - 获取未读数

**验收标准**:
- [ ] 通知类型枚举完整
- [ ] 分类映射关系清晰
- [ ] 分页使用cursor模式
- [ ] 与US-6.4通知配置共用类型

---

### Task 1.3: 架构评审与依赖梳理

**目标**: 确认技术方案，识别风险

**需要确认的事项**:
1. 编辑器技术选型确认 (TipTap + @tiptap/extension-markdown)
2. 自动保存实现策略 (前端防抖3秒 → API调用)
3. 字数计算算法 (服务端纯文本提取 + 可见字符统计)
4. 通知存储策略 (FakeDb新增notifications数组)

**风险评估**:
| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|-----|---------|
| TipTap集成复杂度 | 中 | 高 | 先搭建基础编辑器，再逐步加功能 |
| 字数计算口径不一致 | 低 | 高 | 统一服务端算法，前端仅做估算 |
| 自动保存与撤销栈冲突 | 中 | 中 | 自动保存不进撤销栈，服务端不返回状态重建数据 |

**验收标准**:
- [ ] 技术方案确认
- [ ] 风险缓解措施到位
- [ ] 契约文档标记"已冻结"

---

## Phase 2: 后端实现 (Day 3-6)

### Task 2.1: 后端基础设施扩展

**Files to modify**:
- `workspace/server/tests/conftest.py` - 扩展FakeDB支持chapters.content和notifications

**Implementation**:
```python
# 在FakeDB dataclass中添加
@dataclass
class FakeDB:
    # ... existing fields ...
    chapter_contents: dict[str, dict[str, Any]] = field(default_factory=dict)  # chapter_id -> content
    notifications: list[dict[str, Any]] = field(default_factory=list)
    notification_counter: int = 0

# 在app_state fixture中添加
app.state.chapter_contents = {}
app.state.notifications = []
app.state.notification_counter = 0
```

**测试验证**:
```bash
cd workspace
python -m pytest server/tests/conftest.py -v
```

---

### Task 2.2: US-3.1 BE - 章节内容读取API

**Files**:
- Create: `workspace/server/routes/us31_editor.py`
- Test: `workspace/server/tests/epic_3/test_us31_editor_red.py`

**Step 1: 编写红灯测试**
```python
def test_get_chapter_content_success(client, auth_headers):
    """AC: 提供章节读取接口，返回正文内容、元数据、字数"""
    response = client.get("/api/chapters/chapter-a-1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "chapter" in data
    assert data["chapter"]["id"] == "chapter-a-1"
    assert "content" in data["chapter"]
    assert "charCount" in data["chapter"]
    assert "lastEditedAt" in data["chapter"]
```

**Step 2: 运行测试确认失败**
```bash
python -m pytest server/tests/epic_3/test_us31_editor_red.py::test_get_chapter_content_success -v
# Expected: FAIL - 404 or endpoint not found
```

**Step 3: 最小实现**
```python
from fastapi import APIRouter, Header
from typing import Optional
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/chapters", tags=["us-3.1"])

@router.get("/{chapter_id}")
def get_chapter(
    chapter_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app
    
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    
    # Find chapter
    chapter = next(
        (c for c in app.state.fake_db.chapters if c["id"] == chapter_id),
        None
    )
    if chapter is None:
        return _error(404, "CHAPTER_NOT_FOUND", "Chapter not found")
    
    # Check ownership via project
    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == chapter["projectId"]),
        None
    )
    if project is None or project["ownerId"] != user_id:
        return _error(403, "FORBIDDEN", "No permission for this chapter")
    
    # Get content from chapter_contents store
    content_data = app.state.chapter_contents.get(chapter_id, {"content": "", "charCount": 0})
    
    return JSONResponse(status_code=200, content={
        "chapter": {
            "id": chapter["id"],
            "projectId": chapter["projectId"],
            "volumeId": chapter["volumeId"],
            "title": chapter["title"],
            "content": content_data["content"],
            "charCount": content_data["charCount"],
            "parseStatus": chapter.get("parserStatus", "none"),
            "lastEditedAt": chapter.get("lastEditedAt"),
            "updatedAt": chapter.get("updatedAt"),
            "createdAt": chapter.get("createdAt"),
        }
    })
```

**Step 4: 运行测试确认通过**
```bash
python -m pytest server/tests/epic_3/test_us31_editor_red.py::test_get_chapter_content_success -v
# Expected: PASS
```

**Step 5: 提交**
```bash
git add workspace/server/routes/us31_editor.py workspace/server/tests/epic_3/test_us31_editor_red.py
git commit -m "feat(us-3.1): add chapter content get endpoint with tests"
```

---

### Task 2.3: US-3.1 BE - 章节保存API

**Files**:
- Modify: `workspace/server/routes/us31_editor.py`
- Test: `workspace/server/tests/epic_3/test_us31_editor_red.py`

**Step 1: 编写红灯测试**
```python
def test_save_chapter_manual_success(client, auth_headers, app_state):
    """AC: 保存接口支持manual来源，返回服务端写入时间"""
    response = client.patch(
        "/api/chapters/chapter-a-1",
        headers=auth_headers,
        json={"content": "新的章节内容", "saveSource": "manual"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["chapter"]["content"] == "新的章节内容"
    assert "updatedAt" in data["chapter"]
    assert "charCount" in data["chapter"]

def test_save_chapter_auto_success(client, auth_headers):
    """AC: 保存接口支持auto来源"""
    response = client.patch(
        "/api/chapters/chapter-a-1",
        headers=auth_headers,
        json={"content": "自动保存内容", "saveSource": "auto"}
    )
    assert response.status_code == 200

def test_save_chapter_idempotent(client, auth_headers):
    """AC: 保存必须是幂等更新"""
    content = "测试幂等内容"
    # First save
    r1 = client.patch(
        "/api/chapters/chapter-a-1",
        headers=auth_headers,
        json={"content": content, "saveSource": "manual"}
    )
    # Second save with same content
    r2 = client.patch(
        "/api/chapters/chapter-a-1",
        headers=auth_headers,
        json={"content": content, "saveSource": "manual"}
    )
    assert r1.status_code == r2.status_code == 200
    # No duplicate records created
```

**Step 2: 运行测试确认失败**
```bash
python -m pytest server/tests/epic_3/test_us31_editor_red.py::test_save_chapter_manual_success -v
# Expected: FAIL
```

**Step 3: 实现保存API**
```python
from pydantic import BaseModel
from typing import Literal

class SaveChapterRequest(BaseModel):
    content: str
    saveSource: Literal["auto", "manual"] = "manual"

@router.patch("/{chapter_id}")
def save_chapter(
    chapter_id: str,
    payload: SaveChapterRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app
    
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    
    # Find and validate chapter
    chapter = next(
        (c for c in app.state.fake_db.chapters if c["id"] == chapter_id),
        None
    )
    if chapter is None:
        return _error(404, "CHAPTER_NOT_FOUND", "Chapter not found")
    
    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == chapter["projectId"]),
        None
    )
    if project is None or project["ownerId"] != user_id:
        return _error(403, "FORBIDDEN", "No permission for this chapter")
    
    # Check if project is archived
    from server.main import app as main_app
    if chapter["projectId"] in main_app.state.archived_project_ids:
        return _error(409, "PROJECT_ARCHIVED_READ_ONLY", "Project is archived")
    
    # Calculate char count (visible characters only)
    # For now: strip HTML tags and count remaining characters
    import re
    content = payload.content
    # Remove HTML tags
    text_only = re.sub(r'<[^>]+>', '', content)
    # Remove extra whitespace but keep single spaces
    text_only = ' '.join(text_only.split())
    char_count = len(text_only)
    
    now_iso = _iso_z(app.state.session_clock.now)
    
    # Save content
    app.state.chapter_contents[chapter_id] = {
        "content": content,
        "charCount": char_count,
    }
    
    # Update chapter metadata
    chapter["lastEditedAt"] = now_iso
    chapter["updatedAt"] = now_iso
    chapter["chars"] = char_count  # Sync with outline view
    
    return JSONResponse(status_code=200, content={
        "chapter": {
            "id": chapter["id"],
            "projectId": chapter["projectId"],
            "volumeId": chapter["volumeId"],
            "title": chapter["title"],
            "content": content,
            "charCount": char_count,
            "parseStatus": chapter.get("parserStatus", "none"),
            "lastEditedAt": chapter["lastEditedAt"],
            "updatedAt": chapter["updatedAt"],
        }
    })
```

**Step 4: 运行测试确认通过**
```bash
python -m pytest server/tests/epic_3/test_us31_editor_red.py -v
# Expected: ALL PASS
```

---

### Task 2.4: US-3.1 BE - 错误处理与边界情况

**添加的测试用例**:
```python
def test_get_chapter_not_found(client, auth_headers):
    """AC: 章节不存在返回404"""
    response = client.get("/api/chapters/non-existent", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CHAPTER_NOT_FOUND"

def test_get_chapter_forbidden(client, auth_headers_user_b):
    """AC: 无权访问返回403"""
    # chapter-a-1 belongs to user-a, try accessing with user-b token
    response = client.get("/api/chapters/chapter-a-1", headers=auth_headers_user_b)
    assert response.status_code == 403

def test_save_chapter_archived_project(client, auth_headers, app_state):
    """AC: 归档项目禁止写入"""
    # Archive project first
    app_state.archived_project_ids.add("project-a-1")
    response = client.patch(
        "/api/chapters/chapter-a-1",
        headers=auth_headers,
        json={"content": "test", "saveSource": "manual"}
    )
    assert response.status_code == 409
    assert "ARCHIVED" in response.json()["error"]["code"]
```

---

### Task 2.5: US-6.6 BE - 通知中心API

**Files**:
- Create: `workspace/server/routes/us66_notifications.py`
- Test: `workspace/server/tests/epic_6/test_us66_notifications_red.py`

**Step 1: 编写红灯测试**
```python
def test_list_notifications_success(client, auth_headers, app_state):
    """AC: 支持分页查询通知"""
    # Create some notifications
    app_state.notifications = [
        {
            "id": "notif-1",
            "userId": "user-a",
            "type": "parse_done",
            "title": "解析完成",
            "body": "第一章解析完成",
            "read": False,
            "createdAt": "2026-03-31T10:00:00Z",
        },
        {
            "id": "notif-2",
            "userId": "user-a",
            "type": "export_done",
            "title": "导出完成",
            "body": "项目导出完成",
            "read": True,
            "createdAt": "2026-03-31T09:00:00Z",
        },
    ]
    
    response = client.get("/api/me/notifications", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 2

def test_mark_notification_read(client, auth_headers, app_state):
    """AC: 单条标记已读"""
    app_state.notifications = [{"id": "notif-1", "userId": "user-a", "read": False}]
    
    response = client.post("/api/me/notifications/notif-1/read", headers=auth_headers)
    assert response.status_code == 200
    assert app_state.notifications[0]["read"] == True
```

**Step 2: 实现通知API**
```python
from fastapi import APIRouter, Header, Query
from typing import Optional, Literal
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/me", tags=["us-6.6"])

NotificationType = Literal[
    'parse_done', 'parse_failed', 'backup_done', 'export_done',
    'consistency_issue', 'storage_warning', 'storage_critical', 'system_announcement'
]

NotificationCategory = Literal['all', 'ai_parse', 'backup_export', 'consistency_foreshadow', 'system']

# Category mapping
CATEGORY_MAP = {
    'ai_parse': ['parse_done', 'parse_failed'],
    'backup_export': ['backup_done', 'export_done'],
    'consistency_foreshadow': ['consistency_issue'],
    'system': ['storage_warning', 'storage_critical', 'system_announcement'],
}

@router.get("/notifications")
def list_notifications(
    category: NotificationCategory = Query(default="all"),
    read: Optional[bool] = Query(default=None),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app
    
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    
    # Filter by user
    notifications = [n for n in app.state.notifications if n["userId"] == user_id]
    
    # Filter by category
    if category != "all":
        allowed_types = CATEGORY_MAP.get(category, [])
        notifications = [n for n in notifications if n["type"] in allowed_types]
    
    # Filter by read status
    if read is not None:
        notifications = [n for n in notifications if n["read"] == read]
    
    # Sort by createdAt desc
    notifications = sorted(notifications, key=lambda n: n["createdAt"], reverse=True)
    
    # Pagination (simple offset for FakeDb)
    total = len(notifications)
    start = int(cursor) if cursor else 0
    items = notifications[start:start + limit]
    has_more = (start + limit) < total
    
    return JSONResponse(status_code=200, content={
        "items": items,
        "total": total,
        "cursor": str(start + len(items)) if has_more else None,
        "hasMore": has_more,
    })

@router.post("/notifications/{notification_id}/read")
def mark_read(
    notification_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app
    
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    
    notification = next(
        (n for n in app.state.notifications if n["id"] == notification_id and n["userId"] == user_id),
        None
    )
    if notification is None:
        return _error(404, "NOTIFICATION_NOT_FOUND", "Notification not found")
    
    notification["read"] = True
    return JSONResponse(status_code=200, content={"ok": True})

@router.post("/notifications/read-all")
def mark_all_read(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app
    
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    
    for n in app.state.notifications:
        if n["userId"] == user_id and not n["read"]:
            n["read"] = True
    
    return JSONResponse(status_code=200, content={"ok": True})

@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app
    
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    
    notification = next(
        (n for n in app.state.notifications if n["id"] == notification_id and n["userId"] == user_id),
        None
    )
    if notification is None:
        return _error(404, "NOTIFICATION_NOT_FOUND", "Notification not found")
    
    app.state.notifications = [n for n in app.state.notifications if n["id"] != notification_id]
    return JSONResponse(status_code=200, content={"ok": True})

@router.delete("/notifications")
def clear_read_notifications(
    scope: Literal["read"] = Query(),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app
    
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    
    if scope == "read":
        app.state.notifications = [
            n for n in app.state.notifications
            if not (n["userId"] == user_id and n["read"])
        ]
    
    return JSONResponse(status_code=200, content={"ok": True})

@router.get("/notifications/unread-count")
def get_unread_count(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app
    
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    
    count = sum(1 for n in app.state.notifications if n["userId"] == user_id and not n["read"])
    
    return JSONResponse(status_code=200, content={"count": count})
```

---

### Task 2.6: BE集成与路由注册

**Files to modify**:
- `workspace/server/main.py` - 注册新路由

**Implementation**:
```python
# Add imports
from server.routes import us14_settings, us15_outline, us16_goals, us18_archive, us31_editor, us66_notifications

# Add router includes
app.include_router(us14_settings.router)
app.include_router(us15_outline.router)
app.include_router(us16_goals.router)
app.include_router(us18_archive.router)
app.include_router(us31_editor.router)      # NEW
app.include_router(us66_notifications.router)  # NEW
```

**验证**:
```bash
# Run all backend tests
cd workspace
python -m pytest server/tests/ -v --tb=short
# Expected: ALL PASS
```

---

## Phase 3: 前端实现 (Day 7-12)

### Task 3.1: 前端目录结构搭建

**创建目录**:
```
workspace/apps/web/src/features/epic-3/
├── components/
│   ├── EditorWorkspace.tsx      # 三栏编辑器布局
│   ├── ChapterPanel.tsx         # 左侧章节面板
│   ├── Editor.tsx               # TipTap编辑器核心
│   ├── EditorToolbar.tsx        # 编辑工具栏
│   ├── StatusBar.tsx            # 底部状态栏
│   ├── SaveStatus.tsx           # 保存状态指示
│   └── FindReplaceBar.tsx       # 查找替换栏
├── hooks/
│   ├── useChapterContent.ts     # 章节内容CRUD
│   ├── useAutoSave.ts           # 自动保存逻辑
│   ├── useWordCount.ts          # 字数统计
│   └── useFindReplace.ts        # 查找替换
├── __tests__/
│   ├── Editor.test.tsx
│   ├── useAutoSave.test.ts
│   └── useWordCount.test.ts
└── utils/
    ├── editorConfig.ts          # TipTap配置
    └── wordCount.ts             # 字数计算

workspace/apps/web/src/features/epic-6/
├── components/
│   ├── NotificationBell.tsx     # 铃铛图标+角标
│   ├── NotificationPanel.tsx    # 通知下拉面板
│   ├── NotificationItem.tsx     # 单条通知
│   └── NotificationBadge.tsx    # 未读角标
├── hooks/
│   └── useNotifications.ts      # 通知数据管理
├── __tests__/
│   └── NotificationBell.test.tsx
└── types/
    └── notification.ts          # 通知类型定义
```

---

### Task 3.2: US-3.1 FE - TipTap编辑器基础集成

**Files**:
- Create: `workspace/apps/web/src/features/epic-3/utils/editorConfig.ts`
- Create: `workspace/apps/web/src/features/epic-3/components/Editor.tsx`

**Step 1: 安装依赖**
```bash
cd workspace/apps/web
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-markdown
```

**Step 2: 编辑器配置**
```typescript
// workspace/apps/web/src/features/epic-3/utils/editorConfig.ts
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Markdown from '@tiptap/extension-markdown';

export const useTipTapEditor = (content: string, onUpdate: (html: string) => void) => {
  return useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: true,
        transformCopiedText: true,
        transformPastedText: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] p-4',
      },
    },
  });
};

// Word count utility
export const calculateWordCount = (html: string): number => {
  // Strip HTML tags
  const text = html.replace(/<[^>]+>/g, '');
  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();
  // Count characters (Chinese characters + words for English)
  let count = 0;
  for (const char of normalized) {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      count++; // Chinese character
    } else if (/\w/.test(char)) {
      count += 0.5; // Approximate for English
    }
  }
  return Math.floor(count);
};
```

**Step 3: 编辑器组件**
```typescript
// workspace/apps/web/src/features/epic-3/components/Editor.tsx
import { useTipTapEditor, calculateWordCount } from '../utils/editorConfig';
import { EditorContent } from '@tiptap/react';

interface EditorProps {
  initialContent: string;
  onChange: (content: string, wordCount: number) => void;
  readOnly?: boolean;
}

export function Editor({ initialContent, onChange, readOnly }: EditorProps) {
  const handleUpdate = (html: string) => {
    const wordCount = calculateWordCount(html);
    onChange(html, wordCount);
  };

  const editor = useTipTapEditor(initialContent, handleUpdate);

  if (!editor) {
    return <div className="p-4 text-gray-500">Loading editor...</div>;
  }

  return (
    <div className="editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}
```

---

### Task 3.3: US-3.1 FE - 自动保存Hook

**Files**:
- Create: `workspace/apps/web/src/features/epic-3/hooks/useAutoSave.ts`
- Test: `workspace/apps/web/src/features/epic-3/__tests__/useAutoSave.test.ts`

**Step 1: 编写测试 (Red)**
```typescript
// workspace/apps/web/src/features/epic-3/__tests__/useAutoSave.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../hooks/useAutoSave';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should call save after 3 seconds of inactivity', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => 
      useAutoSave({ onSave: mockSave, debounceMs: 3000 })
    );

    // Trigger content change
    act(() => {
      result.current.onContentChange('new content');
    });

    expect(mockSave).not.toHaveBeenCalled();

    // Fast forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith('new content');
    });
  });

  it('should reset timer on consecutive changes', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => 
      useAutoSave({ onSave: mockSave, debounceMs: 3000 })
    );

    act(() => {
      result.current.onContentChange('content 1');
    });

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Another change should reset timer
    act(() => {
      result.current.onContentChange('content 2');
    });

    // Advance 2 more seconds (total 4 from first change)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should not have saved yet
    expect(mockSave).not.toHaveBeenCalled();

    // Advance 1 more second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith('content 2');
    });
  });

  it('should show saving status during save', async () => {
    let resolveSave: () => void;
    const mockSave = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveSave = resolve; })
    );
    
    const { result } = renderHook(() => 
      useAutoSave({ onSave: mockSave, debounceMs: 3000 })
    );

    act(() => {
      result.current.onContentChange('content');
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.saveStatus).toBe('saving');

    await act(async () => {
      resolveSave!();
    });

    expect(result.current.saveStatus).toBe('saved');
  });
});
```

**Step 2: 实现Hook (Green)**
```typescript
// workspace/apps/web/src/features/epic-3/hooks/useAutoSave.ts
import { useState, useRef, useCallback, useEffect } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  onSave: (content: string) => Promise<void>;
  debounceMs?: number;
  maxRetries?: number;
}

export function useAutoSave({
  onSave,
  debounceMs = 3000,
  maxRetries = 3,
}: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const contentRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const performSave = useCallback(async (content: string) => {
    setSaveStatus('saving');
    try {
      await onSave(content);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setRetryCount(0);
    } catch (error) {
      setSaveStatus('error');
      setRetryCount((prev) => prev + 1);
    }
  }, [onSave]);

  const onContentChange = useCallback((content: string) => {
    contentRef.current = content;
    setSaveStatus('idle');

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      performSave(content);
    }, debounceMs);
  }, [debounceMs, performSave]);

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    performSave(contentRef.current);
  }, [performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSavedAt,
    retryCount,
    onContentChange,
    saveNow,
  };
}
```

---

### Task 3.4: US-3.1 FE - 编辑器工作区组件

**Files**:
- Create: `workspace/apps/web/src/features/epic-3/components/EditorWorkspace.tsx`
- Create: `workspace/apps/web/src/features/epic-3/components/StatusBar.tsx`

**Step 1: 状态栏组件**
```typescript
// workspace/apps/web/src/features/epic-3/components/StatusBar.tsx
interface StatusBarProps {
  wordCount: number;
  selectionCount?: number;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
}

export function StatusBar({ wordCount, selectionCount, saveStatus, lastSavedAt }: StatusBarProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return '保存中...';
      case 'saved':
        return lastSavedAt ? `已保存 ${formatTime(lastSavedAt)}` : '已保存';
      case 'error':
        return '保存失败 ⚠️';
      default:
        return '';
    }
  };

  return (
    <div className="h-8 bg-gray-100 dark:bg-gray-800 flex items-center justify-between px-4 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-4">
        <span>字数: {wordCount}</span>
        {selectionCount !== undefined && selectionCount > 0 && (
          <span>选中: {selectionCount}</span>
        )}
      </div>
      <div className={saveStatus === 'error' ? 'text-red-500' : ''}>
        {getSaveStatusText()}
      </div>
    </div>
  );
}
```

**Step 2: 工作区组件**
```typescript
// workspace/apps/web/src/features/epic-3/components/EditorWorkspace.tsx
import { useState, useCallback } from 'react';
import { Editor } from './Editor';
import { StatusBar } from './StatusBar';
import { useAutoSave } from '../hooks/useAutoSave';
import { client } from '../../../api/client';

interface EditorWorkspaceProps {
  projectId: string;
  chapterId: string;
  initialContent: string;
}

export function EditorWorkspace({ projectId, chapterId, initialContent }: EditorWorkspaceProps) {
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [selectionCount, setSelectionCount] = useState(0);

  const handleSave = useCallback(async (contentToSave: string) => {
    const response = await client.PATCH(`/api/chapters/${chapterId}`, {
      body: { content: contentToSave, saveSource: 'auto' },
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
  }, [chapterId]);

  const { saveStatus, lastSavedAt, onContentChange, saveNow } = useAutoSave({
    onSave: handleSave,
  });

  const handleEditorChange = useCallback((newContent: string, newWordCount: number) => {
    setContent(newContent);
    setWordCount(newWordCount);
    onContentChange(newContent);
  }, [onContentChange]);

  // Manual save shortcut (Ctrl+S)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveNow();
    }
  }, [saveNow]);

  return (
    <div 
      className="flex flex-col h-full bg-white dark:bg-gray-900"
      onKeyDown={handleKeyDown}
    >
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-8">
          <Editor 
            initialContent={initialContent}
            onChange={handleEditorChange}
          />
        </div>
      </div>
      <StatusBar 
        wordCount={wordCount}
        selectionCount={selectionCount}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
      />
    </div>
  );
}
```

---

### Task 3.5: US-6.6 FE - 通知组件

**Files**:
- Create: `workspace/apps/web/src/features/epic-6/hooks/useNotifications.ts`
- Create: `workspace/apps/web/src/features/epic-6/components/NotificationBell.tsx`

**Step 1: 通知Hook**
```typescript
// workspace/apps/web/src/features/epic-6/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { client } from '../../../api/client';

export type NotificationCategory = 'all' | 'ai_parse' | 'backup_export' | 'consistency_foreshadow' | 'system';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  projectId?: string;
}

interface NotificationsResponse {
  items: Notification[];
  total: number;
  cursor?: string;
  hasMore: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<NotificationCategory>('all');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const response = await client.GET(`/api/me/notifications?category=${category}`);
    if (response.data) {
      setNotifications(response.data.items);
    }
    setLoading(false);
  }, [category]);

  const fetchUnreadCount = useCallback(async () => {
    const response = await client.GET('/api/me/notifications/unread-count');
    if (response.data) {
      setUnreadCount(response.data.count);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const response = await client.POST(`/api/me/notifications/${id}/read`);
    if (!response.error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const response = await client.POST('/api/me/notifications/read-all');
    if (!response.error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const response = await client.DELETE(`/api/me/notifications/${id}`);
    if (!response.error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    category,
    setCategory,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
```

**Step 2: 通知铃铛组件**
```typescript
// workspace/apps/web/src/features/epic-6/components/NotificationBell.tsx
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications, NotificationCategory } from '../hooks/useNotifications';

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  all: '全部',
  ai_parse: 'AI解析',
  backup_export: '备份导出',
  consistency_foreshadow: '一致性',
  system: '系统',
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    category,
    setCategory,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg border z-50 max-h-[500px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">通知中心</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  全部已读
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 p-2 border-b overflow-x-auto">
              {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                    category === cat
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">加载中...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">暂无通知</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {notification.body}
                    </p>
                    <span className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### Task 3.6: 前端集成测试

**运行所有前端测试**:
```bash
cd workspace
npm run test -- --coverage
```

**期望覆盖率**: ≥ 73%

---

## Phase 4: 集成与验证 (Day 13-14)

### Task 4.1: API类型生成与同步

```bash
cd workspace
# Start backend server in one terminal
python -m server.main

# Export OpenAPI schema
npm run generate:api-types
```

**验证**: 检查 `workspace/packages/api-types/src/generated.ts` 包含新API端点

---

### Task 4.2: E2E测试

**Files**:
- Create: `workspace/e2e/tests/editor.spec.ts`
- Create: `workspace/e2e/tests/notifications.spec.ts`

**关键场景**:
1. 打开章节 → 编辑器加载 → 输入内容 → 3秒后自动保存
2. 收到通知 → 铃铛显示角标 → 打开面板 → 标记已读 → 角标消失
3. Ctrl+S手动保存 → 状态栏显示"已保存"

---

### Task 4.3: 最终验证

**Backend Verification**:
```bash
cd workspace
python -m pytest server/tests/ -v --cov=server --cov-report=term-missing
```

**Frontend Verification**:
```bash
cd workspace
npm run typecheck
npm run lint
npm run test -- --coverage
```

**DoD检查**:
- [ ] 测试覆盖率 ≥ 73%
- [ ] 所有测试通过
- [ ] 类型检查无错误
- [ ] ESLint无警告
- [ ] AC全覆盖验证
- [ ] AGENTS.md看板更新
- [ ] CHANGELOG.md更新

---

## 任务依赖图

```
Phase 1: 契约设计
├── Task 1.1: Epic 3 Contract
├── Task 1.2: Epic 6 Contract  
└── Task 1.3: 架构评审

Phase 2: 后端实现 (BE先冻结契约)
├── Task 2.1: FakeDB扩展
├── Task 2.2: 章节读取API
├── Task 2.3: 章节保存API
├── Task 2.4: 错误处理
├── Task 2.5: 通知中心API
└── Task 2.6: 路由集成
    ↓
Phase 3: 前端实现 (依赖BE契约)
├── Task 3.1: 目录结构
├── Task 3.2: TipTap集成
├── Task 3.3: 自动保存Hook
├── Task 3.4: 编辑器工作区
├── Task 3.5: 通知组件
└── Task 3.6: 集成测试
    ↓
Phase 4: 验证交付
├── Task 4.1: API类型生成
├── Task 4.2: E2E测试
└── Task 4.3: 最终验证
```

---

## 并行执行策略

**可并行的任务**:
1. **Phase 1** 中 Task 1.1 和 Task 1.2 可并行
2. **Phase 2** 中 Task 2.2 和 Task 2.3 部分可并行（但保存依赖读取）
3. **Phase 3** 中 Task 3.2 (TipTap) 和 Task 3.5 (通知) 可并行

**必须串行的任务**:
1. Task 2.1 (FakeDB扩展) 必须在所有其他BE任务之前
2. BE契约冻结后，FE才能开始Phase 3
3. Task 4.3 必须在所有其他任务完成后

---

## 风险缓解

| 风险 | 缓解措施 |
|-----|---------|
| TipTap集成复杂度超预期 | 先完成基础编辑器，Markdown扩展作为可选 |
| 字数计算口径不一致 | 服务端统一算法，前端仅估算 |
| 自动保存性能问题 | 防抖3秒，避免频繁API调用 |
| 通知实时性不足 | V1使用轮询，SSE流式作为V2优化 |

---

## 提交计划

| Commit | 内容 |
|-------|------|
| `feat(sprint3): update contract.md for us-3.1 and us-6.6` | Phase 1完成 |
| `feat(us-3.1): add chapter content storage infrastructure` | Task 2.1完成 |
| `feat(us-3.1): implement chapter get/save endpoints with tests` | Tasks 2.2-2.4完成 |
| `feat(us-6.6): implement notification center API with tests` | Task 2.5完成 |
| `feat(us-3.1): integrate TipTap editor with auto-save` | Tasks 3.1-3.4完成 |
| `feat(us-6.6): add notification bell and panel components` | Task 3.5完成 |
| `feat(sprint3): final integration and verification` | Phase 4完成 |

---

**Plan Version**: 1.0  
**Created**: 2026-03-31  
**Ready for Execution**: Yes
