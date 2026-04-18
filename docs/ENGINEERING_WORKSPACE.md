# bitsNovels · 工程工作区说明

> 本文档回答三个问题：代码放在哪里、改功能从哪里进入、前后端与测试如何对应。

## 总览

仓库根目录主要放文档、规范和协作入口，所有可执行工程代码统一放在 `workspace/`。

```text
bitsNovels/
├── AGENTS.md
├── docs/
├── design/
├── process/
├── specs/
└── workspace/
    ├── apps/
    ├── server/
    ├── packages/
    ├── e2e/
    ├── scripts/
    ├── .github/workflows/
    ├── package.json
    └── pyproject.toml
```

## workspace 目录

```text
workspace/
├── apps/
│   └── web/
│       ├── public/
│       ├── src/
│       │   ├── api/                 # openapi-fetch client
│       │   ├── components/          # WorkbenchShell 与共享 UI
│       │   ├── contexts/            # AuthContext 等全局上下文
│       │   ├── features/
│       │   │   ├── epic-1/          # 认证 / 项目 / 卷章 / 目标
│       │   │   ├── epic-2/          # 知识库 / Parser / 世界观设定
│       │   │   ├── epic-3/          # 编辑器 / 快照 / 统计 / 备注
│       │   │   ├── epic-4/          # AI 配置 / Story Writer / Copilot
│       │   │   ├── epic-5/          # 导出 / 备份 / 模板 / 恢复
│       │   │   └── epic-6/          # 通知中心
│       │   ├── hooks/               # 跨 Epic 通用 hooks
│       │   ├── mocks/               # MSW mock handlers
│       │   ├── test/                # Vitest setup
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       └── vite.config.ts
├── server/
│   ├── models/                      # Pydantic 模型
│   ├── routes/                      # FastAPI 路由，按 US/Epic 拆分
│   ├── services/                    # 业务逻辑
│   ├── tests/                       # pytest 测试
│   ├── config.py
│   ├── main.py
│   └── openapi.json
├── packages/
│   └── api-types/                   # OpenAPI 生成 TS 类型
├── e2e/                             # Playwright 真实链路测试
├── scripts/                         # OpenAPI / Python 环境 / 校验脚本
└── docs/                            # workspace 范围工程日志
```

## 前端从哪里进入

核心入口：

- `workspace/apps/web/src/main.tsx`：React 启动入口
- `workspace/apps/web/src/App.tsx`：应用路由壳
- `workspace/apps/web/src/components/WorkbenchShell/WorkbenchShell.tsx`：写作工作台主壳
- `workspace/apps/web/src/features/epic-*`：按 Epic 分组的业务实现

常见任务入口：

- 改通用组件：`workspace/apps/web/src/components/ui/`
- 改认证/项目页：`workspace/apps/web/src/features/epic-1/`
- 改知识库/Parser：`workspace/apps/web/src/features/epic-2/`
- 改编辑器：`workspace/apps/web/src/features/epic-3/`
- 改 AI：`workspace/apps/web/src/features/epic-4/`
- 改导出备份：`workspace/apps/web/src/features/epic-5/`
- 改通知：`workspace/apps/web/src/features/epic-6/`

前端测试入口：

- `workspace/apps/web/src/**/*.test.tsx`
- `workspace/apps/web/src/**/*.test.ts`
- `workspace/apps/web/src/test/setup.ts`

## 后端从哪里进入

核心入口：

- `workspace/server/main.py`：FastAPI 应用装配与路由挂载
- `workspace/server/config.py`：应用与 AI 环境配置
- `workspace/server/routes/`：接口层
- `workspace/server/services/`：业务逻辑层
- `workspace/server/models/`：请求/响应模型

当前路由按能力拆分，例如：

- `auth.py`、`projects.py`
- `us21_parser.py`、`us22_character.py`、`us210_settings.py`
- `us31_editor.py`、`us36_snapshots.py`、`us38_chapter_notes.py`
- `us41_ai.py`、`us45_copilot.py`
- `us51_export.py` ~ `us55_restore.py`
- `us66_notifications.py`

后端测试入口：

- `workspace/server/tests/`
- 其中按 `epic_1`、`epic_2`、`epic_3`、`epic_4`、`epic_5`、`epic_6`、`engineering`、`pressure` 组织

## 共享类型与契约

- `workspace/server/openapi.json`：后端导出的 OpenAPI 真值源
- `workspace/packages/api-types/src/generated.ts`：前端消费的共享类型产物
- 不要手改生成文件；统一使用 `cd workspace && npm run generate:api-types`

需求与契约文档位置：

- `specs/epic-N/fe.md`
- `specs/epic-N/be.md`
- `specs/epic-N/contract.md`

## 脚本与门禁

在 `workspace/` 目录执行：

- `npm run generate:api-types`：导出 OpenAPI 并更新共享 TS 类型
- `npm run lint`：前端 ESLint + 后端 Ruff
- `npm run typecheck`：前端 TypeScript 校验
- `npm run typecheck:backend`：后端 mypy
- `npm run test:web`：Vitest
- `npm run test:backend`：pytest
- `npm run check`：组合执行 lint、typecheck、test
- `npm run verify:generated`：检查 `openapi.json` 与 `generated.ts` 是否漂移

## 本地联调约定

- 前端开发服务器：`workspace/apps/web` 下 `npm run dev`
- Vite 代理后端：默认指向 `http://127.0.0.1:8001`
- E2E：`workspace/playwright.config.ts` 会独立拉起后端 `8000` 和前端 `5173`

## 开发约束

- 根目录尽量只保留文档、规范与 `workspace/`
- 前端代码只放 `workspace/apps/web/`
- 后端代码只放 `workspace/server/`
- 共享类型只放 `workspace/packages/api-types/`
- 自动化测试优先跟随所属模块放置，不在根目录散落
