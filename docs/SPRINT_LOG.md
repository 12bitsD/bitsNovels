# bitsNovels · Sprint 跟踪

> 每个 Sprint 的目标、进展和阻塞项记录于此。

------

## Sprint 0 · 规划阶段

**时间：** 2026-03-20 ~ 2026-03-23

**状态：** ✅ 已完成

### 目标

- [x] 确定文档架构（per-Epic FE/BE/context 拆分）
- [x] 完成全部 6 个 Epic 的需求拆分文档
- [x] 建立 TDD 工作流和 NFR 约束文档
- [x] 完成 FE 技术栈选型决策
- [x] 完成 BE 技术栈选型决策
- [x] 确认架构设计（design/BACKEND.md）

### 已完成

| 完成项 | 涉及文件 | 日期 |
|--------|----------|------|
| 文档架构设计 | specs/EPIC/INDEX.md, docs/CONTEXT.md | 2026-03-20 |
| EPIC1~6 拆分（FE.md + BE.md + context.md） | specs/EPIC/EPIC1~6/ | 2026-03-20 |
| TDD 工作流文档 | process/TDD.md | 2026-03-20 |
| NFR 约束表 | process/CONSTRAINTS.md | 2026-03-20 |
| 设计文档框架 | design/FRONTEND.md, design/BACKEND.md | 2026-03-20 |
| FE 技术栈确认（React+TS + TipTap + Tailwind） | docs/CONTEXT.md, design/FRONTEND.md | 2026-03-20 |
| TipTap vs Slate 深度调研 | docs/research/EDITOR_ENGINE_RESEARCH.md | 2026-03-20 |
| BE 技术栈确认（Python + FastAPI + ARQ + pgvector） | design/BACKEND.md, docs/CONTEXT.md | 2026-03-23 |
| 后端技术栈深度调研（Node vs Python vs Bun） | docs/research/BACKEND_TECH_STACK_RESEARCH.md | 2026-03-23 |
| 编辑器 Markdown 实时渲染确认（@tiptap/extension-markdown） | design/FRONTEND.md, specs/EPIC/EPIC3/FE.md | 2026-03-23 |
| 导出格式变更：EPUB→Markdown，去除 EPUB | specs/EPIC/EPIC5/, design/BACKEND.md | 2026-03-23 |
| 文档真相源统一：删除根目录 USER_STORIES.md，以 specs/EPIC 为准 | — | 2026-03-23 |

### 决策记录

| 决策 | 依据 | 状态 |
|------|------|------|
| 文档架构采用 per-Epic FE/BE/context 拆分 | 解决 Agent 上下文窗口爆炸问题 | ✅ |
| Epic 开发顺序：EPIC1→3→2→4→5→6 | EPIC3 是基础，EPIC2 依赖 EPIC3 | ✅ |
| 前端框架：React + TypeScript | 生态最大，AI coding 工具支持最好 | ✅ |
| 编辑器引擎：TipTap 核心 + @tiptap/extension-markdown | AI 写作集成成本最低，类 Typora 体验 | ✅ |
| CSS 方案：Tailwind CSS | AI 生成效率最高，与 React 集成最佳 | ✅ |
| 后端运行时：Python 3.11+ + FastAPI | AI 生态一等公民，LangChain/LlamaIndex 最成熟 | ✅ |
| 任务队列：ARQ + Redis | asyncio 原生，轻量，支持优先级/重试/并发上限 | ✅ |
| 向量库：pgvector（PostgreSQL 扩展） | V1 数据量小，同栈简化架构，ACID 一致性 | ✅ |
| 前后端类型同步：openapi-typescript | FastAPI 自动生成 openapi.json → 前端 TS 类型 | ✅ |
| V1 导出格式：DOCX / TXT / PDF / Markdown（去除 EPUB） | epub-gen 生态不成熟，Markdown 更实用 | ✅ |
| V1 不支持跨项目搜索、多人协作、移动端 | Scope 控制，降低复杂度 | ✅ |
| specs/EPIC 作为需求真相源，删除根目录 USER_STORIES.md | 方案 B，避免双重维护，符合 Agent 4 文件上限约束 | ✅ |

### 复盘
- 做得好：需求文档完整度高，技术选型有调研依据，文档架构为 Agent 并行开发做了充分准备
- 可改进：BE 技术栈决策用了两轮调研（第一轮未含 Python），下次明确候选范围再启动调研

------

## Sprint 1 · 校准 Sprint

**时间：** 2026-03-23 起（预计 2 周）

**状态：** 🔄 进行中

### Sprint Goal
搭建 FE+BE 脚手架，完成 US-1.1~1.3，**跑出 Agent 开发速度基线**。故意保守，用于校准后续排期。

### 计划目标

- [ ] 搭建 FE + BE 项目脚手架（monorepo 结构）
- [ ] 配置 OpenAPI → openapi-typescript 类型生成流水线
- [ ] 搭建 CI/CD 基础流水线
- [ ] US-1.1 BE：注册 / 登录 / OAuth
- [ ] US-1.1 FE：注册 / 登录页面
- [ ] US-1.2 BE：项目列表接口
- [ ] US-1.2 FE：项目列表与仪表盘
- [ ] US-1.3 BE：创建项目接口
- [ ] US-1.3 FE：创建项目流程

### 前置依赖

- ✅ Sprint 0 全部决策完成
- ✅ Release Planning 完成（9 Sprint Roadmap 已确认）

### Sprint 结束时复盘

- 记录实际完成量 vs 计划
- 记录每个 US 实际耗时（BE + FE 分开）
- 用于校准 S2~S9 估算

------

## Sprint 2 · 未开始

**预计时间：** Week 3-4

### 计划目标

- [ ] US-1.4 项目设置
- [ ] US-1.5 卷章目录管理
- [ ] US-1.6 写作目标设定
- [ ] US-1.8 项目归档

### 前置依赖

- Sprint 1 脚手架稳定
- US-1.3 完成

------

## Sprint 3 · 未开始

**预计时间：** Week 5-6

### 计划目标

- [ ] **US-3.1 编辑器核心（XL，独占本 Sprint）**
- [ ] **US-6.6 通知中心（基础设施，同步建设）**

### 前置依赖

- US-1.3 完成（项目结构就绪）
- ⚠️ US-3.1 是最高风险节点，如 Sprint 拖延，需立即上报

------

## Sprint 4~9 · 未开始

详见 `AGENTS.md` Release Roadmap 表格。

------

## Sprint 模板（供后续使用）

```
## Sprint N · 名称

**时间：** YYYY-MM-DD 起（预计 2 周）

**状态：** 🆕 新建

### 目标
- [ ] 

### 已完成
（完成时填写）

### 进行中
（进行时填写）

### 阻塞项
（遇到时填写）

### 复盘
- 做得好：
- 可改进：
- 下个 Sprint 调整：
```
