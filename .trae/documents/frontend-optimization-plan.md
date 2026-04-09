# 前端代码全盘扫描与优化规划 (Frontend Optimization Plan)

## 1. 执行摘要 (Summary)

经过对 `workspace/apps/web/src` 目录的全面扫描和阅读，结合 `design/FRONTEND.md`、各 Epic 规范以及 `process/dod.md`，得出整体评价：
前端工程架构清晰，严格落实了 TDD（测试驱动开发）流程，组件化和目录层级（基于 Feature 划分）非常优秀。但在 **视觉一致性**、**数据请求模式** 以及 **类型定义的集中度** 上，仍有进一步的优化空间。本计划旨在通过重构数据层、统一视觉 Token 和集中类型管理，进一步提升项目的可维护性、性能和美观度。

## 2. 现状分析 (Current State Analysis)

### 2.1 视觉美观度

* **当前效果**：核心组件（如 `AuthCard`, `KBCharacterCard`）已经很好地应用了设计文档中定义的“数字羊皮纸”主题色（如 `bg-parchment`，`text-ink`）。组件动画和响应式体验达标。

* **不足之处**：在一些功能性面板（如 `EditorWorkspace`, `StatusBar`）中，仍存在硬编码的 Tailwind 默认色系（如 `bg-amber-50`, `bg-white`, `dark:bg-gray-900`），破坏了全局主题的沉浸感。编辑器（Tiptap）的排版未能完全实现规范要求的字体组合（正文宋体/标题黑体）。

### 2.2 代码规范标准

* **当前效果**：全面采用 TypeScript，接口定义清晰。TDD 执行力极高，各个功能模块的 `__tests__` 目录覆盖完整，并且使用了 MSW 进行 API Mock，完全符合 DoD 标准。

* **不足之处**：存在局部的实体类型定义（例如在 `ProjectDashboard.tsx` 等组件内部定义了 `Project`, `Chapter` 结构），没有复用后端的 Contract 定义，导致类型散落。

### 2.3 可维护程度

* **当前效果**：按 Epic 划分的目录结构降低了模块耦合；自定义 Hooks（如 `useAutoSave`, `useNotifications`）封装了大量业务逻辑，易于复用。

* **不足之处**：底层请求文件 `client.ts` 相对薄弱，缺少全局请求/响应拦截器、错误集中处理和 AbortController 的取消机制。

### 2.4 性能

* **当前效果**：Vite 构建加上 Lucide 的按需加载，使得初始加载性能优异。

* **不足之处**：重度依赖 `useEffect` + `useState` 进行数据获取和同步。在复杂场景下（如切换知识库条目、编辑器频繁存取），缺乏自动缓存、后台静默刷新以及防止竞态条件（Race Conditions）的能力。

***

## 3. 优化目标与具体变更 (Proposed Changes)

根据上述分析以及与您的确认，我们将执行以下三个阶段的优化重构：

### 阶段一：视觉与主题一致性对齐 (Visual Alignment)

* **涉及文件**：`features/epic-3/components/EditorWorkspace.tsx`, `StatusBar.tsx`, `editorConfig.ts` 等。

* **具体动作**：

  * 全盘扫描并替换 UI 组件中的硬编码颜色（如 `bg-white`），将其映射到 `FRONTEND.md` 定义的语义化 CSS 变量（如 `var(--color-parchment)`, `text-ink`）。

  * 深度定制 `editorConfig.ts` 中的 `prose` 样式，通过注入特定的 Typography CSS，强制实现中文的“正文宋体 + 标题黑体”排版。

### 阶段二：类型集中管理与梳理 (Type Centralization)

* **涉及文件**：各 Epic 下的 `components/*.tsx` 和 `hooks/*.ts`，以及统一类型入口（如 `packages/api-types/src/generated.ts` 或新建的 `src/types/index.ts`）。

* **具体动作**：

  * 提取散落在组件内部的 `Project`, `Chapter`, `Volume`, `KBCharacter` 等核心实体类型。

  * 将它们集中声明在一个统一的类型库中，并在各组件内更新 `import` 引用，消除冗余定义，降低后续接口变更带来的维护成本。

### 阶段三：引入 TanStack Query 重构数据层 (Data Layer Refactor)

* **涉及文件**：`package.json`, `api/client.ts`, 所有以 `use` 开头涉及数据请求的 Hooks（如 `useKBCharacter.ts`, `useParserStatus.ts`, `useWritingStats.ts` 等）。

* **具体动作**：

  * 安装 `@tanstack/react-query` 并配置 `QueryClientProvider`。

  * 升级 `client.ts`，加入请求拦截（处理统一的 Auth Token 等）和响应拦截（处理全局错误提示）。

  * 将原有的 `fetch` + `useEffect` 的状态管理逻辑，全面迁移为 `useQuery` 和 `useMutation`。

  * **TDD 闭环**：在重构过程中，同步修改对应的 `__tests__` 文件，确保所有的 Mock 拦截（MSW）和 UI 交互测试依然能 100% 跑通。

***

## 4. 假设与决策 (Assumptions & Decisions)

1. **采用 TanStack Query**：替换现有的 `useEffect` 获取模式，以解决缓存、重试和竞态问题，提升复杂业务下的性能和稳定性。
2. **集中管理类型，暂缓表单库重构**：优先解决类型一致性问题。表单校验目前保持现状，以控制单次 Refactor 的范围和风险。
3. **遵循 TDD 铁律**：重构过程中绝不能破坏现有的测试覆盖率（≥ 73%），在修改实现（绿）之前/同时，需调整测试用例（红），并确保所有测试通过。

## 5. 验证步骤 (Verification steps)

1. **类型验证**：运行 `tsc --noEmit` 确保全量代码类型检查无误。
2. **测试验证**：运行 `npm run test`（或相关测试脚本），确保重构后的 Hooks 和组件的所有单元测试均通过。
3. **人工/视觉走查**：运行 `npm run dev` 启动应用，检查：

   * 项目看板、知识库、编辑器页面的视觉风格是否完全统一。

   * 打开网络面板（Network）验证 TanStack Query 是否正常缓存了数据（避免重复请求）。

   * 编辑器排版字体是否正确显示为宋体/黑体组合。

