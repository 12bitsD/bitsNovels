# 前端实现审计报告（2026-04-09）

范围：`workspace/apps/web/`（共 207 个源码文件：154 tsx / 52 ts / 1 css），并对照 `specs/epic-1~6/fe.md`、`specs/epic-*/contract.md`、`design/FRONTEND.md`、`process/CONSTRAINTS.md`、`process/dod.md`。

## 1. 执行结果（门禁）

> 环境已执行 `npm install` 后再运行门禁。

### 1.1 lint（失败）

失败原因（节选）：

- 未使用变量/导入：多处 `@typescript-eslint/no-unused-vars`
- 影响写作体验的 Hook/Effect 写法：多处 `react-hooks/set-state-in-effect`
- Hook 实现错误：`useAutoSave.ts` 触发 `react-hooks/immutability`（递归回调引用）与 `no-unused-vars`

### 1.2 typecheck（失败）

失败原因（节选）：

- 测试/Mock 类型不正确：`@tiptap/react` mock 中 `returnThis` 不存在、client mock 类型不兼容等
- 多处 TS 严格项报错：未使用导入、`type` 字段未严格赋值（`"location" | undefined`）、`verbatimModuleSyntax` 下未使用 `type` import、Tooltip formatter 参数类型不匹配等

### 1.3 unit test + coverage（失败）

- Vitest 运行结束后，**全局 lines 覆盖率 67.86% < 73% 阈值**，因此整体失败。
- 另有大量 React 19 测试告警：未使用 `act(...)` 包裹的 state update（当前未作为失败条件，但会增加噪音）。

### 1.4 e2e（通过）

- Playwright：27 tests，25 passed，2 skipped（配置会自动起 dev server）。

## 2. 视觉与交互结论（design/FRONTEND.md 对照）

### 2.1 优点

- 全局 token 定义完整：`src/index.css` 的 `@theme` 与 `.input-base/.btn-primary/.card-base` 基类，整体“羊皮纸/琥珀/墨色”方向正确，适合长时间写作场景。
- Auth/Projects 页面多处交互细节到位：加载骨架、渐入动画、hover/active 反馈、跳转到主要内容（a11y）等。

### 2.2 问题与影响

- token 与硬编码色值混用：例如 `App.tsx`、`ProjectDashboard.tsx`、`EditorWorkspace.tsx` 中存在 `bg-[#F5F0E8]`、`bg-gray-*`、`dark:*` 等灰阶体系，与“复古科学 × 羊皮纸”主题不一致，且会阻碍后续 Dark/Sepia 扩展。
- 全局布局缺失：目前缺少“写作工作台三栏布局（左章节/中编辑/右知识库）”的统一 Shell；各模块更像“孤立可测试组件”，而不是“可达的完整产品体验”。

## 3. Spec 覆盖结论（S1~S5 为主）

> 基于“可达路由 + 组件实现 + 测试存在性”的审计。当前代码层面 Epic 2/3/5/6 的大量组件未在路由层接入，因此按“功能存在但不可达”处理。

### 3.1 Epic 1（项目管理）——部分达标

- 可达能力：登录/注册/忘记密码/重置密码/验证页、项目列表（仪表盘）、创建项目（Modal）、项目设置、卷章大纲
- 主要缺口：
  - 仪表盘项目卡片点击后未进入写作工作台（Spec 要求定位 `lastEditedChapterId` 并进入编辑）
  - 与契约字段命名存在偏差：例如登录 `rememberMe`、project 字段 snake_case/camelCase 统一策略需要明确

### 3.2 Epic 3（编辑器）——实现存在但不可达，且关键 AC 未覆盖

- 已有实现：编辑器壳层、自动保存 hook、章节面板、专注模式、主题、写作统计、快照面板等组件/测试文件齐全。
- 关键 AC 风险：
  - Markdown 实时渲染：Spec 指定 `@tiptap/extension-markdown`，当前 `EditorWorkspace.tsx` 未引入该扩展（与 AC 不符）。
  - 自动保存：`EditorWorkspace.tsx` 未把 editor 内容更新到 `useAutoSave.setContent`，存在“保存了初始内容而非最新内容”的风险（数据丢失级）。
  - 三栏布局：缺少一个把 ChapterPanel + Editor + KBPanel 组合起来的工作台 Shell。

### 3.3 Epic 2（知识库）——实现存在但不可达

- 已有实现：角色/地点/道具/势力/伏笔、解析状态、批量解析弹窗、对应 hooks 与大量测试。
- 当前缺口（相对产品体验）：无路由入口、与编辑器/章节切换联动未体现（Spec 2.1 的离章触发/60s 防抖/beforeunload 补偿等无法验收）。

### 3.4 Epic 6（通知中心）——实现存在但不可达

- 已有实现：`NotificationBell/Panel/Item` 与 hooks，配套测试齐全。
- 当前缺口：未集成到全局顶栏；无法验证“全局任何页面可打开通知中心”的交互要求。

### 3.5 Epic 5（备份/导出/模板）——实现存在但不可达

- 已有实现：导出/备份恢复/KB 迁移/模板管理（少量测试）。
- 当前缺口：未在项目设置或全局入口接入，无法按 Spec 验收闭环。

## 4. P0/P1/P2 优化 Backlog（建议）

### P0（必须优先）

- 修复门禁：lint/typecheck/test 覆盖率恢复到 DoD（≥73%）
- 修复数据丢失风险：Editor 自动保存链路（`useAutoSave` 与 Editor 事件绑定）
- 修复契约偏差：`rememberMe` 等请求字段命名与 contract 对齐
- 关闭/限制调试入口：`DevNavigation` 仅在开发模式可见

### P1（强烈建议）

- 接入“工作台 Shell”：三栏布局 + 顶栏（含通知铃铛）+ 路由把 Epic 2/3/5/6 串成可达路径
- 视觉一致性治理：清理硬编码色值与灰阶体系，收敛到 `index.css` token 与 `design/FRONTEND.md` 规范
- API 类型化：关键链路逐步迁移到 `@bitsnovels/api-types`（避免接口漂移）

### P2（体验/性能增强）

- 长列表虚拟化：卷章树、KB 列表、通知列表的渲染与交互性能基线
- 测试质量降噪：React 19 `act(...)` 告警与测试类型（mock）收敛

## 附录 A：前端覆盖矩阵（按 US 粗粒度）

说明：

- 维度：以 `docs/SPRINT_LOG.md` 的 S1~S5 作为“应已交付范围”，并对照 `specs/epic-N/fe.md`。
- 口径：本矩阵是“US 粗粒度”快速判断（Pass/Partial/Fail/不可达）。AC 逐条矩阵建议作为下一步细化（当前代码路由不完整会让 AC 级别结论失真）。

Legend：

- Pass：实现 + 可达 + 关键单测/e2e 证据齐全
- Partial：实现存在，但缺少部分关键 AC 或缺少可达入口/证据不完整
- Fail：明显与 Spec/Contract 不一致或质量门禁阻断
- 不可达：组件/测试存在，但未在路由/导航中接入，无法以产品形态验收

### Epic 1 · 项目管理

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

### Epic 3 · 编辑器

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| US-3.1 编辑器核心 | Fail/不可达 | `features/epic-3/components/*` + 大量测试存在 | 路由/导航未接入；Markdown 实时渲染未按 Spec 明确集成；自动保存链路存在高风险 |
| US-3.2 章节管理侧栏 | 不可达 | `features/epic-3/components/ChapterPanel/*` | 未在产品壳层接入，无法验证与大纲同步 |
| US-3.3 写作统计 | 不可达 | `features/epic-3/components/WritingStats/*` | 同上 |
| US-3.4 专注模式 | 不可达 | `FocusMode/*` | 同上 |
| US-3.5 编辑器主题 | 不可达 | `EditorTheme/*` + `useEditorTheme.ts` | 同上 |
| US-3.6 版本快照 | 不可达 | `Snapshot/*` | 同上 |

### Epic 2 · 知识库

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| US-2.1 Parser 解析触发 | 不可达 | `ParserStatus/*` + `useParserStatus.ts` | 与章节切换/编辑器联动入口缺失 |
| US-2.2 角色管理 | 不可达 | `KBCharacter/*` + tests | 无入口 |
| US-2.3 地点管理 | 不可达 | `KBLocation/*` + tests | 无入口 |
| US-2.4 道具管理 | 不可达 | `KBItem/*` + tests | 无入口 |
| US-2.5 势力管理 | 不可达 | `KBFaction/*` + tests | 无入口 |
| US-2.6 伏笔追踪 | 不可达 | `KBForeshadow/*` + tests | 无入口 |

### Epic 5 · 导出/备份/模板

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| （S5 相关）导出/备份/迁移/模板 | 不可达 | `features/epic-5/components/*` | 未接入到设置页或工作台 |

### Epic 6 · 通知中心

| US | 状态 | 证据/入口（示例） | 主要缺口 |
| --- | --- | --- | --- |
| US-6.6 通知中心 | 不可达 | `NotificationBell.tsx` + tests；Playwright 仅覆盖 auth/projects | 未集成到全局顶栏；无法验证“任何页面可打开” |
