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

