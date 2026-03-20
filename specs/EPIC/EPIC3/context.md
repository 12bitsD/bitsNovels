# Epic 3 共享上下文以卷与章节为核心领域模型

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

## 共享对象

```typescript
type ISODateTime = string

// 卷
interface Volume {
  id: string
  projectId: string
  name: string
  description?: string
  order: number        // 排序
  chapterCount: number // 只读，计算得来
  totalChars: number   // 只读，计算得来
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// 章节
interface Chapter {
  id: string
  projectId: string
  volumeId: string
  title: string
  content: string       // 富文本内容（JSON 字符串或纯文本序列化结果）
  charCount: number     // 只统计正文可见字符
  parseStatus: 'none' | 'pending' | 'parsing' | 'parsed' | 'failed'
  lastParseAt?: ISODateTime
  lastEditedAt: ISODateTime
  order: number
  hasNote: boolean
  note?: string         // 可选的备注预览或内联缓存，完整内容以 ChapterNote 为准
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// 快照
interface Snapshot {
  id: string
  chapterId: string
  content: string
  charCount: number
  type: 'manual' | 'auto' | 'daily' | 'restore_backup'
  label?: string        // 手动快照的标签
  createdAt: ISODateTime
}

// 批注
interface Annotation {
  id: string
  chapterId: string
  anchorStart: number   // 内容中的起始位置
  anchorEnd: number
  content: string
  resolved: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// 章节备注
interface ChapterNote {
  id: string
  chapterId: string
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
  id: string
  chapterId: string
  type: EditorCommandType
  operations: EditorFormatOperation[]
  merged: boolean       // 连续输入是否被合并
  source: 'keyboard' | 'toolbar' | 'context_menu' | 'system'
  createdAt: ISODateTime
}
```

## 对象关系
- `Volume 1 - n Chapter`：卷是章节容器；`chapterCount` 与 `totalChars` 都由章节集合聚合得出。
- `Chapter 1 - n Snapshot`：一个章节可以有多个快照；恢复章节时也会反向创建 `restore_backup` 快照。
- `Chapter 1 - n Annotation`：批注锚定在章节正文位置上，不参与正文导出和字数统计，除非导出时显式开启。
- `Chapter 1 - 0..1 ChapterNote`：章节备注与正文分开存储；`Chapter.hasNote` 仅用于快速展示状态。
- `Chapter 1 - n UndoRedoCommand`：撤销/重做命令是编辑器运行时概念，切换章节或刷新页面后重置。

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

### Snapshot
结论：快照保存章节正文的历史切面，用于恢复和对比，不等价于普通自动保存草稿。

- `type='manual'` 用于手动创建或手动保存时生成的可追踪版本。
- `type='auto'` 用于系统自动快照；受每章节 50 条上限约束。
- `type='daily'` 用于“每日首次编辑”触发的快照。
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

## 字数计算逻辑
结论：全应用都按同一规则计算字数，否则编辑器状态栏、统计报表和卷聚合会互相打架。

- 先把 `Chapter.content` 解析为正文纯文本，再移除富文本结构标记、标题层级标记、分隔线节点等非正文元数据。
- 只统计正文中的可见字符；标点计入，纯空白字符不计入。
- `ChapterNote.content`、`Annotation.content`、快照标签都不计入 `Chapter.charCount`。
- `Volume.totalChars` 由所属章节 `charCount` 聚合得到，不单独手填。
- 前端状态栏可实时估算，写入库和统计聚合一律以服务端重算结果为准。

## 编辑器操作与撤销/重做规则
结论：编辑器命令模型要能同时支撑格式变更、全文替换和快照恢复。

- 进入撤销栈的操作至少包括：输入、删除、剪切、粘贴、格式变更、段落操作、查找替换、恢复快照。
- 连续输入默认合并为一个 `UndoRedoCommand`；停顿超过 500ms 或出现换行时新建命令。
- `replace_all` 必须写成单条命令，确保一次 `Ctrl+Z` / `Cmd+Z` 就能撤回整次替换。
- 自动保存不创建撤销命令，也不清空撤销栈；切换章节或刷新页面后，运行时命令栈整体失效。

## 覆盖检查
- 已包含：`Volume`、`Chapter`、`Snapshot`、`Annotation`、`ChapterNote`
- 已包含：内容字段定义、字数计算逻辑、格式操作类型、撤销/重做命令模型
- 已满足：作为 Epic 1、2、4、5 的共享上下文基线

## 下一步
| 行动 | 负责人 | 截止时间 |
|------|--------|---------|
| 以 `context.md` 为基线对齐共享类型与数据库字段 | FE + BE owner | Epic 3 技术方案评审前 |
| 在后续 Epic 文档中直接复用本文件定义 | Product + Engineering owner | 后续 Epic 细化前 |
