# Epic 2 Context

> **STATUS: FROZEN** | 冻结日期: 2026-04-11
> - Parser 事件命名：CONFIRMED（统一为 `parse_*`）
> - API 契约：CONFIRMED
> - 如需修改请先同步 FE/BE 并更新 `docs/CHANGELOG.md`

Epic 2 的上下文要先定义统一知识库模型，再围绕 `US-2.1` 提供 Parser、图谱、搜索和手动编辑接口；其中关系图谱节点/边结构已包含 FE 渲染所需字段。

## 实体建模

```typescript
type KBSource = 'ai' | 'manual'

type KBEntityType =
  | 'character'
  | 'location'
  | 'item'
  | 'faction'
  | 'foreshadow'
  | 'setting'

interface KBEntityBase {
  id: string
  projectId: string
  source: KBSource
  confirmed: boolean
  remark?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  restoreUntil?: string
}

// 角色
interface KBCharacter extends KBEntityBase {
  type: 'character'
  name: string
  aliases: string[]
  gender?: string
  occupation?: string
  appearance?: string
  personalityTags: string[]
  factionId?: string
  chapterIds: string[]
  firstAppearanceChapterId?: string
  lastAppearanceChapterId?: string
  appearanceCount: number
  rawAI?: Partial<KBCharacterAIFields>
}

interface KBCharacterAIFields {
  gender?: string
  occupation?: string
  appearance?: string
  personalityTags?: string[]
  factionId?: string
}

// 地点
interface KBLocation extends KBEntityBase {
  type: 'location'
  name: string
  aliases: string[]
  locationType: 'city' | 'village' | 'building' | 'nature' | 'virtual' | 'other'
  parentId?: string
  description?: string
  characterIds: string[]
  chapterIds: string[]
  rawAI?: Partial<KBLocationAIFields>
}

interface KBLocationAIFields {
  description?: string
  parentId?: string
  characterIds?: string[]
}

// 道具
interface KBItem extends KBEntityBase {
  type: 'item'
  name: string
  aliases: string[]
  itemType: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'token' | 'other'
  summary?: string
  ownerCharacterId?: string
  ownershipHistory: KBOwnershipRecord[]
  chapterIds: string[]
  rawAI?: Partial<KBItemAIFields>
}

interface KBOwnershipRecord {
  fromCharacterId?: string
  toCharacterId?: string
  chapterId: string
  note?: string
  createdAt: string
}

interface KBItemAIFields {
  summary?: string
  ownerCharacterId?: string
}

// 势力
interface KBFaction extends KBEntityBase {
  type: 'faction'
  name: string
  aliases: string[]
  factionType: 'country' | 'sect' | 'company' | 'gang' | 'military' | 'other'
  summary?: string
  memberCharacterIds: string[]
  allyFactionIds: string[]
  rivalFactionIds: string[]
  chapterIds: string[]
  rawAI?: Partial<KBFactionAIFields>
}

interface KBFactionAIFields {
  summary?: string
  memberCharacterIds?: string[]
  allyFactionIds?: string[]
  rivalFactionIds?: string[]
}

// 伏笔
interface KBForeshadow extends KBEntityBase {
  type: 'foreshadow'
  name: string
  summary: string
  plantedChapterId: string
  quote: string
  status: ForeshadowStatus
  expectedResolveChapterId?: string
  resolvedChapterId?: string
  resolveNote?: string
  aiSuggestions: KBForeshadowSuggestion[]
  notifyState: ForeshadowNotifyState
  rawAI?: Partial<KBForeshadowAIFields>
}

type ForeshadowStatus =
  | 'unresolved'
  | 'partially_resolved'
  | 'resolved'
  | 'abandoned'

type ForeshadowNotifyState = {
  reminded: boolean
  warned: boolean
}

interface KBForeshadowSuggestion {
  chapterId: string
  message: string
  confidence: 'high' | 'medium' | 'low'
  createdAt: string
  confirmedAt?: string
}

interface KBForeshadowAIFields {
  summary?: string
  quote?: string
}

// 世界观设定
interface KBSetting extends KBEntityBase {
  type: 'setting'
  title: string
  category: string
  content: string
  order: number
  relatedEntityRefs: KBEntityRef[]
  rawAI?: Partial<KBSettingAIFields>
}

interface KBSettingAIFields {
  title?: string
  category?: string
  content?: string
}

interface KBEntityRef {
  entityType: KBEntityType
  entityId: string
}
```

## 章节解析状态枚举

```typescript
enum ChapterParseStatus {
  NO_CONTENT = 'no_content',    // 无内容
  PENDING = 'pending',          // 待解析（原DIRTY）
  QUEUED = 'queued',            // 排队中
  PARSING = 'parsing',          // 解析中
  PARSED = 'parsed',            // 已解析（原SYNCED）
  FAILED = 'failed',            // 解析失败
  CANCELLED = 'cancelled',      // 已取消
}

interface ChapterParseState {
  chapterId: string
  status: ChapterParseStatus
  lastParsedAt?: string
  lastQueuedAt?: string
  lastContentHash?: string
  retryCount: number
  failureReason?: string
  trigger: 'auto' | 'manual' | 'batch'
  batchJobId?: string
}
```

## US-2.1 解析任务数据结构

```typescript
// 解析任务
interface ParseTask {
  id: string
  projectId: string
  chapterId: string
  trigger: 'auto' | 'manual' | 'batch'
  priority: number              // manual=10, auto=5, batch=1
  batchJobId?: string
  contentHash: string
  status: ChapterParseStatus
  retryCount: number
  failureReason?: string
  resultSummary?: ParseResultSummary
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// 解析结果摘要
interface ParseResultSummary {
  newCharacters: number
  newLocations: number
  newItems: number
  newFactions: number
  newForeshadows: number
  newRelations: number
  consistencyIssues: number
}

// 批量解析任务
interface BatchParseJob {
  id: string
  projectId: string
  scope: 'all' | 'volume' | 'selected'
  volumeId?: string
  chapterIds?: string[]
  totalChapters: number
  completedChapters: number
  failedChapters: number
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  createdAt: string
  startedAt?: string
  completedAt?: string
  createdBy: string
}
```

## US-2.1 AI 解析请求/响应格式

```typescript
// AI解析请求
interface AIParseRequest {
  chapterId: string
  projectId: string
  content: string           // 章节纯文本
  existingKB: {
    characters: Array<{id: string, name: string, aliases: string[]}>
    locations: Array<{id: string, name: string, aliases: string[]}>
    items: Array<{id: string, name: string}>
    factions: Array<{id: string, name: string}>
    foreshadows: Array<{id: string, name: string}>
  }
  excludeWords?: string[]   // 排除词列表
}

// AI解析响应
interface AIParseResponse {
  characters: Array<{
    name: string
    aliases: string[]
    gender?: string
    occupation?: string
    appearance?: string
    personalityTags?: string[]
    factionName?: string
    confidence: 'high' | 'medium' | 'low'
  }>
  locations: Array<{
    name: string
    aliases: string[]
    locationType?: string
    description?: string
    parentName?: string
    confidence: 'high' | 'medium' | 'low'
  }>
  items: Array<{
    name: string
    aliases: string[]
    itemType?: string
    summary?: string
    ownerName?: string
    confidence: 'high' | 'medium' | 'low'
  }>
  factions: Array<{
    name: string
    aliases: string[]
    factionType?: string
    summary?: string
    memberNames?: string[]
    confidence: 'high' | 'medium' | 'low'
  }>
  foreshadows: Array<{
    name: string
    summary: string
    quote: string
    confidence: 'high' | 'medium' | 'low'
  }>
  relations: Array<{
    sourceName: string
    targetName: string
    relationType: string
    description?: string
    confidence: 'high' | 'medium' | 'low'
  }>
  consistencyIssues: Array<{
    type: string
    description: string
    confidence: 'high' | 'medium' | 'low'
    relatedEntityIds?: string[]
  }>
}
```

## US-2.1 通知事件格式

```typescript
// 解析完成事件
interface ParseCompletedEvent {
  type: 'parse_done'
  projectId: string
  chapterId: string
  taskId: string
  resultSummary: ParseResultSummary
  timestamp: string
}

// 解析失败事件
interface ParseFailedEvent {
  type: 'parse_failed'
  projectId: string
  chapterId: string
  taskId: string
  failureReason: string
  timestamp: string
}

// 批量解析进度事件
interface BatchParseProgressEvent {
  type: 'parse_batch_progress'
  projectId: string
  jobId: string
  totalChapters: number
  completedChapters: number
  failedChapters: number
  progress: number  // 0-100
  timestamp: string
}
```

## 关系图谱节点/边结构

```typescript
type GraphNodeType = 'character'

type GraphRelationType =
  | 'family'
  | 'mentor'
  | 'colleague'
  | 'ally'
  | 'enemy'
  | 'romance'
  | 'other'

interface KBGraphNode {
  id: string
  type: GraphNodeType
  entityId: string
  label: string
  factionId?: string
  factionName?: string
  appearanceCount: number
  firstAppearanceChapterId?: string
  lastAppearanceChapterId?: string
  color?: string
  size: number
  x?: number
  y?: number
  meta: {
    aliases: string[]
    confirmed: boolean
  }
}

interface KBGraphEdge {
  id: string
  source: string
  target: string
  relationType: GraphRelationType
  relationLabel: string
  description?: string
  chapterId: string
  sourceType: 'ai' | 'manual'
  confidence?: 'high' | 'medium' | 'low'
  directed: boolean
  createdAt: string
  updatedAt: string
}

interface KBGraphPayload {
  nodes: KBGraphNode[]
  edges: KBGraphEdge[]
  stats: {
    characterCount: number
    relationCount: number
    factionCount: number
  }
}
```

## API 端点列表

### Parser / 解析队列

| Method | Endpoint | 用途 |
| --- | --- | --- |
| `POST` | `/api/projects/:projectId/parser/chapters/:chapterId/trigger` | 手动触发当前章节解析 |
| `POST` | `/api/projects/:projectId/parser/chapters/:chapterId/auto-trigger` | 章节切换或关闭场景的自动触发（60s防抖） |
| `POST` | `/api/projects/:projectId/parser/batch` | 创建批量解析任务 |
| `POST` | `/api/projects/:projectId/parser/batch/:jobId/cancel` | 取消未开始的批量解析任务 |
| `GET` | `/api/projects/:projectId/parser/batch/:jobId/progress` | 批量解析进度（SSE流式） |
| `GET` | `/api/projects/:projectId/parser/status` | 获取项目级解析概览与待解析数量 |
| `GET` | `/api/projects/:projectId/parser/chapters/:chapterId/status` | 获取单章节解析状态与失败原因 |

### 知识库 CRUD

| Method | Endpoint | 用途 |
| --- | --- | --- |
| `GET` | `/api/projects/:projectId/kb/search?q=` | 统一知识库搜索 |
| `GET` | `/api/projects/:projectId/kb/:entityType` | 获取某类知识库列表 |
| `POST` | `/api/projects/:projectId/kb/:entityType` | 手动创建知识库条目 |
| `GET` | `/api/projects/:projectId/kb/:entityType/:entityId` | 获取知识库条目详情 |
| `PATCH` | `/api/projects/:projectId/kb/:entityType/:entityId` | 更新知识库条目 |
| `DELETE` | `/api/projects/:projectId/kb/:entityType/:entityId` | 软删除知识库条目 |
| `POST` | `/api/projects/:projectId/kb/:entityType/:entityId/confirm` | 确认 AI 识别条目 |
| `POST` | `/api/projects/:projectId/kb/:entityType/:entityId/reject` | 标记为非实体并加入排除规则 |
| `POST` | `/api/projects/:projectId/kb/:entityType/bulk-confirm` | 批量确认待确认条目 |
| `GET` | `/api/projects/:projectId/kb/recycle-bin` | 获取回收区条目 |
| `POST` | `/api/projects/:projectId/kb/recycle-bin/:entityType/:entityId/restore` | 恢复软删除条目 |
| `POST` | `/api/projects/:projectId/kb/:entityType/:entityId/merge` | 合并到同类型其他条目 |
| `GET` | `/api/projects/:projectId/kb/:entityType/:entityId/references` | 删除前检查引用关系 |

### 伏笔 / 一致性 / 世界观

| Method | Endpoint | 用途 |
| --- | --- | --- |
| `PATCH` | `/api/projects/:projectId/kb/foreshadows/:entityId/status` | 更新伏笔状态 |
| `PATCH` | `/api/projects/:projectId/kb/foreshadows/:entityId/expected-resolve` | 更新预期回收章节 |
| `GET` | `/api/projects/:projectId/consistency/issues` | 获取一致性问题列表 |
| `GET` | `/api/projects/:projectId/consistency/issues/:issueId` | 获取一致性问题详情对比 |
| `PATCH` | `/api/projects/:projectId/consistency/issues/:issueId` | 处理一致性问题 |
| `POST` | `/api/projects/:projectId/kb/settings/:entityId/references` | 维护设定引用关系 |
| `PATCH` | `/api/projects/:projectId/kb/settings/reorder` | 持久化设定拖拽排序 |

### 图谱

| Method | Endpoint | 用途 |
| --- | --- | --- |
| `GET` | `/api/projects/:projectId/graph` | 获取关系图谱节点与边 |
| `POST` | `/api/projects/:projectId/graph/edges` | 新增关系边 |
| `PATCH` | `/api/projects/:projectId/graph/edges/:edgeId` | 编辑关系边 |
| `DELETE` | `/api/projects/:projectId/graph/edges/:edgeId` | 删除关系边 |
| `GET` | `/api/projects/:projectId/graph/export` | 获取图谱导出数据或导出文件 |

## US-2.1 / US-2.7 ~ US-2.11 统一请求响应契约

```typescript
// 分页请求（用于列表型接口）
interface PageQuery {
  page?: number        // 默认 1
  pageSize?: number    // 默认 20，最大 100
}

interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// fallback 标记（用于降级返回）
interface FallbackMeta {
  used: boolean
  strategy?: 'cache' | 'snapshot' | 'rule_based'
  reason?:
    | 'upstream_timeout'
    | 'upstream_unavailable'
    | 'partial_data'
    | 'degraded_mode'
  staleSeconds?: number
}

interface APIError {
  code: ContractErrorCode
  message: string
  requestId: string
  details?: Record<string, unknown>
}

// 统一响应信封
interface APIResponse<T> {
  success: true
  data: T
  fallback?: FallbackMeta
}

interface APIErrorResponse {
  success: false
  error: APIError
}

type ContractErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  // US-2.1
  | 'PARSER_CHAPTER_EMPTY'
  | 'PARSER_DEBOUNCED'
  | 'PARSER_TASK_ALREADY_RUNNING'
  | 'PARSER_TASK_NOT_FOUND'
  | 'PARSER_BATCH_NOT_FOUND'
  | 'PARSER_BATCH_ALREADY_FINISHED'
  // US-2.7
  | 'GRAPH_EDGE_NOT_FOUND'
  | 'GRAPH_EDGE_SELF_LOOP_NOT_ALLOWED'
  | 'GRAPH_EXPORT_UNAVAILABLE'
  // US-2.8
  | 'CONSISTENCY_ISSUE_NOT_FOUND'
  | 'CONSISTENCY_ACTION_INVALID'
  // US-2.9
  | 'SEARCH_QUERY_TOO_SHORT'
  // US-2.10
  | 'SETTING_CATEGORY_INVALID'
  | 'SETTING_REFERENCE_INVALID'
  // US-2.11
  | 'KB_ENTITY_NOT_FOUND'
  | 'KB_ENTITY_ALREADY_DELETED'
  | 'KB_RESTORE_EXPIRED'
  | 'KB_MERGE_TARGET_INVALID'
```

## US-2.1 Parser 请求/响应

```typescript
type ParseTrigger = 'auto' | 'manual'

interface TriggerParseRequest {
  trigger: ParseTrigger
  contentHash: string
  sourceEvent?: 'chapter_switch' | 'chapter_close' | 'manual_retry'
}

interface TriggerParseResponse {
  taskId: string
  chapterId: string
  status: ChapterParseStatus
  queuedAt: string
}

interface BatchParseRequest {
  scope: 'all' | 'volume' | 'selected'
  volumeId?: string
  chapterIds?: string[]
}

interface BatchParseResponse {
  job: BatchParseJob
}

interface BatchParseProgressResponse {
  jobId: string
  status: BatchParseJob['status']
  totalChapters: number
  completedChapters: number
  failedChapters: number
  runningChapters: string[]
  progress: number // 0-100
}

interface ProjectParseStatusResponse {
  totalChapters: number
  parsedChapters: number
  pendingChapters: number
  failedChapters: number
  parsingChapters: number
  overallStatus: 'all_parsed' | 'has_pending' | 'has_failed' | 'running'
  updatedAt: string
}

interface ChapterParseStatusResponse {
  chapterId: string
  status: ChapterParseStatus
  retryCount: number
  failureReason?: string
  lastParsedAt?: string
  lastQueuedAt?: string
  lastContentHash?: string
}
```

## US-2.7 关系图谱请求/响应

```typescript
interface GraphQuery extends PageQuery {
  relationTypes?: GraphRelationType[]
  factionIds?: string[]
  focusCharacterId?: string
  includeIsolatedNodes?: boolean // 默认 true
}

interface GraphResponse {
  graph: KBGraphPayload
  pagination?: PageMeta  // 边数量较大时启用分页
  appliedFilters: {
    relationTypes: GraphRelationType[]
    factionIds: string[]
    focusCharacterId?: string
    includeIsolatedNodes: boolean
  }
}

type GraphEdgeSource = 'ai' | 'manual'

interface CreateGraphEdgeRequest {
  sourceEntityId: string
  targetEntityId: string
  relationType: GraphRelationType
  relationLabel: string
  description?: string
  chapterId: string
  sourceType: GraphEdgeSource
  directed?: boolean
}

interface UpdateGraphEdgeRequest {
  relationType?: GraphRelationType
  relationLabel?: string
  description?: string
  chapterId?: string
  directed?: boolean
}

interface GraphEdgeResponse {
  edge: KBGraphEdge
}

interface GraphExportQuery {
  format: 'json' | 'png'
  relationTypes?: GraphRelationType[]
  factionIds?: string[]
}

interface GraphExportResponse {
  format: 'json' | 'png'
  fileName: string
  downloadUrl?: string      // png 导出
  payload?: KBGraphPayload  // json 导出
}
```

## US-2.8 一致性检查请求/响应

```typescript
type ConsistencyIssueType =
  | 'appearance_conflict'
  | 'relation_conflict'
  | 'location_conflict'
  | 'item_owner_conflict'
  | 'timeline_conflict'
  | 'dead_character_reappear'
  | 'title_conflict'
  | 'other'

type ConsistencyIssueStatus = 'open' | 'fixed' | 'ignored' | 'intentional'

interface ConsistencyIssue {
  id: string
  projectId: string
  type: ConsistencyIssueType
  description: string
  confidence: 'high' | 'medium' | 'low'
  chapterIds: string[]
  relatedEntityRefs: KBEntityRef[]
  status: ConsistencyIssueStatus
  discoveredAt: string
  resolvedAt?: string
  resolutionNote?: string
}

interface ConsistencyIssueListQuery extends PageQuery {
  confidence?: Array<'high' | 'medium' | 'low'>
  status?: ConsistencyIssueStatus[]
  type?: ConsistencyIssueType[]
}

interface ConsistencyIssueListResponse {
  items: ConsistencyIssue[]
  pagination: PageMeta
  appliedFilters: {
    confidence: Array<'high' | 'medium' | 'low'>
    status: ConsistencyIssueStatus[]
    type: ConsistencyIssueType[]
  }
}

interface ConsistencyIssueDetailResponse {
  issue: ConsistencyIssue
  kbSnapshot: string
  chapterSnapshot: string
  diffSegments: Array<{
    kbText: string
    chapterText: string
    highlightRanges: Array<{ start: number; end: number }>
  }>
}

interface ResolveConsistencyIssueRequest {
  action: 'fixed' | 'ignored' | 'intentional'
  note?: string
}
```

## US-2.9 知识库搜索请求/响应

```typescript
interface KBSearchQuery extends PageQuery {
  q: string             // 最少 2 字
  entityTypes?: KBEntityType[]
}

interface KBSearchHit {
  entityType: KBEntityType
  entityId: string
  title: string
  subtitle?: string
  matchedField: 'name' | 'aliases' | 'summary' | 'description' | 'remark' | 'content'
  snippet: string
  score: number
  highlightRanges: Array<{ start: number; end: number }>
}

interface KBSearchResponse {
  query: string
  items: KBSearchHit[]
  pagination: PageMeta
  appliedFilters: {
    entityTypes: KBEntityType[]
  }
}
```

## US-2.10 世界观设定请求/响应

```typescript
interface SettingListQuery extends PageQuery {
  category?: string
  q?: string
}

interface SettingListResponse {
  items: KBSetting[]
  pagination: PageMeta
  appliedFilters: {
    category?: string
    q?: string
  }
}

interface CreateSettingRequest {
  title: string
  category: string
  content: string
  order?: number
  relatedEntityRefs?: KBEntityRef[]
}

interface UpdateSettingRequest {
  title?: string
  category?: string
  content?: string
  order?: number
  relatedEntityRefs?: KBEntityRef[]
}

interface SettingReferencesRequest {
  relatedEntityRefs: KBEntityRef[]
}

interface SettingReorderRequest {
  orderedIds: string[]
}

interface SettingSuggestion {
  id: string
  chapterId: string
  title: string
  category: string
  content: string
  confidence: 'high' | 'medium' | 'low'
  createdAt: string
}
```

## US-2.11 手动编辑请求/响应（通用于角色/地点/道具/势力/伏笔/设定）

```typescript
interface KBListQuery extends PageQuery {
  q?: string
  confirmed?: boolean
  source?: KBSource
  chapterId?: string
  includeDeleted?: boolean
}

interface KBListResponse<T> {
  items: T[]
  pagination: PageMeta
  appliedFilters: {
    q?: string
    confirmed?: boolean
    source?: KBSource
    chapterId?: string
    includeDeleted?: boolean
  }
}

interface CreateKBEntityResponse<T> {
  entity: T
}

interface UpdateKBEntityRequest<T> {
  patch: Partial<T>
  saveMode?: 'auto' | 'manual'   // auto 对应 1 秒防抖自动保存
  idempotencyKey?: string
}

interface DeleteKBEntityResponse {
  deletedAt: string
  restoreUntil: string
}

interface RecycleBinQuery extends PageQuery {
  entityTypes?: KBEntityType[]
}

interface RecycleBinItem {
  entityType: KBEntityType
  entityId: string
  title: string
  deletedAt: string
  restoreUntil: string
}

interface RecycleBinResponse {
  items: RecycleBinItem[]
  pagination: PageMeta
  appliedFilters: {
    entityTypes: KBEntityType[]
  }
}

interface ReferenceCheckResponse {
  total: number
  refs: Array<{
    refType: 'setting' | 'graph_edge' | 'chapter_mention' | 'other'
    refId: string
    refTitle: string
    fromEntityType?: KBEntityType
    fromEntityId?: string
  }>
}

interface RestoreKBEntityResponse<T> {
  entity: T
  restoredReferenceCount: number
}

interface MergeKBEntityRequest {
  targetEntityId: string
}

interface MergePreviewResponse {
  sourceEntityId: string
  targetEntityId: string
  refMigrationCount: number
  remarkAppendPreview?: string
  irreversible: true
}

interface MergeExecuteResponse {
  targetEntityId: string
  mergedSourceEntityId: string
  migratedReferenceCount: number
  deletedSourceAt: string
}
```

## 补充上下文

- `US-2.1` 是 Epic 2 的核心依赖；角色、地点、道具、势力、伏笔、设定的 AI 建议能力都依赖解析任务产出。
- 通知类需求属于 FE + BE 共享边界：后端负责创建、持久化、推送通知，前端负责展示 toast、通知中心列表与高亮状态。
- 图谱当前以角色关系为主，节点结构保留了颜色、尺寸、位置和统计字段，足够支撑 FE 渲染、筛选、聚焦和导出。
