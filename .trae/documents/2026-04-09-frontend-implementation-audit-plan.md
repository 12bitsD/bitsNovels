# 前端实现扫描与优化 Planning（bitsNovels）

## Summary

目标：对 `workspace/apps/web/` 现有前端实现做一次“按 Epic / Spec / 视觉规范 / NFR”对照审计，回答：

- 当前实现的效果如何（视觉、交互、可用性）？
- 是否达到要求（Spec AC、视觉规范、代码规范、可维护性、性能/NFR）？
- 有哪些可优化空间（按影响/成本排序）？应如何优化（具体到文件与改动策略）？

交付物（执行阶段产出）：

- `实现覆盖矩阵`：按 Epic/US/AC → 代码文件/测试用例/缺口（Pass/Partial/Fail）
- `质量审计报告`：视觉一致性、代码规范、可维护性、性能与风险清单
- `优化 Backlog`：P0/P1/P2 分级 + 每项的验收方式（测试/截图/性能指标）

## Current State Analysis（基于本次只读扫描的初步结论）

### 代码与工程结构

- 工程根：`workspace/`（monorepo），前端应用在 `workspace/apps/web/`，脚本入口与统一门禁在 `workspace/package.json`（含 `check/lint/typecheck/test`）。
- 前端代码分层清晰：`src/components/ui`（共享 UI）、`src/contexts`、`src/hooks`、`src/features/epic-N`（按 Epic 切分），并已配套较多单测与 MSW mocks（符合 DoD 的测试导向）。

### 视觉规范落地情况（design/FRONTEND.md 对照）

- `src/index.css` 已以 Tailwind v4 `@theme` 方式定义了核心色板与阴影 token，并提供 `.input-base/.btn-primary/.btn-secondary/.card-base` 等“质感组件基类”，与“复古科学 × 数字羊皮纸”方向一致。
- 仍存在“硬编码色值/灰阶”与 token 混用的情况（例如 `App.tsx`、`ProjectDashboard.tsx`、`EditorWorkspace.tsx` 中出现 `bg-white`、`bg-gray-*`、`bg-[#F5F0E8]` 等），会导致主题一致性与后续 Dark/Sepia 扩展成本上升。

### Spec/Contract 对齐风险（已发现的高优先级点）

- 路由暴露与可达性：`App.tsx` 当前仅挂载 Epic 1 的部分路由（登录/注册/仪表盘/创建项目/设置/大纲）。Sprint 日志显示 Epic 3/2/6 在 S3~S5 已完成，但在当前路由层未见对应入口，存在“实现存在但不可达/不可验收”的风险。
- 契约字段命名：`AuthContext.tsx` 登录请求体使用 `remember_me`，而 Epic 1 数据契约定义为 `rememberMe`（contract.md 对照）。这类偏差会造成联调失败或需要后端兼容分支。
- 编辑器自动保存：`EditorWorkspace.tsx` 使用 `useAutoSave` 但未把编辑器内容写回 `setContent`，导致自动保存与 `saveNow()` 可能持久化到“初始内容”而非最新内容（属于数据丢失级风险，需要优先验证与修复）。
- 开发辅助 UI：`App.tsx` 的 `DevNavigation` 为固定浮层且默认渲染（疑似未按环境变量/开发模式 gate），有“生产环境泄露调试入口”的风险。

### 代码规范与可维护性（初步）

- 代码风格存在不一致：部分文件使用分号与 `React` 默认导入（如 `LoginPage.tsx`），部分文件无分号/更偏函数式；建议统一 Prettier/ESLint 风格并自动格式化，降低 diff 噪音。
- API 层目前为手写 `fetch` 包装（`src/api/client.ts`）+ `useApi`（偏 POST 场景）；尚未系统性使用 `@bitsnovels/api-types` 的 OpenAPI 生成类型进行端到端类型约束，存在“接口漂移只能在运行期暴露”的维护成本。

> 以上为“只读抽样扫描”得出的结论；正式审计会以“逐文件阅读 + 逐条 AC 对照 + 全量门禁执行（lint/typecheck/test/coverage/e2e）”为准。

## Assumptions & Decisions

- 以 `docs/SPRINT_LOG.md` 记录为“需求范围真相源”：S1~S5 标记 ✅ 的 US 应在当前代码可达、可演示、可测试；S6 标记待开始的不纳入“必须达标”结论，但会在报告中标注为“不在当前范围”。
- 以 `design/FRONTEND.md` 与 `process/CONSTRAINTS.md` 为视觉与 NFR 的硬标准；以 `process/dod.md` 为质量门禁标准（覆盖率≥73%、lint/typecheck/test 全绿）。

## Proposed Changes（执行阶段的工作规划）

### Phase 0：建立审计基线（可复现）

1. 生成“前端文件清单”
   - 范围：`workspace/apps/web/src/**/*.{ts,tsx,css}`（逐文件阅读，记录模块职责与依赖）
   - 产物：按目录/epic 的模块地图（组件、hooks、contexts、api、mocks、tests）
2. 执行质量门禁并记录结果
   - `workspace/`：`npm run check`
   - `workspace/`：`npm run test:web -- --coverage`（如需单独抽取覆盖率明细）
   - `workspace/`：`npm run test`（包含 api-types 校验与后端测试，确保契约链路无漂移）

### Phase 1：Spec/AC 覆盖矩阵（“有没有达到要求”）

1. 对照 Spec（`specs/epic-1~6/fe.md`）逐条建立 AC → 实现映射
   - 每条 AC 标记：Pass / Partial / Fail / Out-of-scope（S6+）
   - 为每条 Pass 提供证据：对应组件/Hook、关键测试、可达路由或入口
2. 对照 Contract（`specs/epic-N/contract.md`）核对所有 API 交互
   - 检查：路径、method、request/response 字段命名与类型
   - 输出：漂移列表（前端字段/路径错误、后端未实现、类型不一致）

### Phase 2：视觉与交互审计（“视觉美观/一致性/无障碍”）

1. 设计 token 落地审计
   - 目标：页面与组件尽量使用 `bg-parchment/text-ink/border-border` 等 token，减少硬编码色值
2. 关键页面截图对照（人工 + 自动化）
   - 登录/注册/仪表盘/创建项目/项目设置/大纲/编辑器/知识库面板/通知面板
   - 自动化：Playwright 做“冒烟截图测试”（可选，作为回归保护）
3. A11y 基线检查
   - 覆盖：键盘可达、焦点可见、ARIA、表单错误提示、prefers-reduced-motion 尊重

### Phase 3：代码质量与可维护性审计（“代码规范标准/可维护程度”）

1. 规范一致性
   - 统一格式化策略（ESLint +（如已存在）Prettier 或仅 ESLint 格式规则）
   - 明确 import 风格与文件导出约定（默认导出 vs 命名导出）
2. API 类型化与数据流收敛（按成本分层）
   - P0：修复明显契约不一致（如 `rememberMe`）
   - P1：在关键链路（Auth/Projects/Outline/Editor/KB/Notifications）引入 `@bitsnovels/api-types` 的类型约束（最少侵入式改造）
3. 状态管理与副作用边界
   - 重点检查：自动保存、解析触发 debounce、通知轮询/分页、长列表渲染

### Phase 4：性能与体验审计（“性能/稳定性/NFR”）

1. NFR 对照核验（`process/CONSTRAINTS.md`）
   - 自动保存 3s、防抖/重试、撤销栈深度、搜索 300ms debounce 等
2. 性能热点定位
   - React 组件重渲染、列表渲染（卷章树/KB 列表/通知列表）是否需要虚拟化
   - 编辑器输入延迟与保存触发是否影响写作体验

### Phase 5：输出“优化 Backlog”（可执行的改造计划）

- 按 P0/P1/P2 输出：
  - P0：数据丢失/安全/不可达/契约不一致（必须立即修）
  - P1：一致性与维护成本（主题 token、类型化 API、组件抽象）
  - P2：体验增强与性能进一步优化（虚拟化、缓存策略、bundle 分析）
- 每项都附：涉及文件、改动要点、验收方式（测试项/截图/性能指标）

## Verification（执行阶段验收步骤）

- 代码门禁：`workspace/` 目录 `npm run check` 全绿；新增/修改代码行覆盖率≥73%。
- Spec 验收：S1~S5 的每条 AC 在覆盖矩阵中均有 Pass 或明确的“未实现缺口 + 计划补齐方式”。
- 视觉验收：关键页面与组件符合 `design/FRONTEND.md` 色彩/间距/组件规范；无硬编码色值扩散（允许少量例外但需理由）。
- 性能验收：核心交互（编辑输入、卷章树操作、KB 列表滚动、通知面板打开）无明显卡顿；关键 debounce/重试符合 NFR 表。

