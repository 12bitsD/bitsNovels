# Epic 1 · 项目管理 · 后端

## US-1.1 用户注册与登录

**依赖**：无

### AC#1 注册方式

#### API

`POST /api/auth/register`
- Request: `{ email, password }`
- Response: `{ ok, user?, verificationSent?, error? }`
- 业务逻辑：校验邮箱格式与唯一性、密码强度 -> 创建用户（`emailVerified = false`）-> 生成 24 小时邮箱验证 token -> 发送验证邮件。

`POST /api/auth/verify-email`
- Request: `{ token }`
- Response: `{ ok, user?, expired?, error? }`
- 业务逻辑：校验 token 是否存在、是否过期、是否已使用 -> 将用户标记为已验证 -> 作废当前验证 token。

`POST /api/auth/resend-verification`
- Request: `{ email }` 或基于当前 session 推断用户
- Response: `{ ok, resentAt?, error? }`
- 业务逻辑：对重发行为做限流 -> 重新生成 24 小时 token -> 发送新的验证邮件。

### AC#2 第三方登录

#### API

`GET /api/auth/oauth/:provider/start`
- Request: provider = `google` | `github`
- Response: 302 跳转到 OAuth 授权页
- 业务逻辑：校验 provider -> 生成 `state` -> 记录防重放信息 -> 跳转第三方授权页。

`GET /api/auth/oauth/:provider/callback`
- Request: OAuth `code` + `state`
- Response: 302 跳转前端并附带登录结果
- 业务逻辑：校验 `state` -> 用 `code` 换取第三方用户信息 -> 首次登录自动创建账号 -> 默认昵称取第三方昵称 -> 若同邮箱已有账号则自动绑定 -> 创建登录 session。

### AC#3 登录与会话

#### API

`POST /api/auth/login`
- Request: `{ email, password, rememberMe }`
- Response: `{ token, user, expiresAt, emailVerified }`
- 业务逻辑：校验邮箱密码 -> 允许未验证邮箱用户登录，但在响应中返回 `emailVerified` -> 按 `rememberMe` 生成 30 天或 24 小时 session/token。

`POST /api/auth/logout`
- Request: `{}`
- Response: `{ ok }`
- 业务逻辑：作废当前 session/token，并清除服务端会话记录。

### AC#4 找回密码

#### API

`POST /api/auth/forgot-password`
- Request: `{ email }`
- Response: `{ ok }`
- 业务逻辑：统一返回成功文案避免邮箱枚举；若邮箱存在则生成 1 小时重置 token 并发送邮件。

`POST /api/auth/reset-password`
- Request: `{ token, newPassword }`
- Response: `{ ok, error? }`
- 业务逻辑：校验 token 与新密码强度 -> 更新密码哈希 -> 使该用户所有已登录设备会话失效 -> 作废重置 token。

---

## US-1.2 项目列表与仪表盘

**依赖**：US-1.1

### AC#1 项目列表

#### API

`GET /api/projects`
- Query: `{ sort?, type?, status?, search?, view? }`
- Response: `{ items: ProjectListItem[], total }`
- 业务逻辑：仅返回当前用户项目；默认按 `updatedAt desc` 排序；每条项目包含封面色块、类型、总字数、章节数、最后编辑时间、`lastEditedChapterId`。

### AC#2 排序与筛选

#### API

`GET /api/projects`
- Query: `sort=updatedAt|createdAt|name|totalChars`，`type=novel|medium|short`，`status=active|archived`，`search=关键词`
- Response: `{ items, total }`
- 业务逻辑：支持项目名称模糊搜索、按状态与类型过滤、按 4 类字段排序；搜索与筛选条件同时生效。

### AC#3 快捷操作

#### API

`GET /api/projects/:projectId`
- Response: `{ project, lastEditedChapterId, permissions }`
- 业务逻辑：校验项目归属；返回项目基本信息与最近编辑章节，供前端直接跳转工作台。

`POST /api/projects/:projectId/archive`
- Request: `{}`
- Response: `{ ok, status: "archived" }`
- 业务逻辑：将项目状态标记为归档，并写入归档时间。

`DELETE /api/projects/:projectId`
- Request: `{ confirmationName }`
- Response: `{ ok }`
- 业务逻辑：校验项目名确认值后执行永久删除，级联移除项目正文、知识库、快照、备份等数据。

### AC#4 空状态

#### API

`GET /api/projects`
- Response: `{ items: [], total: 0 }`
- 业务逻辑：无项目时返回空数组，不返回异常。

---

## US-1.3 创建新项目

**依赖**：US-5.4（知识库模板导出）

### AC#1 创建流程（分步表单）

#### API

`POST /api/kb-template-imports/preview`
- Request: `multipart/form-data`，字段 `{ file }`
- Response: `{ importToken, totalEntries, countsByType, fileSize }`
- 业务逻辑：校验文件必须为 JSON 且不超过 20MB -> 解析模板 -> 返回总条目数与按类型分布，用于前端预览与勾选。

`POST /api/projects`
- Request: `{ name, type, tags, description?, structureMode, templateId?, kbImport? }`
- Response: `{ projectId, defaultVolumeId, firstChapterId, importedEntryCount }`
- 业务逻辑：校验项目字段 -> 检查同一用户下名称唯一 -> 创建项目 -> 按空白项目或模板创建卷章骨架 -> 若存在 `kbImport`，按勾选类型复制知识库条目，所有新条目生成新 ID 并标记 `source = template_import`。

### AC#2 校验

#### API

`POST /api/projects`
- 关键校验：项目名称 `trim` 后长度必须 >= 1 且 <= 50；同一用户下不可重名；标签最多 5 个；简介最多 500 字。
- 错误响应：`{ ok: false, error: "PROJECT_NAME_DUPLICATED" }`
- 业务逻辑：所有校验在创建事务开始前完成；任一失败直接返回，不创建半成品项目。

---

## US-1.4 项目设置

**依赖**：US-1.3

### AC#1 设置入口

#### API

`GET /api/projects/:projectId/settings`
- Response: `{ project, stats, tabs }`
- 业务逻辑：返回基本信息、只读统计信息，以及可用的设置 Tab 元数据。

### AC#2 基本信息 Tab

#### API

`PATCH /api/projects/:projectId`
- Request: `{ name, type, tags, description? }`
- Response: `{ ok, project, stats, error? }`
- 业务逻辑：复用 US-1.3 的字段校验规则；更新项目基本信息；返回最新统计数据供前端刷新。

### AC#3 危险操作区

#### API

`DELETE /api/projects/:projectId`
- Request: `{ confirmationName }`
- Response: `{ ok, deletedProjectId }`
- 业务逻辑：校验项目归属与确认名称完全匹配 -> 永久删除项目 -> 级联清理正文、知识库、版本快照、备份文件 -> 返回删除结果。

---

## US-1.5 卷章目录管理

**依赖**：US-1.3

### AC#1 卷管理

#### API

`GET /api/projects/:projectId/outline`
- Response: `{ volumes, totals, updatedAt }`
- 业务逻辑：返回卷章树、卷级统计、全书统计，供大纲视图与章节面板共享。

`POST /api/projects/:projectId/volumes`
- Request: `{ name }`
- Response: `{ volume }`
- 业务逻辑：校验卷名必填且 <= 30 字；插入到末尾并返回新卷。

`PATCH /api/projects/:projectId/volumes/:volumeId`
- Request: `{ name?, description? }`
- Response: `{ volume }`
- 业务逻辑：支持修改卷名与卷简介；简介最大 500 字。

`DELETE /api/projects/:projectId/volumes/:volumeId`
- Response: `{ ok, trashedChapterCount }`
- 业务逻辑：删除卷时，如果存在章节，则将卷与其下章节一起移入项目回收站，而不是直接永久删除。

`POST /api/projects/:projectId/outline/reorder-volumes`
- Request: `{ volumeIds: string[] }`
- Response: `{ ok }`
- 业务逻辑：按前端提交的新顺序重排所有卷，保证排序字段连续。

### AC#2 卷内章节操作

#### API

`POST /api/projects/:projectId/volumes/:volumeId/chapters`
- Request: `{ title }`
- Response: `{ chapter }`
- 业务逻辑：校验章节标题必填且 <= 50 字；创建到指定卷末尾。

`PATCH /api/projects/:projectId/chapters/:chapterId`
- Request: `{ title?, volumeId?, position? }`
- Response: `{ chapter }`
- 业务逻辑：支持重命名、跨卷移动、顺序调整。

`POST /api/projects/:projectId/chapters/reorder`
- Request: `{ chapterIds, targetVolumeId }`
- Response: `{ ok }`
- 业务逻辑：处理拖拽排序与跨卷重排，统一更新位置索引。

`POST /api/projects/:projectId/chapters/bulk-move`
- Request: `{ chapterIds, targetVolumeId }`
- Response: `{ ok, movedCount }`
- 业务逻辑：批量将章节移动到指定卷，事务内更新卷 ID 与顺序。

`POST /api/projects/:projectId/chapters/bulk-trash`
- Request: `{ chapterIds }`
- Response: `{ ok, trashedCount }`
- 业务逻辑：批量将章节移入项目回收站，并记录原卷与原位置。

### AC#3 统计信息

#### API

`GET /api/projects/:projectId/outline`
- Response: 每个卷包含 `{ chapterCount, totalChars }`，每个章节包含 `{ chars, lastEditedAt }`，根节点包含 `{ volumeCount, chapterCount, totalChars }`
- 业务逻辑：聚合卷、章节、全书统计，随结构变化实时重算。

### AC#4 与写作工作台章节面板的数据同步

#### API

`GET /api/projects/:projectId/events`
- Response: SSE / WebSocket 事件流
- 业务逻辑：将卷章增删改排序事件广播到所有打开中的客户端；US-1.5 与 US-3.2 共享同一数据源和同步事件。

---

## US-1.6 写作目标设定

**依赖**：US-1.4

### AC#1 目标类型

#### API

`GET /api/projects/:projectId/goals`
- Response: `{ dailyWordTarget?, totalWordTarget?, deadline? }`
- 业务逻辑：返回当前项目已设置的目标；未设置时返回空值。

`PUT /api/projects/:projectId/goals`
- Request: `{ dailyWordTarget?, totalWordTarget?, deadline? }`
- Response: `{ ok, goals }`
- 业务逻辑：校验每日目标 100~50000、总字数目标 1000~5000000、截止日期晚于今天；支持部分更新。

`DELETE /api/projects/:projectId/goals`
- Response: `{ ok }`
- 业务逻辑：清除所有目标配置，但不删除历史写作统计数据。

### AC#2 进度展示

#### API

`GET /api/projects/:projectId/writing-stats?range=30d`
- Response: `{ today, trend30d, totalProgress, estimatedCompletionDate }`
- 业务逻辑：根据章节字数变化与写作历史计算今日进度、近 30 天趋势、总进度、基于近 7 天日均速度的预计完成日期。

### AC#3 灵活性

#### API

`PUT /api/projects/:projectId/goals`
- 业务逻辑：目标修改后立即重算依赖目标的统计结果。

`DELETE /api/projects/:projectId/goals`
- 业务逻辑：清除目标后隐藏目标进度，但保留历史统计原始数据。

---

## US-1.7 回收站

**依赖**：US-1.5、US-3.2

### AC#1 回收站入口与展示

#### API

`GET /api/projects/:projectId/trash`
- Response: `{ items: TrashItem[], total, trashStorageMB }`
- 业务逻辑：按删除时间倒序返回项目回收站条目，并附带剩余保留天数与存储占用。

### AC#2 章节删除与恢复

#### API

`POST /api/projects/:projectId/trash/:itemId/restore`
- Response: `{ ok, restoredToVolumeId, restoredToPosition, fallbackToDefaultVolume }`
- 业务逻辑：按原卷原位置恢复章节及其版本快照；若原卷不存在，则恢复到默认卷末尾并返回 fallback 标记。

### AC#3 保留策略与到期提醒

#### API

`GET /api/projects/:projectId/trash`
- Response: 每项包含 `{ deletedAt, expiresAt, remainingDays }`
- 业务逻辑：统一保留 30 天；后台定时任务在到期前 3 天写入通知中心提醒；到期后自动永久删除。

### AC#4 手动永久删除

#### API

`DELETE /api/projects/:projectId/trash/:itemId`
- Response: `{ ok, deletedItemId }`
- 业务逻辑：永久删除单个回收站条目与其关联快照/资源，不可恢复。

`DELETE /api/projects/:projectId/trash`
- Response: `{ ok, deletedCount }`
- 业务逻辑：清空当前项目回收站，批量永久删除所有条目。

### AC#5 存储计算

#### API

`GET /api/projects/:projectId/storage`
- Response: `{ totalMB, trashMB, contentMB, backupMB }`
- 业务逻辑：将回收站占用单独统计，供 US-6.5 页面展示“回收站占用：{X} MB”。

---

## US-1.8 项目归档

**依赖**：US-1.4

### AC#1 归档操作

#### API

`POST /api/projects/:projectId/archive`
- Request: `{}`
- Response: `{ ok, status: "archived", archivedAt }`
- 业务逻辑：将项目状态设为 `archived`；默认项目列表隐藏；写入只读标记，供编辑器切换只读模式。

### AC#2 取消归档

#### API

`POST /api/projects/:projectId/unarchive`
- Request: `{}`
- Response: `{ ok, status: "active" }`
- 业务逻辑：恢复项目为 `active`，重新允许编辑。

### AC#3 数据保留

#### API

`GET /api/projects/:projectId`
- Response: `{ project, readOnly, backupStatus }`
- 业务逻辑：归档不会删除正文、知识库、快照、备份；归档时暂停自动备份调度，取消归档后恢复自动备份。

---

## US-1.9 导入已有作品

**依赖**：US-1.3、US-2.1

### AC#1 支持格式

#### API

`POST /api/manuscript-imports/preview`
- Request: `multipart/form-data`，字段 `{ file, encoding? }`
- Response: `{ importSessionId, detectedEncoding?, requiresEncodingSelection, chaptersPreview, ignoredElements, totalChars }`
- 业务逻辑：仅接受 TXT、DOCX 且文件 <= 20MB；自动检测 UTF-8 / GBK / GB2312；无法识别时返回 `requiresEncodingSelection = true`。

### AC#2 章节智能拆分

#### API

`POST /api/manuscript-imports/preview`
- 章节拆分逻辑：基于“第 X 章”“Chapter X”等模式与连续空行做启发式拆分；若未识别到分隔符，则返回单章预览。
- Response: 每章返回 `{ tempId, title, previewText, startOffset, endOffset }`
- 业务逻辑：前端可在确认前提交调整后的章节列表，后端以最终确认数据为准导入。

### AC#3 导入目标

#### API

`POST /api/manuscript-imports/confirm`
- Request: `{ importSessionId, mode, projectDraft?, targetVolumeId?, chapters, parseAfterImport }`
- Response: `{ projectId, volumeId, importedChapterCount, report, parserBatchId? }`
- 业务逻辑：`mode = "newProject"` 时复用创建项目逻辑；`mode = "existingProject"` 时将章节追加到目标卷末尾。

### AC#4 导入后衔接 Parser 解析

#### API

`POST /api/manuscript-imports/confirm`
- 解析衔接逻辑：当 `parseAfterImport = true` 时，将导入章节按章节序号顺序加入 Parser 队列，复用 US-2.1 的队列和通知机制。
- Response: `{ parserBatchId, parserQueuedCount }`
- 业务逻辑：解析异步后台执行，不阻塞导入完成响应；通知中心写入批量进度。

### AC#5 格式处理

#### API

`POST /api/manuscript-imports/confirm`
- 导入结果：保留段落分隔、加粗、斜体；忽略表格、图片、复杂排版。
- Response: `{ report: { totalChars, chapterCount, ignoredElements } }`
- 业务逻辑：导入后生成统一导入报告，明确列出被忽略的格式元素，便于前端展示。
