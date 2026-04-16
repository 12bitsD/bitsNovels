# EPIC 4 共享上下文要统一任务类型、项目配置、结果 Schema 与注入优先级

## 读者确认
- 核心读者：前后端开发、产品、后续维护 Parser 的开发者
- 已具备背景：已了解 Epic 2 Parser、Epic 4 AI 写作功能、项目级设置体系
- 最关心：哪些类型和字段是跨模块共享的，哪些上下文规则必须保持一致

## 问题定义
一句话问题：Epic 4 需要一份可复用的共享上下文定义，保证 FE、BE、EPIC2 Parser 对 AI 任务类型、项目配置、结果结构和 Token 裁剪逻辑有同一套约定。

## 核心结论
1. `AITaskType` 必须同时覆盖 Epic 4 写作任务与 EPIC2 的 `parse`，否则项目级 AI 配置无法复用。- 证据：US-4.8 说明 Parser 与续写、润色等任务共用项目级 AI 配置。
2. `AIProjectConfig` 只描述项目级覆盖值，最终生效值仍需通过“项目级 > 用户级 > 系统默认”解析。- 证据：US-4.8 AC#3 明确给出三级覆盖机制。
3. `AIResult` 应改成判别式 payload，而不是横向扩字段，这样前后端才能在能力扩张时保持稳定。- 证据：US-4.1~US-4.7 输出形态不同，但状态机和承载方式仍应统一。

## 共享 TypeScript 定义

```typescript
// AI 任务类型
type AITaskType =
  | 'continue'    // 续写
  | 'polish'      // 润色
  | 'expand'      // 扩写
  | 'summarize'   // 缩写
  | 'dialogue'    // 对话生成
  | 'outline'     // 大纲建议
  | 'name_gen'    // 起名
  | 'advice'      // 写作建议
  | 'parse'       // Parser（EPIC2 共享）

// AI 配置（项目级，EPIC4/US-4.8）
interface AIProjectConfig {
  projectId: string
  model?: string              // 不填则用全局
  temperature?: number        // 0.1~1.0
  maxLength?: number          // 100~5000 字
  parseDepth?: 'fast' | 'standard' | 'deep'
  useGlobalAsDefault: boolean
  updatedAt: string
}

// AI 生成结果
interface AIResult {
  taskId: string
  type: AITaskType
  status: 'draft' | 'generating' | 'awaiting_confirmation' | 'done' | 'stopped' | 'failed'
  payloadType: AIResultPayloadType
  payload: AIResultPayload
  error?: string
  createdAt: string
}

type AIResultPayloadType =
  | 'text'
  | 'diff'
  | 'suggestions'
  | 'names'
  | 'copilot_worldbuild'
  | 'copilot_plot'

type AIResultPayload =
  | AITextPayload
  | AIDiffPayload
  | AISuggestionsPayload
  | AINamesPayload
  | CopilotWorldbuildPayload
  | CopilotPlotPayload

interface AITextPayload {
  content: string
}

interface AIDiffPayload {
  diff: AIDiffChange[]
  // Optional: full revised text, used by FE to apply the diff without
  // requiring positional metadata in v1.
  revisedText?: string
}

interface AISuggestionsPayload {
  suggestions: string[]
}

interface AINamesPayload {
  names: string[]
}

interface WorldbuildEntryDraft {
  title: string
  category: string
  content: string
  relatedEntityRefs?: Array<{ entityType: string; entityId: string }>
  confidence: 'high' | 'medium' | 'low'
}

interface CopilotWorldbuildPayload {
  reply?: string
  entries: WorldbuildEntryDraft[]
}

interface PlotDeriveLiteResult {
  impactedCharacters: Array<{ characterId: string; impact: string }>
  impactedFactions: Array<{ factionId: string; impact: string }>
  triggeredForeshadows: Array<{ foreshadowId: string; reason: string }>
  conflicts: Array<{ description: string; severity: 'high' | 'medium' | 'low' }>
  branches: Array<{ title: string; summary: string; plotPoints: string[] }>
}

interface CopilotPlotPayload {
  derivation: PlotDeriveLiteResult
}

type StoryCopilotMode =
  | 'worldbuild'
  | 'plot_derive_lite'
  | 'story_diagnose'

interface StoryCopilotSession {
  id: string
  projectId: string
  mode: StoryCopilotMode
  title?: string
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

type StoryCopilotMessageRole = 'user' | 'assistant' | 'system'

interface StoryCopilotMessage {
  id: string
  role: StoryCopilotMessageRole
  content: string
}

type StoryCopilotCardStatus = 'pending' | 'adopted' | 'dismissed'
type StoryCopilotCardKind = 'draft' | 'result'

interface StoryCopilotCard {
  id: string
  kind: StoryCopilotCardKind
  title: string
  summary: string
  status: StoryCopilotCardStatus
  payload?: Record<string, unknown>
}

type StoryCopilotCardActionType = 'adopt' | 'dismiss' | 'regenerate'

interface StoryCopilotCardAction {
  id: string
  cardId: string
  action: StoryCopilotCardActionType
}

type StoryCopilotEventType = 'message' | 'card' | 'card_action'

interface StoryCopilotEvent {
  id: string
  type: StoryCopilotEventType
  createdAt: string
  message?: StoryCopilotMessage
  card?: StoryCopilotCard
  cardAction?: StoryCopilotCardAction
}

interface AIDiffChange {
  type: 'insert' | 'delete'
  content: string
}
```

## 共享约束说明

### `AITaskType` 的职责是统一任务路由，不是替代每个任务自己的参数模型
- `continue`、`dialogue` 归类为流式正文生成任务。
- `polish`、`expand`、`summarize` 归类为 Diff 输出任务。
- `outline`、`name_gen`、`advice` 归类为结构化结果任务。
- `parse` 由 EPIC2 使用，但必须保留在同一枚举里，因为它共享项目级 AI 配置与模型选择。
- `worldbuild`、`plot_derive_lite` 不再扩充顶层 `AITaskType`，而是作为 `StoryCopilotSession.mode` 落地。

### `AIProjectConfig` 只存项目级覆盖值，最终生效值要由配置解析器计算
- `model`、`temperature`、`maxLength`、`parseDepth` 任一字段为空时，表示该字段继续继承全局或系统默认。
- `useGlobalAsDefault` 表示项目仍以全局偏好为基线，而不是脱离全局独立运作。
- 配置保存后只影响新任务；正在执行中的任务继续使用创建时快照。

### `AIResult` 要兼容不同结果形态，但通过 `payloadType` 明确判别
- `draft`：结果还在整理，尚不适合直接采纳。
- `generating`：流式任务或仍在生成中的任务。
- `awaiting_confirmation`：结果需要用户逐条确认后落库或采纳。
- `done`：生成成功，且结果可被采纳或展示。
- `stopped`：用户主动中止，允许保留部分结果。
- `failed`：任务失败，需附带 `error`。

## 上下文注入规则

### US-4.1 的上下文优先级必须成为共享规则，因为它是 Epic 4 的核心能力
1. 固定注入项：系统指令、任务指令、项目级生效配置、当前章节全文、前一章末尾 2000 字、相关知识库条目、世界观设定。
2. Token 超限时的保留顺序固定为：当前章节全文 > 知识库条目（含世界观设定） > 前一章末尾。
3. 当前章节全文仍然过长时，只能最后裁剪，并且优先保留光标附近段落的原文。
4. 知识库条目应按相关度排序后再裁剪，避免低相关设定挤掉核心人物或世界观信息。
5. 前一章末尾属于最低优先级，可先缩短后移除。

### 其它任务按“最小必要上下文”复用同一规则框架
- `polish` / `expand` / `summarize`：原选中文本 + 当前章节全文。
- `dialogue`：当前章节全文 + 角色画像 + 场景描述 + 光标附近正文。
- `outline`：前文章节摘要 + 知识库 + 未回收伏笔列表。
- `name_gen`：世界观风格约束 + 用户输入的类型/风格/性别/附加要求。
- `advice`：当前章节全文 + 段落索引映射。
- `parse`：沿用 EPIC2 解析链路，但读取同一项目级 AI 配置。

### Story Copilot 按 session mode 复用上下文框架
- `worldbuild`：已有世界观设定（全量 KBSetting）+ 会话消息历史 + 用户本轮输入。
- `plot_derive_lite`：角色关系图谱 + 势力同盟/敌对关系 + 未回收伏笔列表 + 世界观核心约束。
- `story_diagnose`：当前章节全文 + 段落索引 + 最近一致性问题 / 建议摘要（可选）。

## 共享字段补充建议

### 如果后续要增强结构化结果，建议在不破坏当前 Schema 的前提下新增扩展字段
- 大纲建议可在 `suggestions` 之外补充服务端内部结构，例如标题、要点、涉及角色。
- 写作建议若要支持定位跳转，建议后续增加段落索引字段。
- Diff 若需更细粒度高亮，可在 `AIDiffChange` 之外新增可选位置信息，但当前版本先保持最小集。

## Epic 4 覆盖检查

| US | context.md 对应内容 |
| --- | --- |
| US-4.1 | `continue` 类型、`AIResult.status`、流式结果、上下文优先级 |
| US-4.2 | `polish` 类型、Diff Schema |
| US-4.3 | `expand` / `summarize` 类型、Diff Schema |
| US-4.4 | `dialogue` 类型、流式结果 |
| US-4.5 | `outline` 类型、建议列表 |
| US-4.6 | `name_gen` 类型、名字列表 |
| US-4.7 | `advice` 类型、结果状态与内容承载 |
| US-4.8 | `AIProjectConfig`、三级覆盖说明 |
| US-2.10 缝补 | `StoryCopilotSession.mode = worldbuild`、`WorldbuildEntryDraft`、会话上下文规则 |
| US-4.5 缝补 | `StoryCopilotSession.mode = plot_derive_lite`、`PlotDeriveLiteResult`、轻量推演规则 |
| EPIC2 共享 | `parse` 类型、`parseDepth` 配置 |

## 下一步

| 行动 | 负责人 | 截止时间 |
| --- | --- | --- |
| 将本文件中的共享类型沉淀为前后端共用类型包或接口文档 | 前端 + 后端 | API 冻结前 |
| 把 Token 裁剪顺序写进后端单元测试与联调用例 | 后端 | 开发启动前 |
| 在 EPIC2 Parser 设计中引用同一 `AIProjectConfig` 与 `AITaskType` | 后端 | Parser 联调前 |

---

## Story Copilot Session API (Sprint 8 Phase A)

> 目标：让 Copilot 具备最小“会话”能力：创建/恢复会话、消息追加、结果卡片插入、状态机可回放。
>
> 说明：本阶段只冻结“会话与事件流”契约；具体各 mode 的业务字段（US-4.5/4.7/US-2.10）在后续 Phase 再细化扩展 `payload`。

### 端点

#### 创建会话
- `POST /api/projects/{projectId}/copilot/sessions`
- Request
  - `mode: StoryCopilotMode`
  - `title?: string`
- Response `201`
  - `{ session: StoryCopilotSession }`
- Errors
  - `401 UNAUTHORIZED`
  - `403 FORBIDDEN`
  - `404 PROJECT_NOT_FOUND`
  - `400 VALIDATION_ERROR`（mode/title 非法）

#### 列出会话（最近优先）
- `GET /api/projects/{projectId}/copilot/sessions?mode={StoryCopilotMode?}&limit={number?}`
- Response `200`
  - `{ sessions: StoryCopilotSession[] }`

#### 获取会话回放（事件流）
- `GET /api/copilot/sessions/{sessionId}`
- Response `200`
  - `{ session: StoryCopilotSession, events: StoryCopilotEvent[] }`
- Errors
  - `401 UNAUTHORIZED`
  - `403 FORBIDDEN`
  - `404 COPILOT_SESSION_NOT_FOUND`

#### 追加消息
- `POST /api/copilot/sessions/{sessionId}/messages`
- Request
  - `role: StoryCopilotMessageRole`
  - `content: string`
- Response `201`
  - `{ message: StoryCopilotMessage, event: StoryCopilotEvent }`
- Errors
  - `401 UNAUTHORIZED`
  - `403 FORBIDDEN`
  - `404 COPILOT_SESSION_NOT_FOUND`
  - `400 VALIDATION_ERROR`（role/content 非法）

#### 插入卡片
- `POST /api/copilot/sessions/{sessionId}/cards`
- Request
  - `kind: StoryCopilotCardKind`
  - `title: string`
  - `summary: string`
  - `payload?: Record<string, unknown>`
- Response `201`
  - `{ card: StoryCopilotCard, event: StoryCopilotEvent }`

#### 卡片动作（统一 adopt/dismiss/regenerate）
- `POST /api/copilot/sessions/{sessionId}/cards/{cardId}/actions`
- Request
  - `action: StoryCopilotCardActionType`
- Response `200`
  - `{ card: StoryCopilotCard, event: StoryCopilotEvent }`
- Errors
  - `401 UNAUTHORIZED`
  - `403 FORBIDDEN`
  - `404 COPILOT_SESSION_NOT_FOUND`
  - `404 COPILOT_CARD_NOT_FOUND`
  - `400 VALIDATION_ERROR`（action 非法）
