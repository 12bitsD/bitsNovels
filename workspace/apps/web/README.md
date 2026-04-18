# bitsNovels Web

> `apps/web` 是 bitsNovels 的前端应用，负责项目页、写作工作台、知识库、AI 面板、导出备份和通知中心。

## 目录职责

- `src/main.tsx`：应用入口
- `src/App.tsx`：路由与页面壳
- `src/components/WorkbenchShell/`：写作工作台主壳
- `src/components/ui/`：共享 UI 原子组件
- `src/features/epic-1/`：认证、项目、卷章、目标、设置
- `src/features/epic-2/`：知识库、Parser、世界观设定
- `src/features/epic-3/`：编辑器、快照、统计、备注、专注模式
- `src/features/epic-4/`：AI 配置、Story Writer、Story Copilot
- `src/features/epic-5/`：导出、备份、模板、恢复
- `src/features/epic-6/`：通知中心
- `src/hooks/`：通用 hooks
- `src/mocks/`：MSW handlers
- `src/test/setup.ts`：Vitest 初始化

## 常用命令

在当前目录执行：

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
```

如果需要同步 API 类型，请回到 `workspace/` 根目录执行：

```bash
npm run generate:api-types
```

## 本地联调

- `npm run dev` 默认启动 Vite
- `/api` 会代理到 `http://127.0.0.1:8001`
- 开发环境是否启用前端 mock 由 `apps/web/.env.local` 中的 `VITE_ENABLE_MOCK` 控制
- 默认推荐 `VITE_ENABLE_MOCK=false`，直接联调真实后端

## 测试与质量

- 单元/组件测试：Vitest + Testing Library + jsdom
- Mock：MSW
- 覆盖率门槛：`vite.config.ts` 中要求 `lines >= 73%`
- 真实链路 E2E 位于 `workspace/e2e/`，不在本目录执行

## 开发入口建议

- 改页面或业务交互：优先从 `src/features/epic-*` 进入
- 改工作台布局：从 `src/components/WorkbenchShell/WorkbenchShell.tsx` 进入
- 改 API 请求：从 `src/api/client.ts` 或对应 feature hook 进入
- 改共享样式/基础组件：从 `src/components/ui/` 进入

## 相关文档

- 工程结构：`../../docs/ENGINEERING_WORKSPACE.md`
- 项目协作约束：`../../AGENTS.md`
- 需求与契约：`../../specs/epic-N/fe.md`、`../../specs/epic-N/contract.md`
