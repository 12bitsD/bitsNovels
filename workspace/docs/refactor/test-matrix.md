# 测试矩阵与状态跟踪 (Test Matrix)

> 覆盖率目标：全局 lines ≥ 73%。本矩阵用于记录关键组件/模块的测试状态与回归结果。

## 自动化回归
- `workspace/`：`npm run check` ✅
- `apps/web/`：`npm run lint` ✅
- `apps/web/`：`npm run typecheck` ✅
- `apps/web/`：`npm run test` ✅（覆盖率阈值通过）
- `workspace/`：`npx playwright test` ✅（25 passed / 2 skipped）

## 关键模块状态

| 模块 | 单元测试 | E2E | 备注 |
|---|---|---|---|
| WorkbenchShell | ✅ | ✅ | 三栏布局可达；右栏布局冲突已修复 |
| ChapterPanel / ChapterTree | ✅ | ✅ | 超大卷章节列表虚拟化阈值触发；拖拽中回退完整渲染 |
| KBCharacterPanel / KBCharacterList | ✅ | ✅ | 列表虚拟化阈值触发 |
| NotificationPanel | ✅ | ✅ | 列表虚拟化阈值触发；通知分页仍由 query 负责 |
| WritingStatsPanel / StatsTable | ✅ | ✅ | StatsTable 硬编码色值已收敛至 token；useWritingStats 已迁移到 query |

## 已知非阻塞项
- `vitest` 输出存在 `act(...)` 与 `--localstorage-file` warning（不影响 exit code）。
