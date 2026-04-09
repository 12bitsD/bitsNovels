# 组件级重构 Checklist

对于每个被标记为 Hot Spot 的组件，重构前必须创建对应的 Checklist，并严格遵循 TDD 流程。

## 模板

```markdown
### 组件名称: [Component_Name]

#### 1. 前置条件 (Pre-requisites)
- [ ] 原测试用例覆盖率已记录 (Lines: XX%)
- [ ] 关联的 Playwright E2E 场景已确认；如复用既有链路，记录最近一次通过结果
- [ ] 可视化验收标准已明确 (参考 `design/FRONTEND.md`)

#### 2. 重构执行 (Execution)
- [ ] 先运行与组件直接相关的 Vitest 用例，确认初始状态为绿；完成后再运行 `npm run test:web`
- [ ] (如果有新逻辑) 编写失败的测试用例 (Red)
- [ ] 执行重构代码修改
- [ ] 运行测试确保全部通过 (Green)
- [ ] 代码清理与格式化 (Refactor)

#### 3. 检查项 (Code Quality)
- [ ] **状态管理**: 超过 5 个 `useState` 考虑使用 `useReducer` 或提取自定义 Hook。
- [ ] **视觉 Token**: 消除所有硬编码的 HEX/RGB 颜色，替换为 `bg-parchment` / `text-ink` 等 Tailwind Token。
- [ ] **类型对齐**: 删除内部冗余定义的 Interface，统一从 `@bitsnovels/api-types` 或 `contract.md` 导入。
- [ ] **无障碍 (a11y)**: 确保交互元素具备适当的 `aria-*` 属性和键盘聚焦样式。

#### 4. 交付验证 (Verification)
- [ ] `npm run -w @bitsnovels/web lint` 与 `npm run -w @bitsnovels/web typecheck` 通过
- [ ] 如执行 `workspace` 根级 `npm run check`，确认 `.venv` 已由脚本自动自举，且 `ruff` / `mypy` / `pytest` 全部通过
- [ ] 单元测试覆盖率不低于 73%
- [ ] Playwright E2E 已回归，或已记录复用的通过链路
- [ ] 界面神匠验收：视觉一致性审查已完成；若未完成，必须登记视觉走查风险
```

---

## 优先队列 (Phase 2)

1. `ExportPanel.tsx` (状态深渊)
2. `ProjectSettingsPage.tsx` (逻辑缠绕)
3. `WritingStatsPanel.tsx` (视觉异端)
4. `EditorTheme.tsx` (视觉异端)
