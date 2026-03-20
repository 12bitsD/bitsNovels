# Epic 6 Context - 用户级设置、通知与存储的数据契约

## 目标结论
- Epic 6 需要一套跨端共享的数据契约，统一用户设置、通知事件、存储统计和快捷键配置的语义。
- `US-6.4 通知配置` 与 `US-6.6 通知中心` 的一致性关键在于：通知类型枚举只能有一个事实来源。
- Epic 6 是系统层，可排在业务 Epic 之后实现，但一旦进入开发，FE 与 BE 必须严格共用这些结构。

## 核心类型

```typescript
type ThemePreference = 'light' | 'dark' | 'sepia' | 'system'
type EditorFontPreference = 'default' | 'serif' | 'sans' | 'mono'
type ShortcutCategory = 'editor' | 'ai' | 'panel' | 'navigation'
type ParseDepth = 'fast' | 'standard' | 'deep'

type NotificationType =
  | 'parse_done'
  | 'parse_failed'
  | 'backup_done'
  | 'backup_failed'
  | 'export_done'
  | 'consistency_issue'
  | 'foreshadow_reminder'
  | 'foreshadow_warning'
  | 'recycle_expire'
  | 'snapshot_expire'
  | 'storage_warning'
  | 'storage_critical'
  | 'system_announcement'

type NotificationCenterCategory =
  | 'all'
  | 'ai_parse'
  | 'backup_export'
  | 'consistency_foreshadow'
  | 'system'

interface NotificationPreferenceItem {
  type: NotificationType
  inApp: true
  browserPush: boolean
}

interface NotificationPreferences {
  muteAll: boolean
  items: NotificationPreferenceItem[]
}

interface ShortcutConfig {
  actionId: string
  label: string
  category: ShortcutCategory
  defaultKeys: string[]
  currentKeys: string[]
  macKeys?: string[]
  windowsKeys?: string[]
}

interface UserSettings {
  userId: string
  preferences: {
    theme: ThemePreference
    editorFont: EditorFontPreference
    fontSize: number
    lineSpacing: 1.5 | 1.75 | 2.0
    language: 'zh-CN'
    timerSound: boolean
    typingSound: boolean
  }
  notifications: NotificationPreferences
  shortcuts: ShortcutConfig[]
  aiGlobal: {
    model?: string
    temperature?: number
    maxLength?: number
    parseDepth?: ParseDepth
  }
  updatedAt: string
}

interface NotificationActionTarget {
  kind:
    | 'project_settings'
    | 'consistency_panel'
    | 'foreshadow_panel'
    | 'download'
    | 'storage_settings'
    | 'system_notice'
  url?: string
  projectId?: string
  entityId?: string
}

interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  projectId?: string
  read: boolean
  actionTarget?: NotificationActionTarget
  createdAt: string
}

interface StorageBreakdown {
  content: number
  knowledgeBase: number
  snapshots: number
  backups: number
  recycleBin: number
}

interface StorageUsage {
  total: number
  used: number
  breakdown: StorageBreakdown
  projects: {
    projectId: string
    projectName: string
    used: number
    breakdown: StorageBreakdown
  }[]
}

interface ActiveSession {
  id: string
  userId: string
  deviceName: string
  browser: string
  ipRegion?: string
  current: boolean
  lastActiveAt: string
  createdAt: string
}

interface AccountDeletionTicket {
  userId: string
  status: 'scheduled' | 'cancelled' | 'deleted'
  scheduledDeleteAt: string
  createdAt: string
  cancelledAt?: string
}
```

## 通知分类映射

```typescript
const notificationCategoryMap: Record<
  Exclude<NotificationCenterCategory, 'all'>,
  NotificationType[]
> = {
  ai_parse: ['parse_done', 'parse_failed'],
  backup_export: ['backup_done', 'backup_failed', 'export_done'],
  consistency_foreshadow: [
    'consistency_issue',
    'foreshadow_reminder',
    'foreshadow_warning',
    'snapshot_expire',
    'recycle_expire',
  ],
  system: ['storage_warning', 'storage_critical', 'system_announcement'],
}
```

## 结构说明

### 用户设置对象
- `UserSettings` 是用户级唯一事实来源，对所有项目生效。
- `preferences` 覆盖外观、编辑器和音效偏好；V1 语言固定为 `zh-CN`。
- `notifications` 管理通知类型级别的渠道开关；V1 中 `inApp` 永远为 `true`。
- `aiGlobal` 代表 `US-4.8` 的用户级默认值，不替代项目级或单次操作级覆盖。

### 通知对象
- `Notification.type` 必须来自统一枚举，供设置页、通知中心和推送系统共用。
- `actionTarget` 用于 FE 跳转相关上下文，不同通知类型可以落到不同页面或下载地址。
- 保留期固定为 `90 天`；分页读取默认每页 `20` 条。

### 存储使用明细
- `StorageUsage.total` 和 `StorageUsage.used` 使用字节数，前端自行格式化为 `MB / GB`。
- `breakdown` 的五个分类与存储页图表一一对应，不能在 FE 端二次推导。
- `projects` 用于“分项目明细”，默认按 `used` 倒序返回。

### 快捷键配置
- `ShortcutConfig.actionId` 是跨端稳定标识，不能直接依赖展示文案做匹配。
- `defaultKeys` 是系统默认值，`currentKeys` 是用户覆盖值。
- 如需区分平台，可同时返回 `macKeys` 与 `windowsKeys`，但 `actionId` 保持不变。

## 阈值与保留规则

| 规则 | 触发条件 | 系统行为 |
| --- | --- | --- |
| 存储提示条 | 使用率 `> 80%` | 设置页展示黄色警告 |
| 存储预警通知 | 使用率 `> 90%` | 产生 `storage_warning` |
| 存储写保护 | 使用率 `>= 100%` | 阻止新增写入，仅允许删除/清理 |
| 通知保留 | 创建后 `90 天` | 自动清理过期通知 |
| 通知分页 | 每次查询 | 默认返回 `20` 条 |
| 账号冻结删除 | 提交注销后 `30 天` | 到期永久删除，期间可取消 |

## 边界提醒
- `US-6.1` 的资料、会话和注销状态不应塞进 `UserSettings.preferences`，应独立建模。
- `US-6.2` 与 `US-6.4` 共享 `UserSettings`，但通知事件本身仍使用独立的 `Notification` 记录。
- `US-6.5` 的清理建议不是静态配置，而是基于 `StorageUsage` 动态计算的派生结果。
- `US-6.6` 只消费通知记录和分类映射，不直接修改用户偏好。

## 覆盖检查
| 用户故事 | 上下文是否覆盖 | 对应契约 |
| --- | --- | --- |
| US-6.1 | 是 | `ActiveSession`、`AccountDeletionTicket` |
| US-6.2 | 是 | `UserSettings.preferences` |
| US-6.3 | 是 | `ShortcutConfig` |
| US-6.4 | 是 | `NotificationPreferences`、`NotificationType`、`UserSettings.aiGlobal` |
| US-6.5 | 是 | `StorageUsage`、`StorageBreakdown` |
| US-6.6 | 是 | `Notification`、`notificationCategoryMap` |
