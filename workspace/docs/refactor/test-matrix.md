# 测试矩阵与状态跟踪 (Test Matrix)

> 每次 PR 合并前，务必检查此矩阵的状态，确保重构没有导致覆盖率或链路衰退。当前目标覆盖率：≥ 73% (Lines)

> 当前状态：最近一次 Playwright E2E 已通过；表中的黄色项表示“场景映射或人工走查记录待补”，不等于链路失败。

## 组件测试状态跟踪表

| 组件 / 模块 (Component) | 覆盖率 (Coverage) | 单元测试状态 (Unit Tests) | E2E 场景覆盖 (Playwright) | 视觉回归 (Visual Reg) | 最近重构时间 |
|-------------------------|-------------------|--------------------------|---------------------------|----------------------|-------------|
| **Auth & Core** | | | | | |
| `App.tsx` | - | 🟡 待补充 | 🟢 核心链路已通过 | 🟡 人工走查待补 | - |
| `contexts/AuthContext` | 80%+ | 🟢 通过 | 🟢 登录链路 | 🟢 无 | - |
| **Epic 1: Project** | | | | | |
| `ProjectSettingsPage` | 86.6% | 🟢 通过 | 🟡 表单交互 | 🟢 已重构验收 | 2026-04-09 |
| `ProjectDashboard` | 75% | 🟢 通过 | 🟢 列表渲染 | 🟡 人工走查待补 | - |
| **Epic 2: Knowledge Base**| | | | | |
| `useKBLocation` (Hook) | 60% | 🟡 部分覆盖 | - | - | - |
| `KBLocationDetail` | < 50% | 🔴 待修复 | 🟡 节点点击 | 🟡 人工走查待补 | - |
| **Epic 3: Editor** | | | | | |
| `WritingStatsPanel` | 85% | 🟢 通过 | 🟢 字数统计显示 | 🟢 Token 验收通过 | 2026-04-09 |
| `SnapshotDiff` | 73%+ | 🟢 通过 | 🔴 缺失 | 🟢 Token 验收通过 | 2026-04-09 |
| `EditorTheme` | 73%+ | 🟢 通过 | - | 🟢 Token 验收通过 | 2026-04-09 |
| **Epic 5: Export** | | | | | |
| `ExportPanel` | 80.5% | 🟢 通过 | 🟡 导出流程点击 | 🟢 已重构验收 | 2026-04-09 |
| **Epic 6: Notification**| | | | | |
| `NotificationItem` | 90% | 🟢 通过 | 🟢 弹窗可见 | 🟡 Token 走查待补 | - |

## 失败处理策略

1. **新功能缺失**: 测试中明确写了 `TODO` 或直接报错提示某元素不存在 -> 优先在组件中补充实现。
2. **测试用例过时**: 组件 DOM 结构发生合理重构 (例如 `div` 改为 `Card` 组件) 导致选择器失效 -> 更新测试代码的断言。
3. **回归问题**: 原有的业务逻辑 (如数据提交、状态流转) 被破坏 -> 立即撤回修改并分析状态机。

## 当前风险

- 人工视觉走查仍未完全补齐，当前高风险项为 `App.tsx`、`ProjectDashboard`、`KBLocationDetail` 与 `NotificationItem`。
- `workspace` 根级 `npm run check` 已可直接执行；脚本会先自举 `.venv` 并同步 Python `.[dev]` 依赖，再统一运行 `ruff`、`mypy`、`pytest`。
