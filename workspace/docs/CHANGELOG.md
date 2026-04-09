## [Unreleased]
### Added
- P2 Shared UI 扩充：在 `workspace/apps/web/src/components/ui` 创建了 `Card`、`Modal`、`Tabs` 基础原子组件，支持 8px 呼吸网格与语义化 Token (`bg-ivory`, `border-border`, `text-ink` 等)。
- 对 `ProjectDashboard` 和 `ProjectSettingsPage` 页面进行了重构，使用新创建的 `Card`、`Modal`、`Tabs` 替换了原有的硬编码 HTML 结构。
- 补充重构交付状态：最近一次 Playwright E2E 已通过，当前结论为“功能链路通过，但视觉走查仍有待补风险”。

### Fixed
- 修复 `WorkbenchShell` 右栏与 `KBCharacterPanel` 固定列表宽度的冲突：工作台右栏改为语义化暖色面板宽度，角色知识库列表栏改为响应式 `clamp` 宽度；同时为顶栏导出项目与通知中心补上更易发现的可见标签。
- 修复 `workspace` 根级 `npm run check` 的 Python 门禁阻塞：新增 `ensure:python` 自举脚本，在本地与 CI 中统一自动创建 `.venv` 并同步 `.[dev]` 依赖，根级门禁中的 `ruff` 校验不再因环境缺失而提前失败；后端 `pytest` / `mypy` 保留为独立脚本执行。
- 修复了 `useAutoSave` Hook 中由于旧内容闭包和竞态导致的自动保存 bug。
- 将 `AuthContext.tsx` 中的 `remember_me` 对齐为 `rememberMe` 以符合 API Contract。
- 修改了 `App.tsx`，现在 `DevNavigation` 仅在开发环境中可见（基于 `import.meta.env.DEV`）。
- 增加了多个未覆盖的测试用例，当前 `npm run test:web` 已通过，且覆盖率满足 73% 阈值。
