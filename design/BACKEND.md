# bitsNovels · 后端架构规范

> 技术栈决策见 `docs/decisions/tech-stack.md`。本文件只描述架构规范，供 BE Agent 实现时对齐。

---

## 1. 架构概览

```
                    ┌─────────────────┐
                    │   Client (FE)   │
                    └────────┬────────┘
                             │ HTTPS / SSE
                    ┌────────▼────────┐
                    │   FastAPI App   │  认证 · 路由 · 限流
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────┐ ┌───────▼────┐ ┌──────▼──────┐
     │  Auth       │ │  Core API  │ │  AI Tasks   │
     │  (JWT/OAuth)│ │  (业务逻辑) │ │  (ARQ队列)  │
     └─────────────┘ └──────┬────┘ └──────┬──────┘
                             │              │
              ┌──────────────┼──────────────┘
              │              │
     ┌────────▼────┐ ┌───────▼────┐
     │ PostgreSQL  │ │  pgvector  │  知识库向量检索
     │  (主数据)    │ │  (同实例)   │
     └─────────────┘ └────────────┘
                             │
                    ┌────────▼────────┐
                    │   AI Provider   │  OpenAI / Claude（可配置）
                    └─────────────────┘
```

**核心原则**：
- 同步请求（编辑/保存/查询）走 REST API，p99 < 200ms
- AI 生成任务（续写/解析/润色）走 ARQ 异步队列（🔲 Sprint 4+ 实现）
- 流式输出走 SSE（Server-Sent Events）（🔲 Sprint 4+ 实现）
- pgvector 与主库同实例，V1 不引入独立向量服务

---

## 2. API 设计规范

### 通用约定

| 规则 | 说明 |
|------|------|
| 认证方式 | Bearer JWT Token |
| 错误格式 | `{ "error": { "code": "string", "message": "string", "details": {} } }` |
| 成功响应 | HTTP 200/201，body 为 JSON |
| 分页 | `?page=1&limit=20`，返回 `{ "data": [], "total": N, "page": N, "limit": N }` |
| 时间格式 | ISO 8601 UTC（`2026-03-20T08:00:00Z`） |
| 路径前缀 | 所有接口以 `/api/` 开头 |

### 核心端点索引

完整端点定义在各 Epic 的 `contract.md` 里。以下为跨 Epic 全局索引：

| Epic | 路径前缀 | 说明 | 状态 |
|------|---------|------|------|
| Epic 1 | `/api/auth/`，`/api/projects/` | 认证 + 项目管理 | ✅ 已实现 |
| Epic 3 | `/api/projects/:id/volumes/`，`/api/projects/:id/chapters/` | 卷章编辑器 | ✅ 已实现 |
| Epic 2 | `/api/projects/:id/kb/` | 知识库 | 🔲 Sprint 4 |
| Epic 4 | `/api/ai/tasks/` | AI 任务 | 🔲 Sprint 4+（ARQ队列） |
| Epic 5 | `/api/projects/:id/exports/`，`/api/projects/:id/backups/` | 导出备份 | 🔲 Sprint 8 |
| Epic 6 | `/api/users/me/` | 用户设置 | ✅ US-6.6已实现 |

### SSE 流式输出规范

AI 续写等长时间任务使用 SSE 推送：

```
GET /api/ai/tasks/:taskId/stream
→ data: {"type": "chunk", "content": "逐字内容..."}
→ data: {"type": "done"}
→ data: {"type": "error", "message": "原因"}
```

---

## 3. AI 任务队列规范

### 优先级

| 优先级 | 值 | 触发场景 |
|--------|---|---------|
| 高 | 10 | 用户手动触发（立即响应感） |
| 普通 | 5 | 切换章节自动解析 |
| 低 | 1 | 后台批量解析 |

### 并发上限

| 任务类型 | Worker 并发 |
|---------|------------|
| Parser（章节解析） | 最多 5 个并行 |
| AI 续写/润色 | 最多 3 个并行 |
| 文件导出 | 最多 2 个并行 |

### 超时与重试

| 规则 | 值 |
|------|---|
| 单任务超时 | 60 秒 |
| 超时后重试 | 自动重试 1 次 |
| 再失败 | 标记 `failed`，写入错误原因，通知前端 |

### Parser 管道（🔲 Sprint 4+ 实现）

```
章节内容变更 → 60s 防抖 → 写入 ARQ 队列（priority 按触发类型）
    ↓
Worker 消费 → 调用 AI Provider → 提取实体（角色/地点/道具/势力/伏笔）
    ↓
写入知识库表 → 更新 chapter.parse_status = 'parsed' / 'failed'
    ↓
SSE 通知前端状态变更
```

### AI 续写管道（🔲 Sprint 4+ 实现）

```
用户触发 → 构建上下文（当前章节全文 + 前章末 2000 字 + KB 相关条目 + 世界观设定）
    ↓
写入 ARQ 队列（priority=10）→ Worker 调用 AI Provider 流式生成
    ↓
SSE 逐字推送 → 前端展示 AI 生成内容（带标记）
    ↓
用户采纳 → 写入 chapter.content ｜ 用户放弃 → 丢弃
```

---

## 4. 存储规范

| 数据类型 | 方案 | 说明 |
|---------|------|------|
| 章节正文 / 快照 | PostgreSQL TEXT | 结构化查询 + 全文搜索 |
| 知识库实体 | PostgreSQL JSONB | 灵活字段，按类型分表 |
| 知识库向量 | pgvector（同库） | HNSW 索引，V1 百万级向量足够 |
| 导出文件 / 备份 | S3 兼容存储 | 大文件，7 天签名 URL |
| AI 任务结果 | PostgreSQL JSONB（ai_tasks 表） | 临时缓存，TTL 后清理 |

---

## 5. 安全规范

| 机制 | 实现 |
|------|------|
| 认证 | JWT Bearer Token，rememberMe=30d / 默认 24h |
| 密码 | bcrypt，≥8位，包含大小写字母+数字 |
| OAuth | Google + GitHub，access_token 不暴露前端 |
| 项目隔离 | 所有查询强制校验 `user_id`，禁止跨用户访问 |
| AI 调用 | 后端内部调用，不暴露 API Key 到前端 |
| 限流 | 100 req/min 每用户，AI 任务额外限制 |
| 注入防护 | SQLAlchemy 参数化查询，Pydantic 入参校验 |

---

## 6. 项目目录结构

### 当前已落地（脚手架 + Sprint 1 + Sprint 2）

```
server/
├── main.py                 ← FastAPI app 入口（含路由定义）
├── config.py               ← 环境变量 + 配置（Pydantic Settings）
├── openapi.json            ← 自动生成 OpenAPI 文档
├── __init__.py
├── routes/                 ← 路由模块（Sprint 2 拆分）
│   ├── us14_settings.py   ← 项目设置
│   ├── us15_outline.py    ← 卷章目录
│   ├── us16_goals.py      ← 写作目标
│   └── us18_archive.py    ← 项目归档
└── tests/                  ← 测试（FakeDb + TestClient）
    ├── conftest.py          ← Pytest fixtures（已扩展 volumes/chapters/goals/writing_stats/trash）
    ├── test_app.py          ← 健康检查
    ├── epic_1/              ← US-1.1~1.8 红灯测试
    │   ├── test_us11_auth_red.py
    │   ├── test_us12_projects_list_red.py
    │   ├── test_us13_create_project_red.py
    │   ├── test_us14_settings_red.py
    │   ├── test_us15_outline_red.py
    │   ├── test_us16_goals_red.py
    │   └── test_us18_archive_red.py
    └── engineering/
        └── test_platform_contract_red.py
```

> **说明**：当前使用内存 FakeDb 模拟数据库，待 V2 接入真实 PostgreSQL 后补充 `database.py`。

### 目标结构（后续 Sprint 逐步实现）

```
server/
├── main.py                 ← FastAPI app 入口
├── config.py               ← 环境变量 + 配置
├── database.py             ← SQLAlchemy 连接（V2 接入 PostgreSQL）
├── auth/                   ← JWT / OAuth 逻辑
├── epic_1/                 ← 项目管理模块
│   ├── router.py
│   ├── service.py
│   ├── models.py
│   └── tests/
├── epic_2/                 ← 知识库模块
├── epic_3/                 ← 编辑器模块
├── epic_4/                 ← AI 写作模块
├── epic_5/                 ← 导出备份模块
├── epic_6/                 ← 系统设置模块
├── workers/                ← ARQ Worker 定义
│   ├── parser_worker.py
│   ├── ai_worker.py
│   └── export_worker.py
└── shared/                 ← 跨模块共享工具
    ├── pagination.py
    ├── exceptions.py
    └── storage.py
```
