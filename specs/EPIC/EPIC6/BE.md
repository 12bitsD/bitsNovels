# Epic 6 BE 拆分 - 后端聚焦用户级设置持久化、通知事件与存储治理

## 目标结论
- Epic 6 是系统层能力，和具体写作业务解耦，可以在核心创作链路稳定后集中落地。
- 后端需要提供一套统一的用户级设置中心，负责资料、偏好、快捷键、通知、AI 默认值的持久化。
- `US-6.4` 与 `US-6.6` 必须共享同一套通知事件类型、筛选分类和保留策略，否则通知配置与通知中心会出现语义漂移。

## 边界定义
- `US-6.1 用户资料管理`：资料读写、密码修改、第三方绑定、会话查询与撤销、账号注销冻结。
- `US-6.2 界面偏好设置`：用户级偏好存储、即时更新、导出模板管理入口复用 Epic 5 模板服务。
- `US-6.3 快捷键配置`：快捷键配置读写、冲突校验、默认值恢复。
- `US-6.4 通知配置`：通知偏好、浏览器推送订阅、全部静音、AI 全局默认值。
- `US-6.5 存储管理`：配额计算、分类汇总、分项目聚合、清理建议、满额写保护。
- `US-6.6 通知中心`：通知事件落库、分页查询、已读/删除、90 天清理、上下文跳转信息。

## US-6.1 用户资料管理

### 用户资料 API
- `GET /me/profile`：返回昵称、笔名、头像、冻结状态等当前资料。
- `PATCH /me/profile`：更新昵称、笔名、头像资源引用；校验昵称与笔名长度 `<= 20`。
- 头像上传建议复用媒体服务，先拿上传地址，再回写裁剪后的资源 URL。

### 账号安全 API
- `POST /me/password/change`：校验旧密码、密码规则、确认字段一致性。
- `GET /me/connections`：返回 `Google / GitHub` 当前绑定状态。
- `POST /me/connections/{provider}` 与 `DELETE /me/connections/{provider}`：完成绑定和解绑。

### 会话管理
- `GET /me/sessions`：返回当前账号所有活跃会话，包含设备、浏览器、最近活跃时间、当前会话标记。
- `DELETE /me/sessions/{sessionId}`：注销指定其他设备会话；不得允许误杀当前会话，除非显式支持“退出当前设备”。
- 会话表需要保留最近心跳时间，便于前端展示“活跃中”与排序。

### 注销与冻结期
- `POST /me/deletion`：提交密码后二次确认，生成 `30 天后删除` 的注销工单。
- `DELETE /me/deletion`：冻结期内恢复账号，取消计划删除。
- 定时任务在到期后执行数据永久清理；冻结期内账号禁止正常写入，但允许恢复登录和取消注销。

## US-6.2 界面偏好设置

### 用户级设置存储
- `GET /me/settings`：返回主题、字体、字号、行距、语言、音效、快捷键、AI 默认值等用户级配置。
- `PATCH /me/settings`：支持按字段增量更新，修改后立即生效，不要求页面刷新。
- 所有偏好以 `userId` 为主键存储，不绑定项目。

### 导出模板管理的后端边界
- “导出模板管理”在 Epic 6 只是设置页入口，底层仍复用 `US-5.3` 的模板 CRUD 服务。
- Epic 6 不新增模板数据模型，只负责把模板列表接到用户设置页里。
- 若模板服务不可用，设置页需要收到明确错误码，避免误判成普通偏好保存失败。

## US-6.3 快捷键配置

### 快捷键持久化
- 快捷键配置可以并入 `UserSettings.shortcuts`，也可以独立表存储后聚合到设置接口。
- 每条记录至少保存 `功能标识 / 默认组合键 / 当前组合键 / 分组`。
- `PATCH /me/settings/shortcuts` 需要支持单条更新和整组覆盖两种写法。

### 冲突校验与恢复默认
- 后端在写入时仍要做冲突校验，避免多端并发修改导致重复占用。
- `POST /me/settings/shortcuts/reset`：支持按 action reset，或 `scope=all` 全量恢复默认。
- 速查浮窗无需独立接口，可直接消费快捷键列表中的高频动作。

## US-6.4 通知配置

### 通知偏好 API
- `GET /me/notification-preferences`：返回每种通知类型的站内通知和浏览器推送配置，以及 `muteAll`。
- `PATCH /me/notification-preferences`：允许批量更新浏览器推送开关；站内通知在 V1 固定为开启。
- `muteAll=true` 时，服务端写入所有类型的 `browserPush=false`，但不删除站内通知规则。

### 浏览器推送订阅
- `POST /me/push-subscriptions`：保存浏览器推送订阅信息。
- `DELETE /me/push-subscriptions/{subscriptionId}`：用户关闭推送或更换设备时注销订阅。
- 推送分发前必须同时检查用户偏好、浏览器订阅有效性和 `muteAll` 状态。

### AI 全局偏好
- `PATCH /me/settings` 或 `PATCH /me/ai-preferences`：保存默认模型、Temperature、默认生成长度、默认解析深度。
- 这些值是 `US-4.8` 的用户级覆盖层，项目设置和局部操作可以继续覆盖。

## US-6.5 存储管理

### 配额与聚合
- `GET /me/storage`：返回总配额、总已用、分类明细、分项目明细。
- 聚合口径至少覆盖 `正文 / 知识库 / 快照 / 备份 / 回收站` 五类。
- 分项目列表按已用空间降序返回，方便前端直接展示。

### 清理建议与执行
- `GET /me/storage/recommendations`：返回建议项、可释放空间、对象数量、详情摘要。
- `POST /me/storage/cleanup`：执行确认后的批量清理，支持 `old_snapshots / expired_backups / recycle_bin` 等策略。
- 每项建议都要返回可回收明细，避免前端只能展示模糊数字。

### 阈值规则
- 使用率 `> 80%`：返回 warning 状态，供前端显示黄条。
- 使用率 `> 90%`：创建 `storage_warning` 通知。
- 使用率 `>= 100%`：创建 `storage_critical` 通知，并对新增写入加统一拦截；删除与清理操作继续允许。

## US-6.6 通知中心

### 通知 API
- `GET /me/notifications`：支持按分类、类型、已读状态分页查询，默认每页 20 条。
- `POST /me/notifications/{id}/read`：单条标记已读。
- `POST /me/notifications/read-all`：全部标记已读。
- `DELETE /me/notifications/{id}`：删除单条通知。
- `DELETE /me/notifications?scope=read`：清空所有已读通知。

### 通知事件模型
- 每条通知至少包含 `type / title / body / read / createdAt / projectId / actionTarget`。
- 需要支持 `导出完成跳下载链接`、`一致性问题跳面板`、`存储预警跳存储页` 这类上下文跳转。
- `US-6.4` 的通知偏好与 `US-6.6` 的通知中心必须共用同一套 `NotificationType` 枚举。

### 保留与清理
- 通知保留 `90 天`，通过定时任务自动清理过期记录。
- 未读数接口可以和列表接口合并返回，也可以做独立轻量接口 `GET /me/notifications/unread-count`。
- 历史分页建议使用 cursor 或基于 `createdAt + id` 的稳定排序，避免滚动加载重复数据。

## 推荐模块划分
- `user-profile-service`：资料、头像、密码、第三方绑定。
- `session-service`：活跃会话查询、会话撤销、当前设备识别。
- `user-settings-service`：主题、音效、快捷键、AI 默认值持久化。
- `notification-preference-service`：通知类型配置、全部静音、推送订阅校验。
- `notification-center-service`：事件入库、列表查询、已读/删除、保留清理。
- `storage-usage-service`：配额聚合、阈值判定、清理建议、满额写保护。
- `account-deletion-scheduler`：冻结期到期删除和恢复逻辑。

## 覆盖检查
| 用户故事 | BE 是否覆盖 | BE 关注点 |
| --- | --- | --- |
| US-6.1 | 是 | 资料 API、密码修改、第三方绑定、活跃会话、30 天冻结删除 |
| US-6.2 | 是 | 用户级偏好持久化、即时更新、复用 Epic 5 模板服务 |
| US-6.3 | 是 | 快捷键存储、冲突校验、默认值恢复 |
| US-6.4 | 是 | 通知偏好、推送订阅、全部静音、AI 用户级默认值 |
| US-6.5 | 是 | 配额聚合、清理建议、80/90/100 阈值、写入拦截 |
| US-6.6 | 是 | 通知 API、事件落库、分页、90 天清理、上下文跳转 |
