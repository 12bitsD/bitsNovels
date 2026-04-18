# 技术选型决策记录

> 本文档保留 Sprint 0 的技术决策，同时补充“当前代码已实际落地到什么程度”，避免规划栈与实现栈混淆。

---

## 阅读方式

本文分成两层：

- **目标架构**：项目长期决策，不代表当前仓库已经全部落地
- **当前实现**：根据仓库代码、依赖和运行方式确认的现状

如果文档与代码不一致，以当前代码和 `workspace/package.json`、`workspace/apps/web/package.json`、`workspace/pyproject.toml` 为准。

---

## 目标架构决策

| 层级 | 决策 | 决策理由 |
|------|------|---------|
| 前端框架 | React + TypeScript | 生态成熟，AI coding 友好，组件化能力强 |
| 编辑器 | TipTap 核心 | 基于 ProseMirror，适合富文本与 AI 写作集成 |
| CSS | Tailwind CSS | 设计令牌清晰，适合快速迭代 |
| 前后端类型同步 | OpenAPI + openapi-typescript | 后端契约可直接生成前端 TS 类型 |
| 后端运行时 | Python 3.11+ + FastAPI | AI 生态成熟，接口建模与 OpenAPI 体验好 |
| 任务队列 | ARQ + Redis | 为异步 AI / 导出 / 批任务预留 |
| 数据库 | PostgreSQL + pgvector | 结构化数据与向量检索同栈 |
| 文件存储 | S3 兼容对象存储 | 导出、备份、恢复文件统一存储 |
| 认证 | JWT + OAuth | 支持站内登录与第三方登录 |

这些决策仍然是项目目标方向，但不应被表述为“当前仓库已全部安装并运行”。

---

## 当前代码实际落地

### 前端

| 类别 | 当前实现 |
|------|---------|
| 框架 | React 19 + TypeScript 5.9 |
| 构建工具 | Vite 8 |
| 路由 | React Router 7 |
| 样式 | Tailwind CSS 4 + 语义化设计 token |
| 数据获取 | openapi-fetch + TanStack Query |
| 编辑器 | TipTap React（当前测试环境含 mock） |
| 交互组件 | dnd-kit、lucide-react |
| 图表 | Recharts |
| 测试 | Vitest + Testing Library + jsdom + MSW |

### 后端

| 类别 | 当前实现 |
|------|---------|
| 框架 | FastAPI |
| 运行时 | Python 3.11 |
| 配置 | Pydantic Settings |
| 模型 | Pydantic v2 |
| 代码组织 | `routes/ + services/ + models/` 分层 |
| 数据持久化 | 当前以 `app.state` / fake in-memory store 为主 |
| 测试 | pytest + pytest-cov |
| 质量门禁 | mypy + ruff |

### AI Provider

| 类别 | 当前实现 |
|------|---------|
| Provider 切换 | `LLM_PROVIDER=moonshot | mimo` |
| Provider 接入 | `moonshot_client.py`、`mimo_client.py` |
| 配置层 | 系统默认值 + 项目级 AI 配置接口 |
| 结果协议 | `text / diff / suggestions / names` 四类 payload |

---

## 当前依赖清单

### 后端实际依赖

当前 `workspace/pyproject.toml` 已安装/声明的核心依赖：

```text
fastapi
uvicorn[standard]
pydantic
pydantic-settings
httpx
pytest
pytest-cov
mypy
ruff
```

说明：`sqlalchemy`、`alembic`、`asyncpg`、`pgvector`、`arq`、`redis`、`boto3` 等属于目标架构方向，目前并未在本仓库依赖清单中正式落地。

### 前端实际依赖

当前 `workspace/apps/web/package.json` 的核心包：

```text
react
react-dom
react-router-dom
typescript
@tanstack/react-query
@tanstack/react-virtual
openapi-fetch
@tiptap/react
@tiptap/starter-kit
@dnd-kit/*
lucide-react
recharts
tailwindcss
vite
vitest
msw
```

---

## 类型同步方案

当前方案已经落地：

1. 后端导出 `workspace/server/openapi.json`
2. 根工作区执行 `npm run generate:api-types`
3. 使用 `openapi-typescript` 生成 `workspace/packages/api-types/src/generated.ts`
4. 前端通过 `@bitsnovels/api-types` 消费共享类型

这部分是当前仓库中最稳定、最应优先遵循的契约链路。

---

## 运行与联调现状

- 前端日常开发通过 Vite 运行，默认代理 `/api -> http://127.0.0.1:8001`
- Playwright E2E 独立拉起后端 `8000` 和前端 `5173`
- 当前最适合表述为：**单仓库全栈联调已跑通，基础设施分层完成，持久化与异步基础设施仍在演进中**

---

## V1 Scope 边界

当前仍坚持以下边界：

- 不做跨项目全局搜索
- 不做多人协作 / 权限系统
- 不做移动端适配（以桌面创作工作台为主）
- 导出格式以 `DOCX / TXT / PDF / Markdown` 为准，不包含 EPUB

---

## 调研依据

- Sprint 0 编辑器选型：TipTap vs Slate
- Sprint 0 后端选型：Node.js vs Python vs Bun
- 决策冻结时间：2026-03-23
- 实现现状同步时间：2026-04-19
