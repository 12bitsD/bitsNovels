# Epic 6 Context - 用户级设置、通知与存储的数据契约

> **STATUS: FROZEN** | Date: 2026-04-11
> - Notification types (13 total): CONFIRMED
> - Category mapping: CONFIRMED
> - API contracts: CONFIRMED
> - Do NOT modify without team approval

## 目标结论
- Epic 6 需要一套跨端共享的数据契约，统一用户设置、通知事件、存储统计和快捷键配置的语义。
- `US-6.4 通知配置` 与 `US-6.6 通知中心` 的一致性关键在于：通知类型枚举只能有一个事实来源。
- Epic 6 是系统层，可排在业务 Epic 之后实现，但一旦进入开发，FE 与 BE 必须严格共用这些结构。

## 防漂移主声明
- `NotificationType` 的唯一来源是本文件「核心类型」章节中的同名定义。
- `US-6.4` 与 `US-6.6` 只能引用该定义，禁止在 `be.md`、`fe.md`、前端状态层、后端路由层重复声明本地枚举。
- 如需新增或删除通知类型，必须在同一次变更中同步更新：`NotificationPreferenceItem.type`、`Notification.type`、`notificationCategoryMap`、通知相关测试用例。

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

// ============================================
// Notification Center API Contracts (US-6.6)
// ============================================

// GET /me/notifications - Query Parameters
interface GetNotificationsQuery {
  /** Page number for pagination (1-indexed, default: 1) */
  page?: number
  /** Items per page (default: 20, max: 50) */
  page_size?: number
  /** Filter by notification category */
  category?: NotificationCenterCategory
  /** Filter by read status */
  read?: boolean
}

// GET /me/notifications - Response
interface GetNotificationsResponse {
  /** List of notification items for current page */
  items: NotificationListItem[]
  /** Total count of notifications matching the filter */
  total: number
  /** Current page number (1-indexed) */
  page: number
  /** Current page size */
  page_size: number
  /** Whether there are more items */
  has_more: boolean
}

// GET /me/notifications/unread-count - Response
interface GetUnreadCountResponse {
  count: number
}

// POST /me/notifications/{id}/read - Path Parameter: id (string)
// POST /me/notifications/{id}/read - Response: 204 No Content

// POST /me/notifications/read-all - Request Body (optional filters)
interface ReadAllNotificationsRequest {
  /** Only mark as read notifications in these categories */
  categories?: NotificationCenterCategory[]
}

// POST /me/notifications/read-all - Response
interface ReadAllNotificationsResponse {
  /** Number of notifications marked as read */
  count: number
}

// DELETE /me/notifications/{id} - Path Parameter: id (string)
// DELETE /me/notifications/{id} - Response: 204 No Content

// DELETE /me/notifications?scope=read - Query Parameters
// scope=read: Delete all read notifications
// DELETE /me/notifications?scope=read - Response
interface DeleteNotificationsResponse {
  /** Number of notifications deleted */
  count: number
}

// Notification List Item (for notification center dropdown)
interface NotificationListItem {
  id: string
  type: NotificationType
  title: string
  /** Short summary or preview */
  body: string
  /** Associated project name (for display) */
  projectName?: string
  read: boolean
  createdAt: string
  actionTarget?: NotificationActionTarget
}
```

## 统一错误响应（US-6.1 ~ US-6.6）

```typescript
interface ErrorResponse {
  code: ErrorCode
  message: string
  details?: Record<string, string[]>
  requestId: string
}

type ErrorCode =
  // 通用
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  // US-6.1 用户资料与账号安全
  | 'PROFILE_NICKNAME_TOO_LONG'
  | 'PROFILE_PEN_NAME_TOO_LONG'
  | 'PASSWORD_INCORRECT'
  | 'PASSWORD_WEAK'
  | 'SESSION_REVOKE_SELF_FORBIDDEN'
  | 'ACCOUNT_DELETION_ALREADY_SCHEDULED'
  | 'ACCOUNT_DELETION_NOT_SCHEDULED'
  // US-6.2 界面偏好
  | 'SETTINGS_FONT_SIZE_OUT_OF_RANGE'
  | 'SETTINGS_LINE_SPACING_INVALID'
  | 'SETTINGS_THEME_INVALID'
  | 'TEMPLATE_SERVICE_UNAVAILABLE'
  // US-6.3 快捷键
  | 'SHORTCUT_ACTION_NOT_FOUND'
  | 'SHORTCUT_KEY_INVALID'
  | 'SHORTCUT_CONFLICT'
  // US-6.4 通知配置与推送
  | 'NOTIFICATION_TYPE_UNSUPPORTED'
  | 'PUSH_PERMISSION_DENIED'
  | 'PUSH_SUBSCRIPTION_NOT_FOUND'
  // US-6.6 通知中心
  | 'NOTIFICATION_NOT_FOUND'
  | 'NOTIFICATION_CATEGORY_INVALID'
  | 'NOTIFICATION_SCOPE_INVALID'
```

## US-6.1 ~ US-6.4 API 契约（结构 + 错误码）

### US-6.1 用户资料管理

```typescript
// GET /me/profile
interface GetProfileResponse {
  userId: string
  nickname: string
  penName: string
  avatarUrl?: string
  deletionStatus: 'normal' | 'scheduled'
  scheduledDeleteAt?: string
}

// PATCH /me/profile
interface UpdateProfileRequest {
  nickname?: string // max 20
  penName?: string // max 20
  avatarUrl?: string
}

// POST /me/password/change
interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}
// POST /me/password/change - Response: 204 No Content

type ConnectionProvider = 'google' | 'github'

interface AccountConnection {
  provider: ConnectionProvider
  connected: boolean
  connectedAt?: string
  emailMasked?: string
}

// GET /me/connections
interface GetConnectionsResponse {
  items: AccountConnection[]
}

// POST /me/connections/{provider} - Path Parameter: provider (ConnectionProvider)
// POST /me/connections/{provider} - Response: 204 No Content

// DELETE /me/connections/{provider} - Path Parameter: provider (ConnectionProvider)
// DELETE /me/connections/{provider} - Response: 204 No Content

// GET /me/sessions
interface GetSessionsResponse {
  items: ActiveSession[]
}

// DELETE /me/sessions/{sessionId} - Path Parameter: sessionId (string)
// DELETE /me/sessions/{sessionId} - Response: 204 No Content

// POST /me/deletion
interface ScheduleDeletionRequest {
  password: string
}

interface ScheduleDeletionResponse {
  status: 'scheduled'
  scheduledDeleteAt: string
}

// DELETE /me/deletion - Response: 204 No Content
```

US-6.1 关键错误码：
- `PROFILE_NICKNAME_TOO_LONG`、`PROFILE_PEN_NAME_TOO_LONG`
- `PASSWORD_INCORRECT`、`PASSWORD_WEAK`
- `SESSION_REVOKE_SELF_FORBIDDEN`
- `ACCOUNT_DELETION_ALREADY_SCHEDULED`、`ACCOUNT_DELETION_NOT_SCHEDULED`

### US-6.2 界面偏好设置

```typescript
// GET /me/settings -> Response: UserSettings

// PATCH /me/settings
interface PatchUserSettingsRequest {
  preferences?: Partial<UserSettings['preferences']>
  aiGlobal?: Partial<UserSettings['aiGlobal']>
}
```

US-6.2 关键错误码：
- `SETTINGS_FONT_SIZE_OUT_OF_RANGE`
- `SETTINGS_LINE_SPACING_INVALID`
- `SETTINGS_THEME_INVALID`
- `TEMPLATE_SERVICE_UNAVAILABLE`

### US-6.3 快捷键配置

```typescript
// PATCH /me/settings/shortcuts
interface PatchShortcutsRequest {
  mode: 'single' | 'batch'
  items: Array<{
    actionId: string
    currentKeys: string[]
  }>
}

// POST /me/settings/shortcuts/reset
interface ResetShortcutsRequest {
  actionId?: string
  scope?: 'all'
}
```

US-6.3 关键错误码：
- `SHORTCUT_ACTION_NOT_FOUND`
- `SHORTCUT_KEY_INVALID`
- `SHORTCUT_CONFLICT`

### US-6.4 通知配置

```typescript
// GET /me/notification-preferences -> Response: NotificationPreferences

// PATCH /me/notification-preferences
interface PatchNotificationPreferencesRequest {
  muteAll?: boolean
  items?: Array<{
    type: NotificationType
    browserPush: boolean
  }>
}

// POST /me/push-subscriptions
interface CreatePushSubscriptionRequest {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

// DELETE /me/push-subscriptions/{subscriptionId} - Path Parameter: subscriptionId (string)
// DELETE /me/push-subscriptions/{subscriptionId} - Response: 204 No Content
```

US-6.4 关键错误码：
- `NOTIFICATION_TYPE_UNSUPPORTED`
- `PUSH_PERMISSION_DENIED`
- `PUSH_SUBSCRIPTION_NOT_FOUND`
- `VALIDATION_ERROR`

### US-6.6 通知中心

US-6.6 关键错误码：
- `NOTIFICATION_NOT_FOUND`
- `NOTIFICATION_CATEGORY_INVALID`
- `NOTIFICATION_SCOPE_INVALID`
- `VALIDATION_ERROR`

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
- `US-6.4` 与 `US-6.6` 共享 `NotificationType` + `notificationCategoryMap`，任何一侧禁止单独扩展类型。

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
