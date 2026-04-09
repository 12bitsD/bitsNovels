# bitsNovels · 更新日志

> 所有重大文档变更均记录于此。语义化版本号遵循 vMAJOR.MINOR.PATCH。
> 工作区脚本/门禁/工程细节变更见 `workspace/docs/CHANGELOG.md`，避免在两处重复记录同一内容。

------

## v0.3.23（2026-04-09）

### 前端收尾
#### 修正 (Fixed)
- `workspace` 根级 `npm run check` 的 `ruff` 环境阻塞已修复：根脚本会自动创建 `.venv` 并同步 `.[dev]` 依赖，CI 与本地口径一致。
- 继续推进视觉与性能收尾：修复 `App.tsx` / `StatsTable.tsx` 残留硬编码色值、补齐长列表虚拟化（KB 列表 / 通知列表 / 超大卷章节列表）。
#### 重构 (Refactored)
- 扩大 TanStack Query 试点范围：`useWritingStats` 迁移到 `useQuery`，统一请求与错误处理（复用 `fetchApi`）。

------

## v0.3.22（2026-04-09）

### 文档去重
#### 修正 (Fixed)
- 修正 `process/CONSTRAINTS.md` 的导出格式约束：V1 导出格式统一为 DOCX / TXT / PDF / Markdown（去除 EPUB）。
- 合并 `docs/FRONTEND_AC_MATRIX_2026-04-09.md` 至 `docs/FRONTEND_AUDIT_2026-04-09.md`，避免两份审计材料重复维护。
- 清理 `workspace/docs/refactor/` 中过时或重复的文档，并移除 `workspace/` 下的一次性测试输出 txt 文件。

------

## v0.3.21（2026-04-09）

### 文档同步
#### 修正 (Fixed)
- 同步 `workspace/docs/CHANGELOG.md` 与 `workspace/docs/refactor/` 文档，修正前端 check/test 描述：前端交付以 `npm run test:web`、`npm run -w @bitsnovels/web lint`、`npm run -w @bitsnovels/web typecheck` 为准。
- 补充说明 `workspace` 根级 `npm run check` 当前受 Python `ruff` 环境阻塞，暂不将该环境问题误记为前端代码失败。
- 补充最近一次 Playwright E2E 已通过的状态，明确当前结论为“核心功能链路通过”。
- 补充人工视觉走查仍有待补风险，涉及 `App.tsx`、`ProjectDashboard`、`KBLocationDetail` 与 `NotificationItem` 等模块。

------

## v0.3.20（2026-04-09）

### P2 架构优化: 引入 React Query
#### 新增 (Added)
- 引入 `@tanstack/react-query`，并在 `src/main.tsx` 中配置了全局 `QueryClientProvider`。
- 在 `src/api/client.ts` 中新增了 `fetchApi` 基础调用方法，抛出标准的异常以便 React Query 捕获。
#### 重构 (Refactored)
- 试点迁移了 `Epic-6` 的通知分页模块 (`useNotifications.ts`)，使用 `useInfiniteQuery` 和 `useQuery` 进行重写，优化了状态管理和数据缓存逻辑。
- 修复并更新了 `useNotifications.test.tsx` 及关联组件的测试，增加测试时的 `<QueryClientProvider>` 包装，测试覆盖率维持达标。

------

## v0.3.19（2026-04-09）

**变更类型：** Backend 可维护性重构 - 去重 / 解耦 / 模块化

### 后端重构

- `workspace/server/main.py` 从 838 行收敛到 327 行，认证端点拆分到 `workspace/server/routes/auth.py`，项目 CRUD 拆分到 `workspace/server/routes/projects.py`
- 请求模型统一迁移到 `workspace/server/models/request_models.py`，入口文件不再混合 schema 定义与路由处理
- 新增 `workspace/server/routes/_deps.py`，将 `_require_project` 的 11 份重复实现统一收敛为共享依赖
- 新增 `workspace/server/services/_base.py`，将 11 个 service 中重复的 `_AppProxy` / `_main_module` 样板统一抽取
- 新增 `workspace/server/utils/time_utils.py` 与 `workspace/server/utils/text_utils.py`，统一收敛 `_iso_z` 与字符统计逻辑
- 修复认证流中固定 token 硬编码问题，改为随机 token 生成
- 修复 `app.state.volumes` / `app.state.fake_db.volumes` 双存储分裂问题，统一大纲/备份/恢复/导出路径
- `parser_service.py` 新增 `DetectionResult` 与 `detect_entities()`，将实体识别与 KB 写入职责解耦
- `_reset_app_state()` 按 core/auth/export/kb/parser/editor-aux 五个领域拆分为子重置函数

### 测试

- Backend：新增 parser 解耦测试 1 个
- 全量回归：`403 passed`
- 总覆盖率：`89.46%`

### 规划更新

- `docs/SPRINT_LOG.md` 已将 `US-2.1 Parser v2 重做` 写入 Sprint 6，作为 US-2.7 / US-2.8 的前置返工项
- 该返工项仍归属 Epic 2，不新建 User Story，仅将当前规则实现与既有 AI 契约重新对齐

------

## v0.3.18（2026-04-07）

**变更类型：** Sprint 5 完成 - Epic 2 知识库实体全系 + US-1.7 回收站 + US-3.7~3.10 编辑器辅助功能

### Sprint 5 完成总结

**Backend（全部完成）：**
- US-2.1 Parser 引擎：解析触发、队列、状态机、批量解析、通知集成（8 tests, 83-87% coverage）
- US-2.2 Character：角色 CRUD、搜索、确认/批量确认、势力归属双向同步（12 tests, 82% coverage）
- US-2.3 Location：地点 CRUD、树查询、搜索筛选、解析归并（43 tests 共享, 90%+ coverage）
- US-2.4 Item：道具 CRUD、持有者历史、所有权变更追踪（43 tests 共享, 90%+ coverage）
- US-2.5 Faction：势力 CRUD、成员同步、同盟/敌对去环（12 tests, 82% coverage）
- US-2.6 Foreshadow：伏笔 CRUD、状态追踪、AI 建议、通知提醒（6 tests, 88% coverage）
- US-1.7 Trash：统一回收站、软删除恢复、30天自动清理
- US-3.7~3.10 Editor Assist：批注、章节备注、计时器、查找替换后端

**Frontend（全部完成）：**
- US-2.1 Parser Status：ParserStatusPanel、ChapterParseStatus、BatchParseDialog、useParserStatus
- US-2.2 Character：KBCharacterPanel/List/Card/Detail、useKBCharacter（22 tests, ~79% coverage）
- US-2.4 Item：KBItemPanel/List/Card/Detail、useKBItem（23 tests）
- US-2.6 Foreshadow：KBForeshadowPanel/List/Card/Detail/CreateDialog、useKBForeshadow（32 tests, ~81% coverage）
- 现有：KBLocation、KBFaction（Sprint 4 完成）

**测试统计：**
- Backend：61+ 新测试，全部覆盖 ≥ 80%
- Frontend：30 测试文件，77+ 测试用例

------

## v0.3.17（2026-04-07）

**变更类型：** Sprint 5 - Epic 2 US-2.6 伏笔追踪 Frontend

### 前端新增（US-2.6）

- 新增 `workspace/apps/web/src/features/epic-2/components/KBForeshadow/` 目录，落地 `KBForeshadowPanel.tsx`、`KBForeshadowList.tsx`、`KBForeshadowCard.tsx`、`KBForeshadowDetail.tsx`、`CreateForeshadowDialog.tsx` 与 `types.ts`/`index.ts`，复用 Epic 2 现有双栏知识库面板模式
- 新增 `workspace/apps/web/src/features/epic-2/hooks/useKBForeshadow.ts`，接入真实 `/api/projects/{projectId}/kb/foreshadow` 路由，支持列表拉取、详情加载、按状态筛选、按名称搜索、手动创建、状态更新、预期回收章节设置与 AI 建议确认
- 伏笔列表默认按“未回收 / 部分回收 / 已回收 / 已放弃”分组展示，并根据状态与通知状态呈现琥珀、绿色、灰色与超期红色高亮
- 伏笔详情页现支持名称、摘要、埋设章节、原文引用、状态、预期回收章节、回收章节、回收说明编辑，以及 AI 疑似回收建议确认入口

### 测试

- Frontend: 新增 Foreshadow 测试 32 个，覆盖 hook + Panel/List/Card/Detail/CreateDialog 六个入口，全部通过
- Foreshadow 定向覆盖率：Statements 81.56%，Branches 75.23%，Lines 81.87%

------

## v0.3.16（2026-04-07）

**变更类型：** Sprint 5 - Epic 2 US-2.4 道具/物品识别 Frontend

### 前端新增（US-2.4）

- 新增 `workspace/apps/web/src/features/epic-2/components/KBItem/` 目录，落地 `KBItemPanel.tsx`、`KBItemList.tsx`、`KBItemCard.tsx`、`KBItemDetail.tsx` 与 `types.ts`/`index.ts`，复用 Epic 2 现有双栏知识库面板模式
- 新增 `workspace/apps/web/src/features/epic-2/hooks/useKBItem.ts`，接入真实 `/api/projects/{projectId}/kb/item` 路由，支持列表拉取、详情加载、名称搜索、类型筛选、单条确认、标记非道具、批量确认与基础 CRUD 调用
- 道具列表现支持“AI识别-待确认”与“新发现”标记、按类型筛选、按名称搜索，并在卡片中展示道具类型、当前持有者与出现次数
- 道具详情页新增别名、摘要、当前持有者、持有者变更时间线、出现章节与备注区块，满足 US-2.4 前端展示要求

### 测试

- Frontend: 新增 KBItem 测试 23 个，覆盖 hook + Panel/List/Card/Detail 五个入口，全部通过

------

## v0.3.15（2026-04-07）

**变更类型：** Sprint 5 - Epic 2 US-2.2 / US-2.5 Character + Faction Backend

### 后端新增（US-2.2 / US-2.5）

- `GET /api/projects/{projectId}/kb/character` —— 返回角色列表，支持名称搜索与按首次出场/出场次数排序
- `GET /api/projects/{projectId}/kb/character/{entityId}` —— 获取角色详情，包括别名、职业、外貌、性格标签、势力归属与出场统计
- `PATCH /api/projects/{projectId}/kb/character/{entityId}` —— 更新角色字段，并在势力归属变化时自动维护 faction 成员列表
- `POST /api/projects/{projectId}/kb/character/{entityId}/confirm` / `POST /api/projects/{projectId}/kb/character/bulk-confirm` —— 支持单条与批量确认角色
- `POST /api/projects/{projectId}/kb/character/{entityId}/not-character` —— 软删除角色并写入 Parser 排除名单
- `GET /api/projects/{projectId}/kb/faction` —— 返回势力列表，支持名称搜索与类型筛选
- `GET /api/projects/{projectId}/kb/faction/{entityId}` —— 获取势力详情，包括成员、同盟、敌对与出场章节
- `PATCH /api/projects/{projectId}/kb/faction/{entityId}` —— 更新势力字段，并在成员列表变更时自动双向同步角色 `factionId`
- `POST /api/projects/{projectId}/kb/faction/{entityId}/confirm` / `POST /api/projects/{projectId}/kb/faction/bulk-confirm` —— 支持单条与批量确认势力
- `POST /api/projects/{projectId}/kb/faction/{entityId}/not-faction` —— 软删除势力并写入 Parser 排除名单
- 新增 `workspace/server/services/kb_character_service.py`、`workspace/server/services/kb_faction_service.py` 与对应 route 模块，统一封装名称搜索、排除名单、成员归属双向同步与关系去环逻辑

### 测试

- Backend: 新增 Character/Faction 测试 12 个，全部通过
- 定向新增模块覆盖率：82%（`us22_character.py` 79%，`us25_faction.py` 80%，`kb_character_service.py` 92%，`kb_faction_service.py` 79%）

------

## v0.3.14（2026-04-07）

**变更类型：** Sprint 5 - Epic 2 US-2.6 伏笔追踪 Backend

### 后端新增（US-2.6）

- `GET /api/projects/{projectId}/kb/foreshadow` —— 返回伏笔列表，支持按状态筛选、名称/摘要搜索与按状态分组
- `POST /api/projects/{projectId}/kb/foreshadow` —— 手动创建伏笔，写入预期回收章节、引用片段与初始通知状态
- `GET /api/projects/{projectId}/kb/foreshadow/{entityId}` —— 获取单条伏笔详情
- `PATCH /api/projects/{projectId}/kb/foreshadow/{entityId}` —— 更新伏笔状态与回收信息；已回收/已放弃时自动清空提醒状态
- `POST /api/projects/{projectId}/kb/foreshadow/check-notifications` —— 依据当前章节触发预期回收提醒与超期 5 章警告，且保证幂等
- `DELETE /api/projects/{projectId}/kb/foreshadow/{entityId}` —— 软删除伏笔，并自动出现在统一回收站 KB 列表中
- 新增 `workspace/server/services/kb_foreshadow_service.py`，统一处理伏笔 CRUD、AI 疑似回收建议、通知中心写入与提醒状态机
- `workspace/server/services/parser_service.py` 现已在章节解析时创建 AI 伏笔条目，并为未回收伏笔追加潜在回收建议

### 测试

- Backend: 新增 US-2.6 测试 6 个，全部通过
- 相关回归：`test_us21_parser_red.py`、`test_kb_core_red.py`、`test_us26_foreshadow_red.py` 共 20 个测试通过
- 定向模块覆盖率：`kb_foreshadow_service.py` 86%，`us26_foreshadow.py` 80%，US-2.6 定向总覆盖率 88%

------

## v0.3.13（2026-04-07）

**变更类型：** Sprint 5 - Epic 2 US-2.3 / US-2.4 地点与道具 Backend

### 后端新增（US-2.3 / US-2.4）

- `GET /api/projects/{projectId}/kb/location`、`POST /api/projects/{projectId}/kb/location`、`GET/PATCH/DELETE /api/projects/{projectId}/kb/location/{entityId}`、`GET /api/projects/{projectId}/kb/location/tree`、`POST /confirm`、`POST /reject`、`POST /bulk-confirm` —— 新增地点实体 CRUD、树查询、搜索筛选与确认流
- `workspace/server/services/kb_location_service.py` —— 基于 KB Core 统一维护地点别名归并、父子层级、角色关联、章节去重与 parser 排除名单
- 重构 `workspace/server/routes/us24_item.py` 为 service-backed 路由，补齐道具名称搜索、类型筛选、确认/拒绝/批量确认、引用检查与合并能力
- `workspace/server/services/kb_item_service.py` —— 统一维护道具解析归并、持有者变更历史、parser 排除名单与引用数据
- `parser_service.py` 改为通过 Location / Item service 落库，地点解析更新出现章节，道具解析可同步写入持有者并在持有者变化时追加 `ownershipHistory`
- `main.py` 已接入 `us23_location` 路由，Location / Item 端点均已对外可用

### 测试

- Backend: 新增/补齐 Epic 2 Location + Item 测试 43 个，全部通过
- 相关 Epic 2 验证共 57 个测试通过（含 `test_kb_core_red.py`、`test_us21_parser_red.py`、`test_us23_location_red.py`、`test_us24_item_red.py`）
- 定向模块覆盖率：`us23_location.py` 80%，`us24_item.py` 94%，`kb_location_service.py` 96%，`kb_item_service.py` 96%，`parser_service.py` 87%，合计约 89.2%

------

## v0.3.12（2026-04-07）

**变更类型：** Sprint 5 - Epic 1 US-1.7 回收站 Backend

### 后端新增（US-1.7）

- `GET /api/projects/{projectId}/trash` — 统一返回章节与知识库条目的回收站列表，支持分页、按删除时间倒序、剩余保留天数与存储占用统计
- `POST /api/projects/{projectId}/trash/{itemId}/restore` — 支持恢复知识库条目与章节；章节优先恢复到原卷原位置，缺失时回退到默认卷
- `DELETE /api/projects/{projectId}/trash/{itemId}` — 永久删除单个回收站条目
- `DELETE /api/projects/{projectId}/trash` — 清空项目回收站
- `GET /api/projects/{projectId}/trash/stats` — 返回回收站条目数、类型分布、即将过期数量与存储占用
- 新增 `trash_service.py`，统一处理知识库软删除、章节回收站恢复、30 天自动清理与存储体积估算
- 调整章节与 KB Item 删除流程，删除时保留恢复所需的章节快照/正文元数据，并将 KB Item 的 `restoreUntil` 延长为删除后 30 天

### 测试

- Backend: 新增 US-1.7 测试 8 个，全部通过
- 定向模块覆盖率：`us15_outline.py` 85%，`us17_trash.py` 80%，`us24_item.py` 89%，`trash_service.py` 88%，总计 86.41%

------

## v0.3.11（2026-04-07）

**变更类型：** Sprint 5 - Epic 3 编辑器辅助功能 Backend（US-3.7~3.9）

### 后端新增（US-3.7~3.9）

- `POST /api/projects/{projectId}/chapters/{chapterId}/annotations` — 创建章节批注，持久化锚点范围、选中文本、内容与 resolved 状态
- `GET /api/projects/{projectId}/chapters/{chapterId}/annotations` — 获取章节批注列表，支持按 resolved 状态筛选并按文档位置排序
- `PATCH /api/projects/{projectId}/annotations/{annotationId}` — 更新批注内容或 resolved 状态
- `DELETE /api/projects/{projectId}/annotations/{annotationId}` — 删除批注且不改动正文
- `GET /api/projects/{projectId}/chapters/{chapterId}/note` — 获取章节备注，未创建时返回空备注对象
- `PATCH /api/projects/{projectId}/chapters/{chapterId}/note` — 自动保存章节备注，限制可见字符 2000 以内并同步 `hasNote`
- `POST /api/sessions` — 开始写作计时会话，支持 `stopwatch` / `countdown`
- `PATCH /api/sessions/{sessionId}` — 更新计时器会话状态（运行/暂停）
- `POST /api/sessions/{sessionId}/end` — 结束会话并返回开始/结束字数与净增字数
- `GET /api/projects/{projectId}/sessions` — 获取项目写作会话历史
- 新增 `annotation_service.py`、`chapter_note_service.py`、`timer_service.py`，统一维护内存态业务逻辑与响应数据

### 测试

- Backend: 新增 Epic 3 测试 17 个，全部通过
- 定向模块覆盖率：`us37_annotations.py` 88%，`us38_chapter_notes.py` 94%，`us39_timer.py` 86%，`annotation_service.py` 96%，`chapter_note_service.py` 98%，`timer_service.py` 96%

------

## v0.3.10（2026-04-07）

**变更类型：** Sprint 5 - Epic 2 US-2.1 Parser 引擎 Backend

### 后端新增（US-2.1）

- `POST /api/projects/{projectId}/parser/chapters/{chapterId}/trigger` — 手动触发单章解析
- `POST /api/projects/{projectId}/parser/chapters/{chapterId}/auto-trigger` — 自动触发解析（60 秒防抖）
- `POST /api/projects/{projectId}/parser/batch` — 创建批量解析任务（全书/卷/手动勾选）
- `POST /api/projects/{projectId}/parser/batch/{jobId}/cancel` — 取消未开始的批量解析任务
- `GET /api/projects/{projectId}/parser/status` — 获取项目级解析概览
- `GET /api/projects/{projectId}/parser/chapters/{chapterId}/status` — 获取单章解析状态
- 新增 `parser_service`，实现 `PENDING → QUEUED → PARSING → PARSED/FAILED/CANCELLED` 状态流转
- 基于 `app.state` 实现内存队列、手动优先于自动、并发上限 5、60 秒超时重试 1 次
- 接入确定性规则解析器与通知中心，解析完成/失败写入通知列表

### 测试

- Backend: 新增 US-2.1 红灯测试 8 个，全部通过
- Parser 新增代码定向覆盖率：86%（`us21_parser.py` 83%，`parser_service.py` 87%）

------

## v0.3.9（2026-04-07）

**变更类型：** Sprint 5 - Epic 5 导出、备份与知识库传输

### 后端新增（US-5.1~5.5）

**US-5.1 作品导出：**
- `POST /api/projects/{projectId}/exports` — 创建导出任务（DOCX/TXT/PDF/Markdown）
- `GET /api/projects/{projectId}/exports` — 导出任务列表（最近10条）
- `GET /api/projects/{projectId}/exports/{taskId}` — 查询任务状态
- `GET /api/projects/{projectId}/exports/{taskId}/download` — 下载导出文件
- 异步任务处理，支持进度查询

**US-5.2 自动备份：**
- `POST /api/projects/{projectId}/backups/auto/trigger` — 触发自动备份
- `GET /api/projects/{projectId}/backups` — 备份列表（自动+手动）
- `GET /api/projects/{projectId}/backups/{backupId}/download` — 下载备份ZIP
- 保留最近7个自动备份，支持归档项目暂停备份

**US-5.3 导出模板：**
- `GET /api/me/export-templates` — 获取用户导出模板列表
- `POST /api/me/export-templates` — 创建模板（最多20个）
- `PATCH /api/me/export-templates/{templateId}` — 更新模板
- `DELETE /api/me/export-templates/{templateId}` — 删除模板
- 支持跨项目复用导出配置

**US-5.4 知识库传输：**
- `POST /api/projects/{projectId}/kb/export` — 导出知识库为JSON
- `GET /api/projects/{projectId}/kb/export/{exportId}/download` — 下载导出文件
- `POST /api/projects/{projectId}/kb/import` — 导入知识库JSON
- 支持冲突检测与处理策略（跳过/覆盖/保留两者）

**US-5.5 项目备份与恢复：**
- `GET /api/projects/{projectId}/backups/{backupId}/preview` — 预览备份内容
- `POST /api/projects/{projectId}/backups/{backupId}/restore` — 恢复备份
- 支持创建新项目或覆盖当前项目两种恢复模式
- ZIP格式完整备份（包含项目、卷章、知识库、快照、批注）

### 前端新增（US-5.1~5.5）

**US-5.1 导出作品：**
- `ExportPanel.tsx` — 导出面板（格式选择、范围选择、格式配置、模板应用）
- 支持异步任务状态轮询，实时显示导出进度
- 历史记录展示与快速下载

**US-5.2 自动备份：**
- `BackupRestorePanel.tsx` — 备份面板（备份列表、手动触发、归档提示）
- 集成至项目设置Tab

**US-5.3 导出模板：**
- `TemplateManager.tsx` — 模板管理（列表展示、重命名、删除）
- `useExportTemplates.ts` — 模板管理Hook
- 导出面板集成模板选择与应用

**US-5.4 知识库传输：**
- `KBTransferPanel.tsx` — 知识库导入导出（范围选择、JSON上传、冲突处理）
- 支持按类型筛选导出、冲突逐条处理

### 测试

- Backend: 101 tests passed (epic_5)
- Frontend: 零 TypeScript 错误

------

## v0.3.8（2026-04-02）

**变更类型：** Sprint 4 - Epic 3 章节管理 + US-2.1 Parser 契约

### 后端新增（US-3.2/3.3/3.6）

**US-3.2 章节管理：**
- `DELETE /api/projects/{projectId}/chapters/{chapterId}` — 单章节软删除（移入回收站）
- 复用 US-1.5 API：卷章树查询、章节创建、章节重命名、章节排序
- 章节面板与大纲视图共享同一 API 数据源

**US-3.3 写作统计：**
- `GET /api/projects/{projectId}/writing-stats/summary` — 统计汇总（今日/本周/本月/总字数、日均、连续天数、最高日）
- `GET /api/projects/{projectId}/writing-stats/daily?range=30d` — 30天趋势数据
- `GET /api/projects/{projectId}/writing-stats/weekly?range=12w` — 12周趋势数据
- `GET /api/projects/{projectId}/writing-stats/heatmap` — 24小时热力图数据
- `GET /api/projects/{projectId}/writing-stats/by-volume` — 按卷统计（服务端排序）
- `GET /api/projects/{projectId}/writing-stats/by-chapter` — 按章节统计（服务端排序）

**US-3.6 版本快照：**
- `POST /api/projects/{projectId}/snapshots` — 创建快照（手动/自动/每日）
- `GET /api/projects/{projectId}/snapshots` — 快照列表
- `GET /api/projects/{projectId}/snapshots/{snapshotId}` — 快照详情
- `POST /api/projects/{projectId}/snapshots/{snapshotId}/restore` — 恢复快照
- `DELETE /api/projects/{projectId}/snapshots/{snapshotId}` — 删除快照
- `GET /api/projects/{projectId}/snapshots/{snapshotId}/diff` — 快照对比

### 前端新增（US-3.2~3.6）

**US-3.2 章节管理：**
- `ChapterPanel.tsx` — 章节面板容器（树形结构、右键菜单、新建按钮）
- `ChapterTree.tsx` — 卷章树组件（拖拽排序、展开/折叠）
- `ChapterContextMenu.tsx` — 右键菜单（重命名/删除/插入上下方）
- `NewChapterButton.tsx` — 新建章节按钮
- `useChapterPanel.ts` — 章节面板状态管理 Hook

**US-3.3 写作统计：**
- `WritingStatsPanel.tsx` — 统计面板容器
- `DailyChart.tsx` — 30天趋势折线图（recharts）
- `WeeklyChart.tsx` — 12周趋势柱状图
- `HourlyHeatmap.tsx` — 24小时热力图
- `StatsTable.tsx` — 按卷/章节统计表格
- `useWritingStats.ts` — 统计数据管理 Hook

**US-3.4 专注模式：**
- `FocusMode.tsx` — 专注模式组件（F11 进入/退出）
- `useFocusMode.ts` — 专注模式状态管理 Hook

**US-3.5 编辑器主题：**
- `EditorTheme.tsx` — 主题设置组件（Light/Dark/Sepia）
- `useEditorTheme.ts` — 主题状态管理 Hook（字体/字号/行间距）

**US-3.6 版本快照：**
- `CreateSnapshot.tsx` — 创建快照对话框
- `SnapshotList.tsx` — 快照列表组件
- `RestoreConfirm.tsx` — 恢复确认对话框
- `SnapshotDiff.tsx` — 快照对比组件
- `StorageStats.tsx` — 存储统计组件
- `useSnapshots.ts` — 快照管理 Hook

### 契约更新（US-2.1）

**US-2.1 Parser 引擎契约：**
- 更新 `specs/epic-2/contract.md` — Parser 引擎 API 规范
- 定义文本解析、实体识别、关系提取接口
- 实现推迟至 Sprint 5

### 测试覆盖

- 后端测试：Epic-3 新增 26 tests（US-3.3 + US-3.6）
- 前端测试：Epic-3 新增 7 test files（US-3.2~3.6 组件 + Hooks）
- 后端覆盖率：94% Stmts
- 前端测试：446 passed（部分测试待修复）

------

## v0.3.7（2026-04-01）

**变更类型：** Sprint 3 - 编辑器核心 + 通知基础设施（BE + FE）

### 前端新增（US-3.1/6.6）

**US-3.1 编辑器核心：**
- `EditorWorkspace.tsx` — 编辑器工作台容器（章节标题、工具栏、状态栏）
- `Editor.tsx` — TipTap 富文本编辑器核心组件
- `StatusBar.tsx` — 底部状态栏（字数统计、保存状态）
- `useAutoSave.ts` — 自动保存 Hook（3秒防抖）
- `editorConfig.ts` — 编辑器配置（含字数统计逻辑）
- 支持章节保存/读取、自动保存、字数计算
- 编辑器工具栏：加粗/斜体/下划线/标题/列表

**US-6.6 通知中心：**
- `NotificationBell.tsx` — 通知铃铛图标（未读计数徽章）
- `NotificationPanel.tsx` — 通知下拉面板
- `NotificationItem.tsx` — 单条通知组件
- `useNotifications.ts` — 通知管理 Hook
- 支持通知分页查询、已读标记、批量删除
- 通知类型：系统通知、评论回复、项目邀请

### 前端测试

- 新增 Epic-3 组件测试：Editor、EditorWorkspace、StatusBar（5 test files）
- 新增 Epic-3 Hook/Utils 测试：useAutoSave、editorConfig
- 新增 Epic-6 组件测试：NotificationBell、NotificationPanel、NotificationItem（4 test files）
- 新增 Epic-6 Hook 测试：useNotifications
- 前端覆盖率：80.4%
- 总测试数：285 passed

### 后端新增（US-3.1/6.6）

**US-3.1 编辑器核心：**
- `GET /api/chapters/:chapterId/content` — 获取章节内容
- `PUT /api/chapters/:chapterId/content` — 保存章节内容
- `GET /api/chapters/:chapterId/stats` — 获取字数统计
- 自动保存：3秒防抖，冲突检测（版本号）

**US-6.6 通知中心：**
- `GET /api/notifications` — 分页查询通知
- `POST /api/notifications/:id/read` — 标记已读
- `POST /api/notifications/read-all` — 全部标记已读
- `DELETE /api/notifications/:id` — 删除通知
- `DELETE /api/notifications` — 批量删除通知

### 测试覆盖

- 后端测试：20 passed（US-3.1 + US-6.6）
- 后端覆盖率：94% Stmts, 89% Branch
- Git 提交：11 commits（feat/sprint-3 分支）

---

## v0.3.6（2026-03-30）

**变更类型：** Sprint 2 - Epic 1 项目管理完整可用（BE + FE）

### 前端新增（US-1.4/1.5/1.6/1.8）

**US-1.4 项目设置页面：**
- `ProjectSettingsPage.tsx` — 4 Tab 导航（基本信息/写作目标/AI配置/备份恢复）
- 基本信息表单 + 只读统计
- 危险操作区：归档/删除按钮（二次确认）

**US-1.5 卷章大纲：**
- `VolumeOutline.tsx` — 树形结构 + @dnd-kit 拖拽排序
- `VolumeItem.tsx` / `ChapterItem.tsx` — 可排序列表项
- 支持跨卷移动、批量选择、展开/折叠

**US-1.6 写作目标：**
- `WritingGoalPanel.tsx` — 目标设置面板
- `WritingTrendChart.tsx` — 30天趋势折线图（recharts）
- `GoalProgressRing.tsx` — 总进度环形图
- 目标达成轻量动画

**US-1.8 归档 UI：**
- 归档/取消归档按钮
- 归档后黄色只读横幅

### 前端测试

- 新增组件测试：VolumeOutline（33 tests）、WritingGoalPanel（14 tests）、ProjectSettingsPage（12 tests）
- 前端覆盖率：79.63%

### 后端新增（US-1.4/1.5/1.6/1.8）

**US-1.4 项目设置：**
- `GET /api/projects/:projectId/settings` — 获取项目设置与统计
- `PATCH /api/projects/:projectId` — 更新项目基本信息
- `DELETE /api/projects/:projectId` — 删除项目（含确认名校验）

**US-1.5 卷章目录管理：**
- `GET /api/projects/:projectId/outline` — 获取卷章大纲与统计
- `POST /api/projects/:projectId/volumes` — 创建卷
- `PATCH /api/projects/:projectId/volumes/:volumeId` — 更新卷
- `DELETE /api/projects/:projectId/volumes/:volumeId` — 删除卷（章节移入回收站）
- `POST /api/projects/:projectId/outline/reorder-volumes` — 卷排序
- `POST /api/projects/:projectId/volumes/:volumeId/chapters` — 创建章节
- `PATCH /api/projects/:projectId/chapters/:chapterId` — 更新章节
- `POST /api/projects/:projectId/chapters/reorder` — 章节排序/跨卷移动
- `POST /api/projects/:projectId/chapters/bulk-move` — 批量移动章节
- `POST /api/projects/:projectId/chapters/bulk-trash` — 批量删除章节

**US-1.6 写作目标设定：**
- `GET /api/projects/:projectId/goals` — 获取写作目标
- `PUT /api/projects/:projectId/goals` — 设置/更新目标（含范围校验）
- `DELETE /api/projects/:projectId/goals` — 清除目标
- `GET /api/projects/:projectId/writing-stats?range=30d` — 写作统计（趋势/进度/预计完成日期）

**US-1.8 项目归档：**
- `POST /api/projects/:projectId/archive` — 归档项目
- `POST /api/projects/:projectId/unarchive` — 取消归档，恢复 active 状态
- 归档项目默认在列表中隐藏（`status=archived` 时才可见）
- 归档后 PATCH 请求返回 409 Conflict

### 测试覆盖

- 后端测试：Sprint 2 epic_1 全部通过
- 新增 API 路由模块：`routes/us14_settings.py`、`routes/us15_outline.py`、`routes/us16_goals.py`、`routes/us18_archive.py`

---

## v0.3.5（2026-03-30）

**变更类型：** Sprint 1.5 收尾质量加固

### 代码质量修复

- AuthContext 重构：logout 时清除 token 泄漏漏洞（独立文件 `src/contexts/AuthContext.tsx`）
- useFocusTrap 修复：空 Modal 场景静默失焦问题
- useAuth Hook 拆分：从 AuthContext 独立，职责更清晰
- ProjectDashboard 修复：API 返回 `{ items: [] }` 格式兼容

### 测试覆盖提升

- 前端单元测试：90 passed（79 → 90）
  - 新增 11 个测试用例（RegisterPage、LoginPage、CreateProjectModal）
  - 覆盖率：88.55% Stmts, 84.48% Branch, 75.51% Funcs, 89.69% Lines
- E2E 联调测试：14 passed（新增 Playwright）
  - US-1.1 Auth：7 tests（登录/注册/导航/真实 API）
  - US-1.2/1.3 Dashboard + CreateProject：7 tests
  - E2E 通过 Vite 代理直连真实后端，验证 FE→BE 全链路
- 后端测试：33 passed

### 新增文件

- `src/contexts/AuthContext.tsx` — 认证 Context 独立文件
- `src/hooks/useAuth.ts` — useAuth Hook 独立文件
- `e2e/auth.spec.ts` — Playwright E2E 认证测试
- `e2e/projects.spec.ts` — Playwright E2E 项目测试
- `playwright.config.ts` — Playwright 配置

---

## v0.3.4（2026-03-26）

**变更类型：** Sprint 1.5 前端架构重构（代号 A+B+C）

### 前端重构完成

- 新增 7 个共享 UI 组件（FormInput、ErrorAlert、LoadingButton、SuccessView、AuthCard、SkeletonLoader、Lucide Icons）
- 新增 3 个自定义 Hook（useApi、usePasswordValidation、useFocusTrap）
- 新增 AuthContext + AuthProvider + useAuth() 全局认证状态管理
- 8 个页面迁移至共享组件，消除 ~40% 代码重复
- Emoji 图标全面替换为 Lucide React（琥珀色主题）
- 新增跳过内容链接（WCAG 无障碍）、Modal 焦点陷阱

### 测试结果

- 前端：`npm run test` 通过（79 passed），覆盖率 84.5%
- TypeScript：0 错误

### 质量门禁修复

- AuthContext logout 安全漏洞：登出后 API 客户端仍发送旧 Bearer token（已修复）
- useFocusTrap 空 Modal 静默失焦（已修复）
- 跳过链接目标为空 div（已修复）
- prefer-const lint 错误（已修复）

### 新增文件

- `src/components/ui/` — 共享 UI 组件库
- `src/hooks/` — 自定义 Hook（useApi、usePasswordValidation、useFocusTrap）
- `src/contexts/AuthContext.tsx` — 全局认证 Context
- `src/api/client.ts` — 新增 `setAuthTokenGetter()` 模式

### 文档同步

- 更新 `docs/superpowers/plans/2026-03-26-frontend-refactor.md` — 重构实施计划
- 更新 `docs/superpowers/specs/2026-03-26-frontend-refactor-design.md` — 重构设计规范

---

## v0.3.3（2026-03-26）

**变更类型：** Sprint 1 全部完成，前后端测试全量通过

### 功能完成

- US-1.1 FE+BE：注册 / 登录 / OAuth 页面与接口
- US-1.2 FE+BE：项目列表与仪表盘页面与接口
- US-1.3 FE+BE：创建新项目（3步向导）与接口

### 测试结果

- 后端：`npm run test:backend` 通过（33 passed），覆盖率 92%
- 前端：`npm run test:web` 通过（28 passed），覆盖率 87%
- API Types：`npm run test:api-types` 通过

### 工程改进

- 新增 `src/test/setup.ts`：JSDOM 环境 localStorage polyfill，修复 MSW 移除后的测试失败
- 前端测试覆盖：LoginPage、RegisterPage、CreateProjectModal、ProjectDashboard 等组件

### 文档同步

- 更新 `docs/SPRINT_LOG.md` Sprint 1 完成记录与复盘
- `AGENTS.md` Sprint 1 看板全部标记 ✅

---

## v0.3.1（2026-03-26）

**变更类型：** Sprint 1 后端测试基建（TDD 红灯集）

### 后端测试

- 新增 `server/tests/conftest.py`，提供 mail / oauth / session / db 测试夹具
- 新增工程层红灯测试：错误结构、认证守卫、时间格式、分页契约、会话 TTL
- 新增 US-1.1 红灯测试：注册、邮箱验证、OAuth、登录会话策略
- 新增 US-1.2 红灯测试：项目列表鉴权、用户隔离、筛选排序搜索、归档只读
- 新增 US-1.3 红灯测试：创建项目字段校验、唯一性、默认返回结构、事务原子性

### 文档同步

- 更新 `AGENTS.md` Sprint 1 看板，新增“Sprint 1 测试基建”完成项
- 更新 `docs/SPRINT_LOG.md`，补充 Sprint 1 测试基建完成记录

---

## v0.3.0（2026-03-26）

**变更类型：** Sprint 1 脚手架初始化

### 工程骨架

- 新增根级 monorepo 工作区，接入 `apps/web`、`packages/api-types`、`server/`
- 新增 FastAPI 应用骨架与 `/api/health` 健康检查
- 新增 React + TypeScript + Tailwind 前端壳页面
- 新增 `.env.example` 与平台级脚本入口

### 测试与类型生成

- 新增前端冒烟测试、后端健康检查测试、API 类型生成校验
- 新增 OpenAPI 导出脚本与 `openapi-typescript` 生成链路
- 新增 `packages/api-types/src/generated.ts` 作为共享 API 类型产物

### CI/CD

- 新增 GitHub Actions CI 工作流
- 接入 lint、typecheck、test、build 校验链路
- 更新 `AGENTS.md` 与 `docs/SPRINT_LOG.md`，标记脚手架阶段完成

---

## v0.2.0（2026-03-23）

**变更类型：** Sprint 0 关闭 · 全栈技术选型完成 · 文档结构优化

### 后端技术栈确认

- 确认 **Python 3.11+ + FastAPI** 为后端运行时与框架
- 确认 **ARQ + Redis** 为任务队列方案
- 确认 **pgvector**（PostgreSQL 扩展）为向量检索方案，V1 不引入独立向量服务
- 确认 **openapi-typescript** 为前后端类型同步方案
- 新增 `docs/research/BACKEND_TECH_STACK_RESEARCH.md` — Node.js vs Python vs Bun 深度调研

### 编辑器功能新增

- 确认编辑器集成 **`@tiptap/extension-markdown`**，支持 Markdown 语法实时渲染（类 Typora）
- 更新 `specs/EPIC/EPIC3/FE.md` US-3.1 AC，补充 Markdown 实时渲染说明
- 更新 `design/FRONTEND.md` 技术栈章节

### 导出格式变更

- **V1 去除 EPUB 导出**，新增 **Markdown 导出**
- 导出格式变更为：DOCX / TXT / PDF / Markdown
- 更新 `specs/EPIC/EPIC5/FE.md`、`BE.md`、`context.md`，`design/BACKEND.md`

### 文档结构优化

- **删除根目录 `USER_STORIES.md`**，以 `specs/EPIC/` 为唯一需求真相源（方案 B）
- 删除旧版 `docs/research/BACKEND_FRAMEWORK_RESEARCH.md`（已被新调研覆盖）
- 更新 `docs/CONTEXT.md`：技术栈全部标记为 ✅，阶段更新为 Sprint 1
- 更新 `docs/SPRINT_LOG.md`：Sprint 0 标记完成，Sprint 1 正式开始

---

## v0.1.1（2026-03-20）

**变更类型：** 技术栈决策

### 前端技术栈确认

- 确认 **React + TypeScript** 为前端框架
- 确认 **TipTap 核心**（免费开源）为编辑器引擎，Diff/批注自研
- 确认 **Tailwind CSS** 为 CSS 方案
- 新增 `docs/research/EDITOR_ENGINE_RESEARCH.md` — TipTap vs Slate 深度调研

决策依据：调研文档 8 维度对比，TipTap 在 AI 写作集成、维护性、React+TS 体验均优于 Slate。

### 文档更新

- `docs/CONTEXT.md` — 技术栈表格更新为已确认状态
- `design/FRONTEND.md` — 技术栈占位章节更新为已确认

---

## v0.1.0（2026-03-20）

**变更类型：** 新增文档架构

### 文档结构

- 新增 `specs/EPIC/EPIC1~6/` — 每个 Epic 含 FE.md + BE.md + context.md
- 新增 `docs/CONTEXT.md` — 项目阶段、技术栈候选、Epic 依赖顺序
- 新增 `specs/EPIC/INDEX.md` — Epic 路由表、US 依赖链
- `specs/USER_STORIES.md` 重命名为 `USER_STORIES.md` 并移至根目录

### 流程文档

- 新增 `process/TDD.md` — TDD 工作流、DoD 清单、Epic 开发顺序
- 新增 `process/CONSTRAINTS.md` — NFR 约束表

### 设计文档

- 新增 `design/FRONTEND.md` — 前端视觉设计规范（待 Sprint 0 后完善）
- 新增 `design/BACKEND.md` — 后端架构规范（待 Sprint 0 后完善）

### 项目管理

- 新增 `docs/CHANGELOG.md` — 本文件
- 新增 `docs/SPRINT_LOG.md` — Sprint 跟踪文档

### 清理

- 删除旧文档：`INDEX.md`、`design/DECISIONS.md`、`design/DESIGN_SYSTEM.md`
- 删除旧文档：`docs/SPRINT_LOG.md`、`process/CONSTRAINTS.md`、`process/PROCESS_TDD.md`

### 作者

bitsNovels Team

------

## 后续变更规则

每次完成以下操作时，必须在 CHANGELOG 中新增条目：

| 变更类型 | 记录内容 |
|----------|----------|
| 新增 Epic 或 US | 新增 Epic 编号、涉及 US、简述 |
| 新增或修改数据结构 | 变更的文件、变更内容摘要 |
| 新增或修改 API 接口 | 接口路径、请求/响应变更 |
| 约束值变更 | 约束名称、旧值→新值、变更原因 |
| 技术栈决策落地 | 选定的技术栈、决策依据 |
| Sprint 完成 | Sprint 编号、完成内容、未完成内容 |

------

## 版本号规则

- **MAJOR**：架构级变更（如前后端分离方案、数据库变更）
- **MINOR**：新增 Epic、新增重要功能模块
- **PATCH**：文档修正、小幅补充
