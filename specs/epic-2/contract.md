# Epic 2 Context

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
  NO_CONTENT = 'no_content',
  DIRTY = 'dirty',
  QUEUED = 'queued',
  PARSING = 'parsing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
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
| `POST` | `/api/projects/:projectId/parser/chapters/:chapterId/auto-trigger` | 章节切换或关闭场景的自动触发 |
| `POST` | `/api/projects/:projectId/parser/batch` | 创建批量解析任务 |
| `POST` | `/api/projects/:projectId/parser/batch/:jobId/cancel` | 取消未开始的批量解析任务 |
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

## 补充上下文

- `US-2.1` 是 Epic 2 的核心依赖；角色、地点、道具、势力、伏笔、设定的 AI 建议能力都依赖解析任务产出。
- 通知类需求属于 FE + BE 共享边界：后端负责创建、持久化、推送通知，前端负责展示 toast、通知中心列表与高亮状态。
- 图谱当前以角色关系为主，节点结构保留了颜色、尺寸、位置和统计字段，足够支撑 FE 渲染、筛选、聚焦和导出。
