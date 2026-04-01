# Epic 3 共享上下文以卷与章节为核心领域模型

> **STATUS: FROZEN** | 冻结日期: 2026-03-31
> 
> 本契约已冻结，后续修改需经 FE/BE 双方协商并在 AGENTS.md 看板备注变更原因。

## 读者确认
- 核心读者：需要跨 Epic 复用写作域对象的前后端工程师、产品与架构设计者
- 已具备背景：已阅读 Epic 3 原始用户故事，知道卷/章节会被 Epic 1、2、4、5 依赖
- 最关心：共享对象怎么定义、哪些字段是只读派生值、正文和备注/批注/快照如何关联

## 问题定义
一句话问题：Epic 3 需要一份跨 Epic 共用的上下文定义，否则卷、章节、快照、批注和编辑命令会在不同模块中出现字段漂移。

## 核心结论
1. `Volume` 和 `Chapter` 是全应用主对象，`Snapshot`、`Annotation`、`ChapterNote` 都从属于章节。 
2. `charCount` 必须由统一规则计算，只统计正文可见字符，不把格式标记、备注、批注算入。 
3. 编辑器命令应被建模为格式操作和撤销/重做命令，保证 US-3.1、US-3.6、US-3.10 的行为一致。

---

## 共享对象

```typescript
type ISODateTime = string
type UUID = string

type ParserStatus = 'none' | 'pending' | 'parsing' | 'parsed' | 'failed' | 'empty'
type SaveSource = 'auto' | 'manual'

// 卷
interface Volume {
  id: UUID
  projectId: UUID
  name: string
  description?: string
  order: number        // 排序
  chapterCount: number // 只读，计算得来
  totalChars: number   // 只读，计算得来
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// 章节（完整数据模型）
interface Chapter {
  id: UUID
  projectId: UUID
  volumeId: UUID
  title: string
  content: string       // 富文本内容（JSON 字符串或纯文本序列化结果）
  charCount: number     // 只统计正文可见字符
  parserStatus: ParserStatus
  lastParseAt?: ISODateTime
  lastEditedAt: ISODateTime
  order: number
  hasNote: boolean
  note?: string         // 可选的备注预览或内联缓存，完整内容以 ChapterNote 为准
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// US-3.1: 章节内容对象（编辑器核心使用的精简结构）
interface ChapterContent {
  id: UUID
  projectId: UUID
  volumeId: UUID
  title: string
  content: string       // 富文本 JSON 字符串
  charCount: number     // 服务端统一计算，只包含可见字符
  parserStatus: ParserStatus
  lastEditedAt: ISODateTime  // 正文最后编辑时间
  updatedAt: ISODateTime     // 记录更新时间
  createdAt: ISODateTime
}

// US-3.1: 保存章节请求
interface SaveChapterRequest {
  content: string       // 富文本 JSON 字符串
  title?: string        // 可选，同时更新标题
  saveSource: SaveSource  // 'auto' | 'manual'
}

// US-3.1: 保存章节响应
interface SaveChapterResponse {
  id: UUID
  projectId: UUID
  volumeId: UUID
  title: string
  content: string
  charCount: number
  order: number
  lastEditedAt: ISODateTime
  updatedAt: ISODateTime      // 服务端写入时间，用于展示 "已保存 {HH:mm}"
  createdAt: ISODateTime
  parserStatus: ParserStatus
}

// US-3.1: 章节统计信息（状态栏展示）
// 注：此接口暂未实现，前端需自行计算选区字数
interface ChapterStats {
  chapterId: UUID
  charCount: number         // 总字数
  selectionCount: number    // 当前选区字数（前端计算）
  lastSavedAt?: ISODateTime // 上次保存时间
}

// US-3.1: 获取章节内容响应
interface GetChapterResponse {
  chapter: ChapterContent
  // 注：stats 字段暂未实现，后续可扩展
}

// 快照
interface Snapshot {
  id: UUID
  chapterId: UUID
  content: string
  charCount: number
  type: 'manual' | 'auto' | 'daily' | 'restore_backup'
  label?: string        // 手动快照的标签
  createdAt: ISODateTime
}

// 批注
interface Annotation {
  id: UUID
  chapterId: UUID
  anchorStart: number   // 内容中的起始位置
  anchorEnd: number
  content: string
  resolved: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// 章节备注
interface ChapterNote {
  id: UUID
  chapterId: UUID
  content: string       // 富文本内容（JSON 字符串或纯文本序列化结果）
  charCount: number     // 备注自身字数，用于限制和展示，不计入 Chapter.charCount
  autoSavedAt?: ISODateTime
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// 编辑器格式操作
type EditorFormatOperation =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'divider'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'paragraph'
  | 'soft_break'
  | 'indent'
  | 'paste_richtext_clean'
  | 'paste_plaintext'

// 编辑器命令类型
type EditorCommandType =
  | 'insert_text'
  | 'delete_text'
  | 'cut'
  | 'paste'
  | 'format'
  | 'paragraph'
  | 'replace_one'
  | 'replace_all'
  | 'restore_snapshot'

// 撤销 / 重做命令
interface UndoRedoCommand {
  id: UUID
  chapterId: UUID
  type: EditorCommandType
  operations: EditorFormatOperation[]
  merged: boolean       // 连续输入是否被合并
  source: 'keyboard' | 'toolbar' | 'context_menu' | 'system'
  createdAt: ISODateTime
}
```

---

## API 端点定义 (US-3.1)

### 获取章节内容
```
GET /api/projects/{projectId}/chapters/{chapterId}

Response: GetChapterResponse
```

### 保存章节内容
```
PATCH /api/projects/{projectId}/chapters/{chapterId}

Request: SaveChapterRequest
Response: SaveChapterResponse

Error Codes:
- 400: 请求参数错误（如 content 为空）
- 403: 无权限访问该项目
- 404: 项目或章节不存在
- 409: 项目已归档（只读）
- 422: 不可重试错误（如内容格式非法）
- 429: 请求过于频繁
- 500: 服务端错误（可重试）
```

### 获取章节统计
```
注：此接口暂未实现，前端需自行计算选区字数
GET /api/projects/{projectId}/chapters/{chapterId}/stats

Response: ChapterStats
```

---

## 对象关系
- `Volume 1 - n Chapter`：卷是章节容器；`chapterCount` 与 `totalChars` 都由章节集合聚合得出。
- `Chapter 1 - n Snapshot`：一个章节可以有多个快照；恢复章节时也会反向创建 `restore_backup` 快照。
- `Chapter 1 - n Annotation`：批注锚定在章节正文位置上，不参与正文导出和字数统计，除非导出时显式开启。
- `Chapter 1 - 0..1 ChapterNote`：章节备注与正文分开存储；`Chapter.hasNote` 仅用于快速展示状态。
- `Chapter 1 - n UndoRedoCommand`：撤销/重做命令是编辑器运行时概念，切换章节或刷新页面后重置。

---

## 字段与规则说明

### Volume
结论：卷对象是目录聚合层，自己不存正文，只维护顺序和统计派生值。

- `chapterCount` 是只读字段，等于该卷下章节数量。
- `totalChars` 是只读字段，等于该卷下所有章节 `charCount` 之和。
- `order` 决定卷在目录树中的显示顺序；跨卷移动章节不会改变卷自身标识。

### Chapter
结论：章节对象是写作域的核心实体，正文、顺序、解析状态和统计都围绕它展开。

- `content` 是章节正文的唯一来源；建议统一保存为富文本 JSON 字符串，纯文本场景可视为同一字段的另一种序列化形式。
- `charCount` 是服务端统一计算后的只读派生值，前端可做实时预估，但最终以服务端返回值为准。
- `lastEditedAt` 用于标记最近一次正文变更成功保存时间；`updatedAt` 表示章节整体记录更新时间。
- `hasNote` 用于目录树快速显示备注图标；完整备注正文不直接依赖 `Chapter.note`。

### ChapterContent (US-3.1)
结论：编辑器核心使用的章节内容结构，用于正文读取与保存场景。

- `content` 存储 TipTap/ProseMirror 格式的 JSON 字符串，是富文本的唯一来源。
- `charCount` 由服务端根据字数计算规则统一计算，只统计可见字符。
- `lastEditedAt` 精确到毫秒，用于前端展示"最后编辑于"时间。
- `parserStatus` 表示 AI 解析状态，与 Epic 2 知识库联动。

### SaveChapterRequest / SaveChapterResponse (US-3.1)
结论：章节保存接口的输入输出契约，支持幂等更新。

- `saveSource` 区分自动保存与手动保存，用于后端统计与快照触发逻辑。
- 保存操作必须幂等：相同请求重复提交不应产生重复章节或脏版本。
- `updatedAt` 返回服务端写入时间，前端用它显示 `已保存 {HH:mm}`。
- 保存失败时返回可区分的错误码，指导前端是重试还是提示用户手动备份。

### ChapterStats (US-3.1)
结论：章节统计信息，用于编辑器状态栏实时展示。

- `charCount` 为该章节总字数（服务端计算值）。
- `selectionCount` 为当前选区字数，由前端基于相同字数计算规则实时计算。
- `lastSavedAt` 为上次成功保存时间，与 `SaveChapterResponse.updatedAt` 一致。

### Snapshot
结论：快照保存章节正文的历史切面，用于恢复和对比，不等价于普通自动保存草稿。

- `type='manual'` 用于手动创建或手动保存时生成的可追踪版本。
- `type='auto'` 用于系统自动快照；受每章节 50 条上限约束。
- `type='daily'` 用于"每日首次编辑"触发的快照。
- `type='restore_backup'` 用于恢复前自动备份当前正文，防止误恢复导致内容丢失。

### Annotation
结论：批注必须绑定正文锚点，而不是脱离正文单独存在。

- `anchorStart` 与 `anchorEnd` 以章节正文中的位置索引表示批注作用范围。
- `resolved=true` 表示该批注已处理完成，前端可按此改变高亮样式和筛选结果。
- `content` 是批注正文，默认仅在编辑器和可选导出中使用。

### ChapterNote
结论：章节备注是章节的规划补充，不应和正文统计、快照语义混在一起。

- `content` 支持基础富文本，但默认不参与正文导出与 `Chapter.charCount` 计算。
- `charCount` 仅用于备注编辑器展示和 2000 字上限控制。
- `autoSavedAt` 用于备注自动保存反馈；它独立于章节正文的最近保存时间。

---

## 字数计算逻辑

结论：全应用都按同一规则计算字数，否则编辑器状态栏、统计报表和卷聚合会互相打架。

### 计算步骤
1. 先把 `Chapter.content` 解析为正文纯文本，再移除富文本结构标记、标题层级标记、分隔线节点等非正文元数据。
2. 只统计正文中的可见字符；标点计入，纯空白字符不计入。
3. `ChapterNote.content`、`Annotation.content`、快照标签都不计入 `Chapter.charCount`。
4. `Volume.totalChars` 由所属章节 `charCount` 聚合得到，不单独手填。
5. 前端状态栏可实时估算，写入库和统计聚合一律以服务端重算结果为准。

### 字数统计算法规则
```typescript
function calculateCharCount(content: string): number {
  // 1. 解析 JSON 获取纯文本
  const plainText = extractPlainTextFromJSON(content)
  
  // 2. 移除 HTML 标签（如果存在）
  const textWithoutHtml = plainText.replace(/<[^>]+>/g, '')
  
  // 3. 统计可见字符
  let count = 0
  for (const char of textWithoutHtml) {
    // 中文字符 \u4e00-\u9fff
    if (/[\u4e00-\u9fff]/.test(char)) {
      count++
    }
    // 字母数字
    else if (/[a-zA-Z0-9]/.test(char)) {
      count++
    }
    // 标点符号计入（Unicode 标点范围）
    else if (/[\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F]/.test(char)) {
      count++
    }
    // 空白字符不计入
  }
  
  return count
}
```

### 字符分类
| 字符类型 | 范围/示例 | 是否计入 |
|---------|----------|---------|
| 中文字符 | `\u4e00-\u9fff` | ✅ 计入 |
| 英文字母 | `a-zA-Z` | ✅ 计入 |
| 数字 | `0-9` | ✅ 计入 |
| 中文标点 | `，。！？；：""''（）【】《》` | ✅ 计入 |
| 英文标点 | `,.!?;:'"()` | ✅ 计入 |
| 全角标点 | `\uFF00-\uFFEF` | ✅ 计入 |
| 空白字符 | 空格、制表符、换行 | ❌ 不计入 |
| HTML 标签 | `<p>`, `<strong>` 等 | ❌ 不计入 |
| 格式标记 | `**`, `##` 等 Markdown 标记 | ❌ 不计入 |

---

## 编辑器操作与撤销/重做规则
结论：编辑器命令模型要能同时支撑格式变更、全文替换和快照恢复。

- 进入撤销栈的操作至少包括：输入、删除、剪切、粘贴、格式变更、段落操作、查找替换、恢复快照。
- 连续输入默认合并为一个 `UndoRedoCommand`；停顿超过 500ms 或出现换行时新建命令。
- `replace_all` 必须写成单条命令，确保一次 `Ctrl+Z` / `Cmd+Z` 就能撤回整次替换。
- 自动保存不创建撤销命令，也不清空撤销栈；切换章节或刷新页面后，运行时命令栈整体失效。

---

## 错误处理规范

### 可重试错误 (Retryable)
- 500 Internal Server Error
- 503 Service Unavailable
- 429 Too Many Requests（配合 Retry-After 头）
- 网络超时/断开

### 不可重试错误 (Non-Retryable)
- 400 Bad Request（参数错误）
- 422 Unprocessable Entity（格式非法）
- 404 Not Found（章节不存在）
- 403 Forbidden（无权限）

---

## 覆盖检查
- 已包含：`Volume`、`Chapter`、`ChapterContent`、`Snapshot`、`Annotation`、`ChapterNote`
- 已包含：`SaveChapterRequest`、`SaveChapterResponse`、`ChapterStats`、`GetChapterResponse`
- 已包含：内容字段定义、字数计算逻辑、格式操作类型、撤销/重做命令模型
- 已包含：API 端点定义、错误码规范
- 已满足：作为 Epic 1、2、4、5 的共享上下文基线
- 已满足：US-3.1 编辑器核心全部 13 个字段要求

---

## 变更历史

### 2026-04-01 契约同步更新
**变更原因**：契约文档与实际代码实现不一致，需同步更新

**变更内容**：
1. **API 路径调整**：
   - 原：`/api/v1/chapters/{chapterId}/content`
   - 新：`/api/projects/{projectId}/chapters/{chapterId}`
   - 原因：实际实现使用项目级路由，符合 RESTful 资源层级设计

2. **HTTP 方法调整**：
   - 原：`PUT` 保存章节
   - 新：`PATCH` 保存章节
   - 原因：实际实现使用 PATCH，符合部分更新语义

3. **字段命名统一**：
   - `parseStatus` → `parserStatus`
   - 原因：代码实现使用 `parserStatus`，与后端数据库字段保持一致

4. **响应结构调整**：
   - `GetChapterResponse` 移除 `stats` 字段
   - `SaveChapterResponse` 新增 `projectId`、`volumeId`、`title`、`order`、`createdAt` 字段
   - 原因：实际响应结构与契约定义不符，`stats` 接口暂未实现

5. **ParserStatus 枚举扩展**：
   - 新增 `'empty'` 状态
   - 原因：代码实现中默认状态为 `'empty'`

6. **错误码补充**：
   - 新增 `403 Forbidden`（无权限）
   - 新增 `404 Not Found`（项目或章节不存在）
   - 原因：实际实现包含这些错误场景

---

## 下一步
| 行动 | 负责人 | 截止时间 |
|------|--------|---------|
| 以 `context.md` 为基线对齐共享类型与数据库字段 | FE + BE owner | Epic 3 技术方案评审前 |
| 在后续 Epic 文档中直接复用本文件定义 | Product + Engineering owner | 后续 Epic 细化前 |
