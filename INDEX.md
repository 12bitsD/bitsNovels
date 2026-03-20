# bitsNovels · 项目索引

> bitsNovels 是 AI 辅助长篇小说创作平台。本文是所有 Agent 和开发者的单一入口点。

**一句话定位**：融合 AI 知识管理的专业长篇小说写作工作室。

------

## 路由速查

| 文件 | 用途 | 读者 |
|------|------|------|
| **项目上下文** | | |
| `docs/CONTEXT.md` | 项目阶段、技术栈候选、Epic 依赖顺序 | Agent + Human |
| `docs/CHANGELOG.md` | 所有重大变更记录 | Agent + Human |
| `docs/SPRINT_LOG.md` | Sprint 跟踪（当前 + 历史） | Agent + Human |
| **需求文档** | | |
| `USER_STORIES.md` | 完整需求（单一真相源） | Agent + Human |
| `specs/EPIC/INDEX.md` | Epic 路由表 + US 依赖链 | Agent |
| `specs/EPIC/EPIC1/FE.md` | EPIC1 前端需求 | FE Agent |
| `specs/EPIC/EPIC1/BE.md` | EPIC1 后端需求 | BE Agent |
| `specs/EPIC/EPIC1/context.md` | EPIC1 共享类型 + API 约定 | FE + BE Agent |
| `specs/EPIC/EPIC2/FE.md` | EPIC2 前端需求 | FE Agent |
| `specs/EPIC/EPIC2/BE.md` | EPIC2 后端需求 | BE Agent |
| `specs/EPIC/EPIC2/context.md` | EPIC2 共享类型 + API 约定 | FE + BE Agent |
| `specs/EPIC/EPIC3/FE.md` | EPIC3 前端需求 | FE Agent |
| `specs/EPIC/EPIC3/BE.md` | EPIC3 后端需求 | BE Agent |
| `specs/EPIC/EPIC3/context.md` | EPIC3 共享类型（Volume/Chapter/Snapshot） | FE + BE Agent |
| `specs/EPIC/EPIC4/FE.md` | EPIC4 前端需求 | FE Agent |
| `specs/EPIC/EPIC4/BE.md` | EPIC4 后端需求 | BE Agent |
| `specs/EPIC/EPIC4/context.md` | EPIC4 共享类型（AITaskType） | FE + BE Agent |
| `specs/EPIC/EPIC5/FE.md` | EPIC5 前端需求 | FE Agent |
| `specs/EPIC/EPIC5/BE.md` | EPIC5 后端需求 | BE Agent |
| `specs/EPIC/EPIC5/context.md` | EPIC5 共享类型 | FE + BE Agent |
| `specs/EPIC/EPIC6/FE.md` | EPIC6 前端需求 | FE Agent |
| `specs/EPIC/EPIC6/BE.md` | EPIC6 后端需求 | BE Agent |
| `specs/EPIC/EPIC6/context.md` | EPIC6 共享类型 | FE + BE Agent |
| **设计文档** | | |
| `design/FRONTEND.md` | 前端视觉设计规范（色彩/字体/组件） | FE Agent + Designer |
| `design/BACKEND.md` | 后端架构规范（API/数据模型/队列） | BE Agent |
| **流程文档** | | |
| `process/TDD.md` | TDD 工作流、DoD 清单、Epic 开发顺序 | Agent + Dev |
| `process/CONSTRAINTS.md` | NFR 约束表（性能/可靠性/存储/AI） | Agent + Dev |

------

## Epic 开发顺序

每个 Agent 任务最多读取 **4 个文件**。按以下顺序开发：

```
EPIC1（项目管理）  →  无前置依赖
       ↓
EPIC3（写作工作台） → 项目结构是编辑器的基础
       ↓
EPIC2（知识库）     → 依赖 EPIC3 的章节结构
       ↓
EPIC4（AI 写作）   → 依赖 EPIC2 知识库 + EPIC3 编辑器
       ↓
EPIC5（导出备份）   → 依赖 EPIC3 编辑器
       ↓
EPIC6（系统设置）  → 无业务依赖
```

详见 `docs/CONTEXT.md`（Epic 依赖顺序章节）和 `process/TDD.md`（US 开发顺序详解）。

------

## Agent 任务模板

当分配一个 US 实现任务时：

1. 读取对应的 `specs/EPIC/N/FE.md`（FE 任务）或 `specs/EPIC/N/BE.md`（BE 任务）
2. 读取 `specs/EPIC/N/context.md` 获取共享类型和 API 约定
3. 如需参考同 Epic 其他文件，从 `specs/EPIC/INDEX.md` 的路由表查找
4. 遵循 `process/TDD.md` 的红绿重构流程
5. 实现时检查 `process/CONSTRAINTS.md` 的约束是否满足
6. FE 样式遵循 `design/FRONTEND.md`，BE 架构参考 `design/BACKEND.md`
7. 完成时更新 `docs/CHANGELOG.md` 和 `docs/SPRINT_LOG.md`

------

## 跨 Epic 共享结构

| 结构 | 定义位置 | 使用方 |
|------|----------|--------|
| 用户对象 | `EPIC1/context.md` | 全局 |
| 项目对象 | `EPIC1/context.md` | EPIC1,2,3,4,5 |
| 卷/章节对象 | `EPIC3/context.md` | EPIC1,2,3,4,5 |
| 知识库实体 | `EPIC2/context.md` | EPIC2,4 |
| AI 任务类型 | `EPIC4/context.md` | EPIC2,4 |

------

## 关键约束速查

| 约束 | 值 |
|------|------|
| Agent 每任务最多读文件数 | 4 |
| 自动保存防抖 | 3 秒 |
| Parser 防抖（同一章节） | 60 秒 |
| 撤销栈深度 | ≥ 200 步 |
| 快照上限（自动/章节） | 50 个 |
| 手动快照 | 无限制 |
| 回收站保留期 | 30 天 |
| 导出文件有效期 | 7 天 |
| AI 续写默认长度 | 200~500 字 |
| Parser 并行上限 | 5 章 |

详见 `process/CONSTRAINTS.md`。
