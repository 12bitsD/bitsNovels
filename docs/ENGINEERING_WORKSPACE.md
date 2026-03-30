# bitsNovels · 工程工作区说明

> 本文档只回答一件事：前端、后端、共享包、测试、脚本分别放在哪里，开发时从哪里进入。

## 当前目录

```text
bitsNovels/
├── workspace/                  # 所有工程代码与工程配置统一放这里
│   ├── apps/
│   │   └── web/                # 前端应用
│   │       ├── src/
│   │       │   ├── App.tsx
│   │       │   ├── App.test.tsx
│   │       │   ├── index.css
│   │       │   ├── main.tsx
│   │       │   └── test/
│   │       │       └── setup.ts
│   │       ├── index.html
│   │       ├── package.json
│   │       ├── tsconfig*.json
│   │       └── vite.config.ts
│   ├── server/                 # 后端应用
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── openapi.json
│   │   └── tests/
│   │       └── test_app.py
│   ├── packages/
│   │   └── api-types/          # OpenAPI 生成的共享类型包
│   │       ├── package.json
│   │       └── src/
│   │           └── generated.ts
│   ├── scripts/                # 平台脚本
│   │   ├── export_openapi.py
│   │   ├── run_export_openapi.mjs
│   │   └── validate_api_types.mjs
│   ├── .github/workflows/ci.yml
│   ├── package.json
│   ├── pyproject.toml
│   └── .env.example
```

## 前端

- 代码入口：`workspace/apps/web/src/main.tsx`
- 页面壳：`workspace/apps/web/src/App.tsx`
- 测试入口：`workspace/apps/web/src/App.test.tsx`
- 测试配置：`workspace/apps/web/src/test/setup.ts`
- 构建与测试配置：`workspace/apps/web/vite.config.ts`
- 包管理：`workspace/apps/web/package.json`

## 后端

- 应用入口：`workspace/server/main.py`
- 环境配置：`workspace/server/config.py`
- 路由模块（Sprint 2 拆分）：`workspace/server/routes/`（含 us14~18）
- 健康检查契约来源：`workspace/server/openapi.json`
- 测试入口：`workspace/server/tests/test_app.py`
- Python 依赖与 pytest/mypy/ruff 配置：`workspace/pyproject.toml`

## 共享包

- `workspace/packages/api-types/src/generated.ts` 是前后端共享的 API 类型产物
- 生成来源是 FastAPI 的 OpenAPI，不手改生成文件

## 平台脚本

- 在 `workspace/` 目录执行 `npm run generate:api-types`：导出 OpenAPI 并生成 TypeScript 类型
- 在 `workspace/` 目录执行 `npm run check`：统一执行 lint、typecheck、test
- 在 `workspace/` 目录执行 `npm run build`：生成类型后构建前端
- 在 `workspace/` 目录执行 `npm run verify:generated`：校验生成产物没有漂移

## 开发约束

- 根目录只保留文档、规范和 `workspace/`
- 前端代码放 `workspace/apps/web/`
- 后端代码放 `workspace/server/`
- 共享类型放 `workspace/packages/api-types/`
- 平台脚本放 `workspace/scripts/`
- 新增测试优先放到各自应用目录内部，不混放到根目录
