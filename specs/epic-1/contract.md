# Epic 1 · context（FE + BE 共享）

## 用户对象

```typescript
type AuthProvider = 'email' | 'google' | 'github'

interface User {
  id: string
  email: string
  nickname: string
  penName?: string
  avatarUrl?: string
  authProvider: AuthProvider
  emailVerified: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}
```

## 会话对象

```typescript
interface Session {
  token: string
  userId: string
  expiresAt: string // ISO 8601
  rememberMe: boolean
}
```

## 项目对象

```typescript
type ProjectType = 'novel' | 'medium' | 'short'
type ProjectStatus = 'active' | 'archived'
type ProjectTag =
  | '玄幻'
  | '都市'
  | '科幻'
  | '历史'
  | '言情'
  | '悬疑'
  | '其他'

interface Project {
  id: string
  ownerId: string
  name: string
  type: ProjectType
  tags: ProjectTag[]
  description?: string
  status: ProjectStatus
  coverColor: string
  totalChars: number
  volumeCount: number
  chapterCount: number
  kbEntryCount: number
  lastEditedChapterId?: string
  readOnly: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  archivedAt?: string // ISO 8601
}
```

## 卷章与统计对象

```typescript
interface Volume {
  id: string
  projectId: string
  name: string
  description?: string
  order: number
  chapterCount: number
  totalChars: number
}

interface ChapterSummary {
  id: string
  projectId: string
  volumeId: string
  title: string
  order: number
  chars: number
  lastEditedAt?: string // ISO 8601
  parserStatus: 'parsed' | 'processing' | 'pending' | 'empty' | 'failed'
}

interface OutlineTotals {
  volumeCount: number
  chapterCount: number
  totalChars: number
}
```

## 写作目标与统计对象

```typescript
interface WritingGoal {
  dailyWordTarget?: number
  totalWordTarget?: number
  deadline?: string // YYYY-MM-DD
}

interface DailyWritingPoint {
  date: string // YYYY-MM-DD
  writtenChars: number
}

interface WritingStats {
  todayWrittenChars: number
  todayTarget?: number
  todayProgressPercent?: number
  totalWrittenChars: number
  totalTarget?: number
  totalProgressPercent?: number
  trend30d: DailyWritingPoint[]
  estimatedCompletionDate?: string // YYYY-MM-DD
}
```

## 回收站对象

```typescript
type TrashItemType = 'chapter' | 'volume'

interface TrashItem {
  id: string
  projectId: string
  type: TrashItemType
  title: string
  originalVolumeId?: string
  originalVolumeName?: string
  originalPosition?: number
  chars: number
  deletedAt: string // ISO 8601
  expiresAt: string // ISO 8601
  remainingDays: number
  snapshotCount: number
}
```

## 导入对象

```typescript
type SupportedEncoding = 'UTF-8' | 'GBK' | 'GB2312'

interface ImportPreviewChapter {
  tempId: string
  title: string
  previewText: string
  startOffset: number
  endOffset: number
}

interface ManuscriptImportPreview {
  importSessionId: string
  fileName: string
  fileType: 'txt' | 'docx'
  fileSize: number
  detectedEncoding?: SupportedEncoding
  requiresEncodingSelection: boolean
  chaptersPreview: ImportPreviewChapter[]
  totalChars: number
  ignoredElements: string[]
}

interface ImportReport {
  totalChars: number
  chapterCount: number
  ignoredElements: string[]
}
```

## 通知对象

```typescript
interface NotificationItem {
  id: string
  type: 'trash_expiring' | 'parser_batch_progress' | 'parser_failed'
  title: string
  message: string
  read: boolean
  createdAt: string // ISO 8601
  metadata?: Record<string, string | number | boolean>
}
```

## API 端点

| Method | Path | 用途 |
|---|---|---|
| POST | /api/auth/register | 邮箱注册 |
| POST | /api/auth/verify-email | 验证邮箱链接 |
| POST | /api/auth/resend-verification | 重新发送验证邮件 |
| GET | /api/auth/oauth/:provider/start | 发起 Google / GitHub OAuth |
| GET | /api/auth/oauth/:provider/callback | OAuth 回调登录 / 绑定账号 |
| POST | /api/auth/login | 邮箱密码登录 |
| POST | /api/auth/logout | 登出并销毁当前会话 |
| POST | /api/auth/forgot-password | 发送重置密码邮件 |
| POST | /api/auth/reset-password | 使用 token 重置密码 |
| GET | /api/projects | 获取项目列表、排序、筛选、搜索 |
| POST | /api/projects | 创建项目（空白 / 模板 / 带知识库导入） |
| GET | /api/projects/:projectId | 获取项目详情与最近编辑章节 |
| GET | /api/projects/:projectId/settings | 获取项目设置页数据 |
| PATCH | /api/projects/:projectId | 更新项目基本信息 |
| DELETE | /api/projects/:projectId | 永久删除项目 |
| POST | /api/projects/:projectId/archive | 归档项目 |
| POST | /api/projects/:projectId/unarchive | 取消归档 |
| GET | /api/projects/:projectId/outline | 获取卷章树与统计 |
| POST | /api/projects/:projectId/volumes | 新建卷 |
| PATCH | /api/projects/:projectId/volumes/:volumeId | 修改卷名 / 简介 |
| DELETE | /api/projects/:projectId/volumes/:volumeId | 删除卷并移入回收站 |
| POST | /api/projects/:projectId/outline/reorder-volumes | 卷排序 |
| POST | /api/projects/:projectId/volumes/:volumeId/chapters | 在指定卷下新建章节 |
| PATCH | /api/projects/:projectId/chapters/:chapterId | 修改章节标题 / 所属卷 / 顺序 |
| POST | /api/projects/:projectId/chapters/reorder | 拖拽排序 / 跨卷移动章节 |
| POST | /api/projects/:projectId/chapters/bulk-move | 批量移动章节 |
| POST | /api/projects/:projectId/chapters/bulk-trash | 批量删除章节到回收站 |
| GET | /api/projects/:projectId/events | 卷章与工作台实时同步事件流 |
| GET | /api/projects/:projectId/goals | 获取写作目标 |
| PUT | /api/projects/:projectId/goals | 保存 / 更新写作目标 |
| DELETE | /api/projects/:projectId/goals | 清除写作目标 |
| GET | /api/projects/:projectId/writing-stats?range=30d | 获取今日进度、趋势图、总进度 |
| GET | /api/projects/:projectId/trash | 获取项目回收站列表 |
| POST | /api/projects/:projectId/trash/:itemId/restore | 恢复回收站条目 |
| DELETE | /api/projects/:projectId/trash/:itemId | 永久删除单条回收站内容 |
| DELETE | /api/projects/:projectId/trash | 清空回收站 |
| GET | /api/projects/:projectId/storage | 获取项目存储占用（含回收站） |
| POST | /api/kb-template-imports/preview | 预览知识库模板导入结果 |
| POST | /api/manuscript-imports/preview | 上传并预览 TXT / DOCX 导入结果 |
| POST | /api/manuscript-imports/confirm | 确认导入章节并可衔接 Parser |

## 重要数据验证规则

1. `email` 必须为合法邮箱格式，且在全局用户表中唯一。
2. `password` 长度至少 8 位，且必须同时包含大写字母、小写字母、数字。
3. 邮箱验证链接有效期 24 小时；重置密码链接有效期 1 小时；两类 token 都必须一次性使用。
4. 登录 `rememberMe = true` 时 session 有效期 30 天；否则 24 小时。
5. `project.name` 在 `trim` 后长度必须为 1~50，且同一用户下不可重复。
6. `project.tags` 只能从约定枚举中选择，最多 5 个。
7. `project.description`、`volume.description` 最大 500 字。
8. `volume.name` 为必填，长度 1~30；`chapter.title` 为必填，长度 1~50。
9. 写作目标中 `dailyWordTarget` 范围 100~50000，`totalWordTarget` 范围 1000~5000000，`deadline` 必须晚于今天。
10. 回收站条目默认保留 30 天；到期前 3 天写入通知提醒；到期后自动永久删除。
11. 归档项目仍保留全部数据，但 `readOnly = true`，编辑类接口需拒绝写操作或返回归档错误码。
12. 知识库模板导入文件只接受 JSON 且 <= 20MB；已有作品导入文件只接受 TXT / DOCX 且 <= 20MB。
13. 文稿导入编码仅支持 UTF-8、GBK、GB2312；识别失败时必须由前端显式选择编码后再继续。
14. 章节批量移动、批量删除、卷删除带章节时必须走事务，避免出现顺序和统计不一致。
