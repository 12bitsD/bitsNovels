# 技术债务与重构看板 (Tech Debt Board)

## 状态定义
- 🔴 **待处理 (To Do)**
- 🟡 **进行中 (In Progress)**
- 🟢 **已完成 (Done)**

---

## 优先级 P0: 门禁与正确性修复 (Phase A)
- 🟢 [x] **修复 lint/typecheck 阻断项** - 未使用变量、测试类型、Hook 规则等。
- 🟢 [x] **编辑器自动保存逻辑修复** - 避免保存旧内容，修复 `useAutoSave` 竞态问题。
- 🟢 [x] **API Contract 对齐** - 处理 `rememberMe` 等命名不一致问题。
- 🟢 [x] **DevNavigation 环境隔离** - 限制仅在开发环境下可见。
- 🟢 [x] **workspace 根级 check 环境补齐** - 根级脚本会先自举 `.venv` 并同步 `.[dev]` 依赖，`npm run check` 已不再受 Python `ruff` 缺失阻塞。

## 优先级 P1: 核心热点组件重构 (Phase B & C)
- 🟢 [x] **ExportPanel 状态机解耦** - 拆分 24+ Hooks 至独立的状态管理逻辑。
- 🟢 [x] **ProjectSettingsPage 重构** - 使用 `useReducer` 替代散乱的 useState。
- 🟢 [x] **WritingStatsPanel 视觉统一** - 移除内联样式和硬编码色值，接入 Theme Token。
- 🟢 [x] **工作台 Shell (Workbench Shell)** - 建立三栏布局与顶栏全局导航，并修复右栏布局冲突与入口可发现性。

## 优先级 P2: 架构优化与数据层 (Phase D & E)
- 🟢 [x] **API 层抽象 (TanStack Query 试点)** - 封装 `fetchApi` 并迁移通知模块 (Epic-6)。
- 🟢 [x] **扩大 TanStack Query 试点范围** - `useWritingStats` 迁移到 `useQuery + fetchApi`，统一请求与错误处理。
- 🟢 [x] **基础 UI 库扩充 (Shared UI)** - 提取 `Card`, `Modal`, `Tabs` 避免在业务中散落 HTML 标签。
- 🟢 [x] **路由懒加载优化** - 将 `App.tsx` 的全量导入改造为 `React.lazy` 懒加载。
- 🟢 [x] **类型集中** - 移除组件内散落的接口定义，对齐 `@bitsnovels/api-types`。
- 🟢 [x] **长列表虚拟化** - KB 列表 / 通知列表 / 超大卷章节列表引入 `@tanstack/react-virtual`（大数据量阈值触发，拖拽中回退为完整渲染）。

---

## 当前说明
- `npm run check`、`npm run build`、`npx playwright test` 均已回归通过。
- 测试输出仍存在少量 `act(...)` 与 `--localstorage-file` warning，不影响门禁通过，建议后续单独清理以降低噪音。
