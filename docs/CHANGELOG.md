# bitsNovels · 更新日志

> 所有重大文档变更均记录于此。语义化版本号遵循 vMAJOR.MINOR.PATCH。

------

## v0.3.2（2026-03-26）

## v0.3.3（2026-03-26）

**变更类型：** Sprint 1 Epic-1 后端主链路转绿与看板同步

### 后端实现

- 完成 US-1.2 项目列表与仪表盘主链路：`GET /api/projects`、`GET /api/projects/:projectId`、`POST /api/projects/:projectId/archive`、`DELETE /api/projects/:projectId`
- 完成 US-1.3 创建项目主链路：`POST /api/projects`（空白创建、字段校验、同用户重名约束、基础事务防护）
- 新增并转绿 US-1.2 删除项目确认名测试场景，后端 `DELETE /api/projects/:projectId` 已实现确认名校验与删除后不可访问

### 测试结果

- `npm run test:backend` 通过（33 passed），覆盖率 92.12%

### 文档同步

- 更新 `AGENTS.md` Sprint 1 看板：US-1.1/1.2/1.3 的 BE 状态改为 ✅
- US-1.1 看板备注补充“契约已冻结（specs/epic-1/contract.md）”

---

**变更类型：** VSCode 后端测试入口配置

### 开发体验

- 更新 `.vscode/settings.json`，将 Python 测试发现与执行目录固定到 `workspace/`
- 新增 `.vscode/tasks.json`，提供后端 `pytest`、`mypy`、`ruff` 任务入口

---

## v0.3.1（2026-03-26）

**变更类型：** Sprint 1 后端测试基建（TDD 红灯集）

### 后端测试

- 新增 `server/tests/conftest.py`，提供 mail / oauth / session / db 测试夹具
- 新增工程层红灯测试：错误结构、认证守卫、时间格式、分页契约、会话 TTL
- 新增 US-1.1 红灯测试：注册、邮箱验证、OAuth、登录会话策略
- 新增 US-1.2 红灯测试：项目列表鉴权、用户隔离、筛选排序搜索、归档只读
- 新增 US-1.3 红灯测试：创建项目字段校验、唯一性、默认返回结构、事务原子性

### 文档同步

- 更新 `AGENTS.md` Sprint 1 看板，新增“Sprint 1 测试基建”完成项
- 更新 `docs/SPRINT_LOG.md`，补充 Sprint 1 测试基建完成记录

---

## v0.3.0（2026-03-26）

**变更类型：** Sprint 1 脚手架初始化

### 工程骨架

- 新增根级 monorepo 工作区，接入 `apps/web`、`packages/api-types`、`server/`
- 新增 FastAPI 应用骨架与 `/api/health` 健康检查
- 新增 React + TypeScript + Tailwind 前端壳页面
- 新增 `.env.example` 与平台级脚本入口

### 测试与类型生成

- 新增前端冒烟测试、后端健康检查测试、API 类型生成校验
- 新增 OpenAPI 导出脚本与 `openapi-typescript` 生成链路
- 新增 `packages/api-types/src/generated.ts` 作为共享 API 类型产物

### CI/CD

- 新增 GitHub Actions CI 工作流
- 接入 lint、typecheck、test、build 校验链路
- 更新 `AGENTS.md` 与 `docs/SPRINT_LOG.md`，标记脚手架阶段完成

---

## v0.2.0（2026-03-23）

**变更类型：** Sprint 0 关闭 · 全栈技术选型完成 · 文档结构优化

### 后端技术栈确认

- 确认 **Python 3.11+ + FastAPI** 为后端运行时与框架
- 确认 **ARQ + Redis** 为任务队列方案
- 确认 **pgvector**（PostgreSQL 扩展）为向量检索方案，V1 不引入独立向量服务
- 确认 **openapi-typescript** 为前后端类型同步方案
- 新增 `docs/research/BACKEND_TECH_STACK_RESEARCH.md` — Node.js vs Python vs Bun 深度调研

### 编辑器功能新增

- 确认编辑器集成 **`@tiptap/extension-markdown`**，支持 Markdown 语法实时渲染（类 Typora）
- 更新 `specs/EPIC/EPIC3/FE.md` US-3.1 AC，补充 Markdown 实时渲染说明
- 更新 `design/FRONTEND.md` 技术栈章节

### 导出格式变更

- **V1 去除 EPUB 导出**，新增 **Markdown 导出**
- 导出格式变更为：DOCX / TXT / PDF / Markdown
- 更新 `specs/EPIC/EPIC5/FE.md`、`BE.md`、`context.md`，`design/BACKEND.md`

### 文档结构优化

- **删除根目录 `USER_STORIES.md`**，以 `specs/EPIC/` 为唯一需求真相源（方案 B）
- 删除旧版 `docs/research/BACKEND_FRAMEWORK_RESEARCH.md`（已被新调研覆盖）
- 更新 `docs/CONTEXT.md`：技术栈全部标记为 ✅，阶段更新为 Sprint 1
- 更新 `docs/SPRINT_LOG.md`：Sprint 0 标记完成，Sprint 1 正式开始

---

## v0.1.1（2026-03-20）

**变更类型：** 技术栈决策

### 前端技术栈确认

- 确认 **React + TypeScript** 为前端框架
- 确认 **TipTap 核心**（免费开源）为编辑器引擎，Diff/批注自研
- 确认 **Tailwind CSS** 为 CSS 方案
- 新增 `docs/research/EDITOR_ENGINE_RESEARCH.md` — TipTap vs Slate 深度调研

决策依据：调研文档 8 维度对比，TipTap 在 AI 写作集成、维护性、React+TS 体验均优于 Slate。

### 文档更新

- `docs/CONTEXT.md` — 技术栈表格更新为已确认状态
- `design/FRONTEND.md` — 技术栈占位章节更新为已确认

---

## v0.1.0（2026-03-20）

**变更类型：** 新增文档架构

### 文档结构

- 新增 `specs/EPIC/EPIC1~6/` — 每个 Epic 含 FE.md + BE.md + context.md
- 新增 `docs/CONTEXT.md` — 项目阶段、技术栈候选、Epic 依赖顺序
- 新增 `specs/EPIC/INDEX.md` — Epic 路由表、US 依赖链
- `specs/USER_STORIES.md` 重命名为 `USER_STORIES.md` 并移至根目录

### 流程文档

- 新增 `process/TDD.md` — TDD 工作流、DoD 清单、Epic 开发顺序
- 新增 `process/CONSTRAINTS.md` — NFR 约束表

### 设计文档

- 新增 `design/FRONTEND.md` — 前端视觉设计规范（待 Sprint 0 后完善）
- 新增 `design/BACKEND.md` — 后端架构规范（待 Sprint 0 后完善）

### 项目管理

- 新增 `docs/CHANGELOG.md` — 本文件
- 新增 `docs/SPRINT_LOG.md` — Sprint 跟踪文档

### 清理

- 删除旧文档：`INDEX.md`、`design/DECISIONS.md`、`design/DESIGN_SYSTEM.md`
- 删除旧文档：`docs/SPRINT_LOG.md`、`process/CONSTRAINTS.md`、`process/PROCESS_TDD.md`

### 作者

bitsNovels Team

------

## 后续变更规则

每次完成以下操作时，必须在 CHANGELOG 中新增条目：

| 变更类型 | 记录内容 |
|----------|----------|
| 新增 Epic 或 US | 新增 Epic 编号、涉及 US、简述 |
| 新增或修改数据结构 | 变更的文件、变更内容摘要 |
| 新增或修改 API 接口 | 接口路径、请求/响应变更 |
| 约束值变更 | 约束名称、旧值→新值、变更原因 |
| 技术栈决策落地 | 选定的技术栈、决策依据 |
| Sprint 完成 | Sprint 编号、完成内容、未完成内容 |

------

## 版本号规则

- **MAJOR**：架构级变更（如前后端分离方案、数据库变更）
- **MINOR**：新增 Epic、新增重要功能模块
- **PATCH**：文档修正、小幅补充
