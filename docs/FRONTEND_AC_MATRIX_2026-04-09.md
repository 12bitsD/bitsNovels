# 前端覆盖矩阵（按 US 粗粒度）（2026-04-09）

说明：

- 维度：以 `docs/SPRINT_LOG.md` 的 S1~S5 作为“应已交付范围”，并对照 `specs/epic-N/fe.md`。
- 口径：本矩阵是“US 粗粒度”快速判断（Pass/Partial/Fail/不可达）。AC 逐条矩阵建议作为下一步细化（当前代码路由不完整会让 AC 级别结论失真）。

Legend：

- Pass：实现 + 可达 + 关键单测/e2e 证据齐全
- Partial：实现存在，但缺少部分关键 AC 或缺少可达入口/证据不完整
- Fail：明显与 Spec/Contract 不一致或质量门禁阻断
- 不可达：组件/测试存在，但未在路由/导航中接入，无法以产品形态验收

## Epic 1 · 项目管理

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| US-1.1 注册与登录 | Partial | `App.tsx` 路由：`/login /register /forgot-password /reset-password /verify`；组件与测试：`features/epic-1/components/*Page.tsx`、`features/epic-1/__tests__/*Page.test.tsx` | 契约字段 `rememberMe` 命名偏差；OAuth loading/失败重试等 AC 需逐条对照 |
| US-1.2 项目列表与仪表盘 | Partial | `/dashboard`（`ProjectDashboard.tsx`）+ `ProjectDashboard.test.tsx`；Playwright 有 `e2e/projects.spec.ts` | 项目卡片点击未进入写作工作台；排序/筛选 AC 未见完整实现 |
| US-1.3 创建新项目 | Partial | `/projects/new`（`CreateProjectModal.tsx`）+ `CreateProjectModal.test.tsx` | Step2/Step3 的模板/KB 导入闭环需对照；与后端冲突错误处理需验证 |
| US-1.4 项目设置 | Partial | `/projects/:projectId/settings`（`ProjectSettingsPage.tsx`）+ `ProjectSettingsPage.test.tsx` | Tab 结构与危险区二次确认等需对照；Epic 5/6 的联动入口未接入 |
| US-1.5 卷章目录管理 | Partial | `/projects/:projectId/outline`（`VolumeOutline.tsx`）+ `VolumeOutline.test.tsx` | 与编辑器章节面板共享数据源/实时同步目前无法验收（编辑器不可达） |
| US-1.6 写作目标设定 | Partial | `WritingGoalPanel.tsx` + `WritingGoalPanel.test.tsx` | 与编辑器底部状态栏联动（US-3.1/3.3）不可验收 |
| US-1.7 回收站 | Fail（当前前端缺失） | 仅见后端 Sprint 记录；前端未发现入口/页面 | FE 未交付（或未接入） |
| US-1.8 项目归档 | Fail/不可达（需核对） | 未发现明显“归档/取消归档”交互入口 | 归档只读提示条/筛选入口需要补齐 |

## Epic 3 · 编辑器

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| US-3.1 编辑器核心 | Fail/不可达 | `features/epic-3/components/*` + 大量测试存在 | 路由/导航未接入；Markdown 实时渲染未按 Spec 明确集成；自动保存链路存在高风险 |
| US-3.2 章节管理侧栏 | 不可达 | `features/epic-3/components/ChapterPanel/*` | 未在产品壳层接入，无法验证与大纲同步 |
| US-3.3 写作统计 | 不可达 | `features/epic-3/components/WritingStats/*` | 同上 |
| US-3.4 专注模式 | 不可达 | `FocusMode/*` | 同上 |
| US-3.5 编辑器主题 | 不可达 | `EditorTheme/*` + `useEditorTheme.ts` | 同上 |
| US-3.6 版本快照 | 不可达 | `Snapshot/*` | 同上 |

## Epic 2 · 知识库

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| US-2.1 Parser 解析触发 | 不可达 | `ParserStatus/*` + `useParserStatus.ts` | 与章节切换/编辑器联动入口缺失 |
| US-2.2 角色管理 | 不可达 | `KBCharacter/*` + tests | 无入口 |
| US-2.3 地点管理 | 不可达 | `KBLocation/*` + tests | 无入口 |
| US-2.4 道具管理 | 不可达 | `KBItem/*` + tests | 无入口 |
| US-2.5 势力管理 | 不可达 | `KBFaction/*` + tests | 无入口 |
| US-2.6 伏笔追踪 | 不可达 | `KBForeshadow/*` + tests | 无入口 |

## Epic 5 · 导出/备份/模板

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| （S5 相关）导出/备份/迁移/模板 | 不可达 | `features/epic-5/components/*` | 未接入到设置页或工作台 |

## Epic 6 · 通知中心

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| US-6.6 通知中心 | 不可达 | `NotificationBell.tsx` + tests；Playwright 仅覆盖 auth/projects | 未集成到全局顶栏；无法验证“任何页面可打开” |

