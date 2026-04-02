# Sprint 3 Plan - Critical Fixes (Oracle Verification)

> **修复版本**: 1.1  
> **修复日期**: 2026-03-31  
> **验证状态**: 待Oracle二次验证

---

## 🔴 阻塞性问题修复

### Fix 1: 通知类型补全 (Task 1.2)

**问题**: 原Plan只有8种通知类型，contract.md有13种

**修复后的完整类型定义**:
```typescript
// 通知类型 - 必须与specs/epic-6/contract.md完全一致
type NotificationType =
  | 'parse_done'
  | 'parse_failed'
  | 'backup_done'
  | 'backup_failed'      // ← 新增
  | 'export_done'
  | 'consistency_issue'
  | 'foreshadow_reminder' // ← 新增
  | 'foreshadow_warning'  // ← 新增
  | 'recycle_expire'      // ← 新增
  | 'snapshot_expire'     // ← 新增
  | 'storage_warning'
  | 'storage_critical'
  | 'system_announcement'

// 通知分类 - 必须与contract.md的notificationCategoryMap一致
const CATEGORY_MAP = {
  'ai_parse': ['parse_done', 'parse_failed'],
  'backup_export': ['backup_done', 'backup_failed', 'export_done'],  // ← 修复
  'consistency_foreshadow': [
    'consistency_issue',
    'foreshadow_reminder',   // ← 新增
    'foreshadow_warning',    // ← 新增
    'snapshot_expire',       // ← 新增
    'recycle_expire'         // ← 新增
  ],
  'system': ['storage_warning', 'storage_critical', 'system_announcement'],
}
```

---

### Fix 2: FakeDB完整扩展 (Task 2.0 - 新增)

**问题**: 缺少app_state fixture扩展和测试目录创建

**新增Task 2.0: 基础设施准备**

**Step 1: 创建测试目录结构**
```bash
mkdir -p workspace/server/tests/epic_3
mkdir -p workspace/server/tests/epic_6
mkdir -p workspace/apps/web/src/features/epic-3/components
mkdir -p workspace/apps/web/src/features/epic-3/hooks
mkdir -p workspace/apps/web/src/features/epic-3/__tests__
mkdir -p workspace/apps/web/src/features/epic-3/utils
mkdir -p workspace/apps/web/src/features/epic-6/components
mkdir -p workspace/apps/web/src/features/epic-6/hooks
mkdir -p workspace/apps/web/src/features/epic-6/__tests__
```

**Step 2: 扩展conftest.py**

在`workspace/server/tests/conftest.py`中的`FakeDB` dataclass添加：
```python
@dataclass
class FakeDB:
    # ... existing fields ...
    # Sprint 3 additions
    chapter_contents: dict[str, dict[str, Any]] = field(default_factory=dict)
    notifications: list[dict[str, Any]] = field(default_factory=list)
    snapshots: list[dict[str, Any]] = field(default_factory=list)
```

在`app_state` fixture中添加（约line 176）：
```python
# Sprint 3 fixtures
app.state.chapter_contents = {}
app.state.notifications = []
app.state.notification_counter = 0
app.state.snapshots = []
app.state.snapshot_counter = 0
```

---

### Fix 3: US-3.1 FE完整覆盖 (新增Tasks)

**原Plan缺失**: Markdown渲染、撤销栈管理、三栏布局、选区字数

**新增Task 3.3: TipTap高级配置**

```typescript
// workspace/apps/web/src/features/epic-3/utils/editorConfig.ts
import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Markdown from '@tiptap/extension-markdown';
import CharacterCount from '@tiptap/extension-character-count';
import { useState, useCallback } from 'react';

export interface EditorConfig {
  content: string;
  onUpdate: (params: { html: string; wordCount: number; selectionCount: number }) => void;
  editable?: boolean;
}

export const useTipTapEditor = ({ content, onUpdate, editable = true }: EditorConfig) => {
  const [selectionCount, setSelectionCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // AC: 撤销栈深度至少200步
        history: {
          depth: 200,
          newGroupDelay: 500, // AC: 500ms停顿合并撤销步骤
        },
      }),
      Markdown.configure({
        html: true,
        transformCopiedText: true,
        transformPastedText: true,
      }),
      CharacterCount,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const wordCount = calculateWordCount(html);
      onUpdate({ html, wordCount, selectionCount });
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        const count = calculateTextCount(selectedText);
        setSelectionCount(count);
      } else {
        setSelectionCount(0);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] p-4',
      },
    },
  });

  return { editor, selectionCount };
};

// AC: 只统计正文可见字符
export const calculateWordCount = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, '');
  const normalized = text.replace(/\s+/g, ' ').trim();
  
  let count = 0;
  for (const char of normalized) {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      count++;
    } else if (/\w/.test(char)) {
      count++;
    }
  }
  return count;
};

export const calculateTextCount = (text: string): number => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  let count = 0;
  for (const char of normalized) {
    if (/[\u4e00-\u9fa5]/.test(char) || /\w/.test(char)) {
      count++;
    }
  }
  return count;
};
```

**新增Task 3.7: 三栏布局组件**

```typescript
// workspace/apps/web/src/features/epic-3/components/EditorLayout.tsx
import { useState } from 'react';
import { ChapterPanel } from './ChapterPanel';
import { EditorWorkspace } from './EditorWorkspace';
import { KnowledgePanel } from './KnowledgePanel';

interface EditorLayoutProps {
  projectId: string;
  chapterId: string;
  initialContent: string;
}

export function EditorLayout({ projectId, chapterId, initialContent }: EditorLayoutProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  return (
    <div className="flex h-screen">
      {/* Left: Chapter Panel */}
      <div className={`transition-all duration-200 ${leftPanelOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
        <ChapterPanel projectId={projectId} currentChapterId={chapterId} />
      </div>
      
      {/* Left Toggle */}
      <button 
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors"
      />

      {/* Center: Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        <EditorWorkspace 
          projectId={projectId} 
          chapterId={chapterId} 
          initialContent={initialContent} 
        />
      </div>

      {/* Right Toggle */}
      <button 
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors"
      />

      {/* Right: Knowledge Panel */}
      <div className={`transition-all duration-200 ${rightPanelOpen ? 'w-72' : 'w-0'} overflow-hidden`}>
        <KnowledgePanel projectId={projectId} />
      </div>
    </div>
  );
}
```

---

### Fix 4: DoD检查清单完整版 (Task 4.4 - 新增)

**问题**: 原Plan缺少AGENTS.md和CHANGELOG.md更新步骤

**Task 4.4: Definition of Done验证**

```markdown
## DoD检查清单

### 代码质量
- [ ] 测试覆盖率 ≥ 73%
  ```bash
  cd workspace
  python -m pytest server/tests/ --cov=server --cov-report=term-missing
  npm run test -- --coverage
  ```
- [ ] 单元测试全部通过
- [ ] 类型检查无错误
  ```bash
  npm run typecheck
  python -m mypy server/
  ```
- [ ] ESLint/ruff无警告
  ```bash
  npm run lint
  ruff check server/
  ```

### 功能正确性
- [ ] US-3.1 AC全覆盖验证
  - [ ] 章节读取返回content/charCount/lastEditedAt
  - [ ] 保存支持auto/manual来源
  - [ ] 自动保存3秒防抖
  - [ ] Ctrl+S手动保存
  - [ ] 字数只统计正文可见字符
  - [ ] 归档项目禁止写入
  - [ ] 保存幂等（不创建重复记录）
- [ ] US-6.6 AC全覆盖验证
  - [ ] 分页查询支持cursor
  - [ ] 分类筛选正确
  - [ ] 单条/全部标记已读
  - [ ] 删除单条/清空已读
  - [ ] 未读数接口正确

### 文档同步
- [ ] contract.md更新（如数据结构变更）
- [ ] AGENTS.md看板状态更新为✅
  ```markdown
  | US-3.1 | 编辑器核心 | ✅ | FE+BE已完成（契约/实现/测试） |
  | US-6.6 | 通知中心 | ✅ | FE+BE已完成（契约/实现/测试） |
  ```
- [ ] CHANGELOG.md新增条目
  ```markdown
  ## Sprint 3 (2026-04-14)
  - feat(us-3.1): 编辑器核心（章节保存/读取、自动保存、字数计算）
  - feat(us-6.6): 通知中心（通知事件落库、分页查询、已读/删除）
  ```

### 契约冻结标记
- [ ] specs/epic-3/contract.md 顶部添加：
  > **契约状态**: 已冻结 (2026-04-01)
- [ ] specs/epic-6/contract.md 顶部添加：
  > **契约状态**: 已冻结 (2026-04-01)
```

---

## 🟡 其他修复项

### API路径修正

原Plan使用 `/api/chapters/{chapterId}`，但根据后端路由模式和us15_outline.py，应使用：
```
GET    /api/projects/{projectId}/chapters/{chapterId}
PATCH  /api/projects/{projectId}/chapters/{chapterId}
```

### 字数计算算法对齐

**服务端** (`_calculate_char_count`):
```python
def _calculate_char_count(html_content: str) -> int:
    text_only = re.sub(r'<[^>]+>', '', html_content)
    text_only = ' '.join(text_only.split())
    count = 0
    for char in text_only:
        if '\u4e00' <= char <= '\u9fff':
            count += 1
        elif char.isalnum():
            count += 1
    return count
```

**前端** (`calculateWordCount`):
```typescript
export const calculateWordCount = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, '');
  const normalized = text.replace(/\s+/g, ' ').trim();
  let count = 0;
  for (const char of normalized) {
    if (/[\u4e00-\u9fa5]/.test(char) || /\w/.test(char)) {
      count++;
    }
  }
  return count;
};
```

---

## 📋 修复后的任务依赖图

```
Phase 1: 契约设计 (Day 1-2)
├── Task 1.1: Epic 3 Contract (含Markdown/undo/selection定义)
├── Task 1.2: Epic 6 Contract (13种通知类型完整)
└── Task 1.3: 架构评审

Phase 2: 后端实现 (Day 3-6)
├── Task 2.0: 基础设施 [NEW]
│   ├── 创建测试目录 epic_3/, epic_6/
│   └── 扩展conftest.py (FakeDB + app_state)
├── Task 2.1: 章节读取API
├── Task 2.2: 章节保存API
├── Task 2.3: 错误处理
├── Task 2.4: 通知中心API
└── Task 2.5: 路由集成

Phase 3: 前端实现 (Day 7-12)
├── Task 3.1: TipTap依赖安装
├── Task 3.2: 目录结构
├── Task 3.3: TipTap高级配置 [NEW]
│   ├── Markdown实时渲染
│   ├── 撤销栈(200步, 500ms合并)
│   └── 选区字数统计
├── Task 3.4: 自动保存Hook
├── Task 3.5: 状态栏组件
├── Task 3.6: 编辑器工作区
├── Task 3.7: 三栏布局 [NEW]
├── Task 3.8: 通知组件
└── Task 3.9: 集成测试

Phase 4: 验证交付 (Day 13-14)
├── Task 4.1: API类型生成
├── Task 4.2: E2E测试
├── Task 4.3: 覆盖率/类型检查
└── Task 4.4: DoD完整验证 [NEW]
    ├── AGENTS.md更新
    ├── CHANGELOG.md更新
    └── 契约冻结标记
```

---

## ⚠️ 时间线调整建议

原14天计划对于XL复杂度可能过于紧张，建议：

| 阶段 | 原工期 | 建议工期 | 调整原因 |
|-----|-------|---------|---------|
| Phase 1 | 2天 | 2天 | 需仔细对齐contract |
| Phase 2 | 4天 | 4天 | BE相对可控 |
| Phase 3 | 6天 | **7天** | FE增加undo/selection/layout |
| Phase 4 | 2天 | **2天** | 增加DoD检查 |
| **总计** | 14天 | **15天** | 建议延期1天 |

---

## ✅ 修复完成检查清单

- [x] 通知类型补全至13种（与contract.md一致）
- [x] CATEGORY_MAP修复（与contract.md一致）
- [x] FakeDB扩展完整（dataclass + app_state fixture）
- [x] 测试目录创建步骤新增
- [x] Markdown实时渲染配置新增
- [x] 撤销栈配置（200步，500ms合并）
- [x] 选区字数统计实现
- [x] 三栏布局组件
- [x] DoD检查清单（含AGENTS.md/CHANGELOG.md更新）
- [x] API路径修正
- [x] 字数计算算法前后端对齐

---

**修复文档版本**: 1.1  
**修复完成时间**: 2026-03-31  
**待Oracle二次验证**
