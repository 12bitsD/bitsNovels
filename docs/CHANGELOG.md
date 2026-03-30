# bitsNovels · 更新日志

> 所有重大文档变更均记录于此。语义化版本号遵循 vMAJOR.MINOR.PATCH。

------

## v0.3.6（2026-03-30）

**变更类型：** Sprint 2 - Epic 1 项目管理完整可用（BE + FE）

### 前端新增（US-1.4/1.5/1.6/1.8）

**US-1.4 项目设置页面：**
- `ProjectSettingsPage.tsx` — 4 Tab 导航（基本信息/写作目标/AI配置/备份恢复）
- 基本信息表单 + 只读统计
- 危险操作区：归档/删除按钮（二次确认）

**US-1.5 卷章大纲：**
- `VolumeOutline.tsx` — 树形结构 + @dnd-kit 拖拽排序
- `VolumeItem.tsx` / `ChapterItem.tsx` — 可排序列表项
- 支持跨卷移动、批量选择、展开/折叠

**US-1.6 写作目标：**
- `WritingGoalPanel.tsx` — 目标设置面板
- `WritingTrendChart.tsx` — 30天趋势折线图（recharts）
- `GoalProgressRing.tsx` — 总进度环形图
- 目标达成轻量动画

**US-1.8 归档 UI：**
- 归档/取消归档按钮
- 归档后黄色只读横幅

### 前端测试

- 新增组件测试：VolumeOutline（27 tests）、WritingGoalPanel（12 tests）、ProjectSettingsPage（12 tests）
- 前端覆盖率：79.63%

### 后端新增（US-1.4/1.5/1.6/1.8）

**US-1.4 项目设置：**
- `GET /api/projects/:projectId/settings` — 获取项目设置与统计
- `PATCH /api/projects/:projectId` — 更新项目基本信息
- `DELETE /api/projects/:projectId` — 删除项目（含确认名校验）

**US-1.5 卷章目录管理：**
- `GET /api/projects/:projectId/outline` — 获取卷章大纲与统计
- `POST /api/projects/:projectId/volumes` — 创建卷
- `PATCH /api/projects/:projectId/volumes/:volumeId` — 更新卷
- `DELETE /api/projects/:projectId/volumes/:volumeId` — 删除卷（章节移入回收站）
- `POST /api/projects/:projectId/outline/reorder-volumes` — 卷排序
- `POST /api/projects/:projectId/volumes/:volumeId/chapters` — 创建章节
- `PATCH /api/projects/:projectId/chapters/:chapterId` — 更新章节
- `POST /api/projects/:projectId/chapters/reorder` — 章节排序/跨卷移动
- `POST /api/projects/:projectId/chapters/bulk-move` — 批量移动章节
- `POST /api/projects/:projectId/chapters/bulk-trash` — 批量删除章节

**US-1.6 写作目标设定：**
- `GET /api/projects/:projectId/goals` — 获取写作目标
- `PUT /api/projects/:projectId/goals` — 设置/更新目标（含范围校验）
- `DELETE /api/projects/:projectId/goals` — 清除目标
- `GET /api/projects/:projectId/writing-stats?range=30d` — 写作统计（趋势/进度/预计完成日期）

**US-1.8 项目归档：**
- `POST /api/projects/:projectId/archive` — 归档项目
- `POST /api/projects/:projectId/unarchive` — 取消归档，恢复 active 状态
- 归档项目默认在列表中隐藏（`status=archived` 时才可见）
- 归档后 PATCH 请求返回 409 Conflict

### 测试覆盖

- 后端测试： Sprint 2 epic_1 全部通过
- 新增路由模块：us14_settings.py, us15_outline.py, us16_goals.py, us18_archive.py

---

## v0.3.5（2026-03-30）

**变更类型：** Sprint 1.5 收尾质量加固

### 代码质量修复

- AuthContext 重构：logout 时清除 token 泄漏漏洞（独立文件 `src/contexts/AuthContext.tsx`）
- useFocusTrap 修复：空 Modal 场景静默失焦问题
- useAuth Hook 拆分：从 AuthContext 独立，职责更清晰
- ProjectDashboard 修复：API 返回 `{ items: [] }` 格式兼容

### 测试覆盖提升

- 前端单元测试：90 passed（79 → 90）
  - 新增 11 个测试用例（RegisterPage、LoginPage、CreateProjectModal）
  - 覆盖率：88.55% Stmts, 84.48% Branch, 75.51% Funcs, 89.69% Lines
- E2E 联调测试：14 passed（新增 Playwright）
  - US-1.1 Auth：7 tests（登录/注册/导航/真实 API）
  - US-1.2/1.3 Dashboard + CreateProject：7 tests
  - E2E 通过 Vite 代理直连真实后端，验证 FE→BE 全链路
- 后端测试：33 passed

### 新增文件

- `src/contexts/AuthContext.tsx` — 认证 Context 独立文件
- `src/hooks/useAuth.ts` — useAuth Hook 独立文件
- `e2e/auth.spec.ts` — Playwright E2E 认证测试
- `e2e/projects.spec.ts` — Playwright E2E 项目测试
- `playwright.config.ts` — Playwright 配置

---

## v0.3.4（2026-03-26）

**变更类型：** Sprint 1.5 前端架构重构（代号 A+B+C）

### 前端重构完成

- 新增 7 个共享 UI 组件（FormInput、ErrorAlert、LoadingButton、SuccessView、AuthCard、SkeletonLoader、Lucide Icons）
- 新增 3 个自定义 Hook（useApi、usePasswordValidation、useFocusTrap）
- 新增 AuthContext + AuthProvider + useAuth() 全局认证状态管理
- 8 个页面迁移至共享组件，消除 ~40% 代码重复
- Emoji 图标全面替换为 Lucide React（琥珀色主题）
- 新增跳过内容链接（WCAG 无障碍）、Modal 焦点陷阱

### 测试结果

- 前端：`npm run test` 通过（79 passed），覆盖率 84.5%
- TypeScript：0 错误

### 质量门禁修复

- AuthContext logout 安全漏洞：登出后 API 客户端仍发送旧 Bearer token（已修复）
- useFocusTrap 空 Modal 静默失焦（已修复）
- 跳过链接目标为空 div（已修复）
- prefer-const lint 错误（已修复）

### 新增文件

- `src/components/ui/` — 共享 UI 组件库
- `src/hooks/` — 自定义 Hook（useApi、usePasswordValidation、useFocusTrap）
- `src/contexts/AuthContext.tsx` — 全局认证 Context
- `src/api/client.ts` — 新增 `setAuthTokenGetter()` 模式

### 文档同步

- 更新 `docs/superpowers/plans/2026-03-26-frontend-refactor.md` — 重构实施计划
- 更新 `docs/superpowers/specs/2026-03-26-frontend-refactor-design.md` — 重构设计规范

---

## v0.3.3（2026-03-26）

**变更类型：** Sprint 1 全部完成，前后端测试全量通过

### 功能完成

- US-1.1 FE+BE：注册 / 登录 / OAuth 页面与接口
- US-1.2 FE+BE：项目列表与仪表盘页面与接口
- US-1.3 FE+BE：创建新项目（3步向导）与接口

### 测试结果

- 后端：`npm run test:backend` 通过（33 passed），覆盖率 92%
- 前端：`npm run test:web` 通过（28 passed），覆盖率 87%
- API Types：`npm run test:api-types` 通过

### 工程改进

- 新增 `src/test/setup.ts`：JSDOM 环境 localStorage polyfill，修复 MSW 移除后的测试失败
- 前端测试覆盖：LoginPage、RegisterPage、CreateProjectModal、ProjectDashboard 等组件

### 文档同步

- 更新 `docs/SPRINT_LOG.md` Sprint 1 完成记录与复盘
- `AGENTS.md` Sprint 1 看板全部标记 ✅

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
