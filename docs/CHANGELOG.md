# bitsNovels · 更新日志

> 所有重大文档变更均记录于此。语义化版本号遵循 vMAJOR.MINOR.PATCH。

------

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
