# bitsNovels workspace · 工程变更日志

> 本文件记录 `workspace/` 范围内的工程脚本、门禁、开发流程与实现细节变更。
> 版本级与文档结构级变更请以 `docs/CHANGELOG.md` 为准，避免两处重复维护。

## [Unreleased]
### Added
- Epic 4 后端 AI 基础设施已接入真实 Provider：新增 `server/services/mimo_client.py`、`server/services/moonshot_client.py` 与统一任务分流，实现文本 / diff / suggestions / names 四类结果协议。
- Epic 4 本地环境模板补齐：新增 `apps/web/.env.example`，并扩充根级 `.env.example` 的 `LLM_PROVIDER`、`MIMO_*`、`AI_DEFAULT_*` 说明。
- P2 Shared UI 扩充：在 `workspace/apps/web/src/components/ui` 创建了 `Card`、`Modal`、`Tabs` 基础原子组件，支持 8px 呼吸网格与语义化 Token (`bg-ivory`, `border-border`, `text-ink` 等)。
- 对 `ProjectDashboard` 和 `ProjectSettingsPage` 页面进行了重构，使用新创建的 `Card`、`Modal`、`Tabs` 替换了原有的硬编码 HTML 结构。
- 补充重构交付状态：最近一次 Playwright E2E 已通过，当前结论为“功能链路通过，但视觉走查仍有待补风险”。

### Fixed
- 修复 Epic 4 AI 写作链路：`continue` 在 MiMo 下空结果回退、`outline/advice/name_gen` 的 `payloadType` 错位、`stop` 终态回放、`ai-config` 的 `resolvedConfig` 返回均已对齐。
- 修复 `EditorWorkspace` 的 AI 状态同步：默认不再误显示 `停止`，切换章节会重置 AI 草稿与订阅状态。
- 修复 `AIConfigTab`/项目设置与真实后端契约的偏差：测试改为直接 `spyOn(client.GET/PATCH)`，不再依赖 mock 真值源掩盖协议问题。
- 修复 `WorkbenchShell` 右栏与 `KBCharacterPanel` 固定列表宽度的冲突：工作台右栏改为语义化暖色面板宽度，角色知识库列表栏改为响应式 `clamp` 宽度；同时为顶栏导出项目与通知中心补上更易发现的可见标签。
- 修复 `workspace` 根级 `npm run check` 的 Python 门禁阻塞：新增 `ensure:python` 自举脚本，在本地与 CI 中统一自动创建 `.venv` 并同步 `.[dev]` 依赖，根级门禁中的 `ruff` 校验不再因环境缺失而提前失败；后端 `pytest` / `mypy` 保留为独立脚本执行。
- 修复了 `useAutoSave` Hook 中由于旧内容闭包和竞态导致的自动保存 bug。
- 将 `AuthContext.tsx` 中的 `remember_me` 对齐为 `rememberMe` 以符合 API Contract。
- 修改了 `App.tsx`，现在 `DevNavigation` 仅在开发环境中可见（基于 `import.meta.env.DEV`）。
- 修复 `App.tsx` 中 `LoadingFallback` / `DevNavigation` 的硬编码色值：改用现有 design token（`bg-parchment`、`border-border`、`text-amber` 等）以保持全站风格一致。
- 修复 `StatsTable.tsx` 的硬编码色值：替换为语义 token（`text-ink`、`border-border`、`bg-ivory`、`bg-amber-light` 等）。
- 扩大 TanStack Query 试点范围：`useWritingStats` 迁移到 `useQuery + fetchApi`，统一请求与错误处理，并保持原 Hook API 兼容。
- 长列表虚拟化落地：`KBCharacterList`、`NotificationPanel` 增加基于 `@tanstack/react-virtual` 的虚拟滚动（大数据量阈值触发）；卷/章树对超大卷章节列表启用虚拟化渲染（拖拽中自动回退为完整渲染）。
- 增加了多个未覆盖的测试用例，当前 `npm run test:web` 已通过，且覆盖率满足 73% 阈值。
- 文档去重：修正 `process/CONSTRAINTS.md` 导出格式约束，合并前端审计矩阵，并清理过时 refactor 文档与一次性测试输出文件。
