# DOC_ORGANIZATION · 文档体系使用指南

> 本文件是**给人和 Agent 共同阅读**的文档导航手册。人读它了解"文档在哪、怎么用"，Agent 读它知道"开工前应该先读什么"。

------

## 文档体系全景

```
bitsNovels/
│
├── 根目录 · AI 每次启动必读
│   ├── README.md              ← 项目入口，人类第一眼看到的页面
│   ├── CONTEXT.md             ← 项目上下文：做什么、现在什么阶段、下一步
│   ├── DECISIONS.md           ← 设计决策的 Why（不是 What）
│   ├── CONSTRAINTS.md         ← 非功能约束表（性能/安全/兼容性）
│   │
│   ├── DESIGN_SYSTEM.md      ← 视觉与交互规范（跨模块，全局）
│   ├── USER_STORIES.md        ← 完整需求文档（所有 Epic / User Story）
│   │
│   └── CHANGELOG.md           ← 变更记录（每次改动记录哪条需求变了）
│
└── （代码上线后）按模块可追加：
    ├── auth/SPEC.md           ← 模块级需求（选读，USER_STORIES.md 已有则不重复）
    └── auth/INTERFACES.md    ← 模块级接口约束（选读）
```

**核心原则**：

- 根目录所有 `.md` 文件**平铺在同一层**，不建子目录。文件名即含义，Agent 不需要理解目录层级就能被精确告知"读哪个文件"。
- 跨模块文件（如 `DESIGN_SYSTEM.md`）和模块文件（如 `auth/SPEC.md`）放同一层，文件名自己表达范围。

------

## 文件职责表

| 文件 | 谁写 | 谁读 | 什么时候读 |
|---|---|---|---|
| **README.md** | Owner | 所有人 | 项目第一眼 |
| **CONTEXT.md** | Owner | 人 + Agent | 每次新任务启动前，Agent 需要确认上下文时 |
| **DECISIONS.md** | Owner | 人 + Agent | 架构讨论时、遇到"为什么这么设计"问题时 |
| **CONSTRAINTS.md** | Owner | 人 + Agent | **开工前必读**，性能/安全/兼容性红线 |
| **DESIGN_SYSTEM.md** | Owner | 人 + Agent | UI 实现前必读 |
| **USER_STORIES.md** | Owner | 人 + Agent | 需求澄清时、任务拆解时 |
| **CHANGELOG.md** | 所有人 | 所有人 | 每次提交时追加 |

### Agent 开工检查清单（每次任务前执行）

```
[ ] 1. read CONTEXT.md           → 确认项目当前阶段
[ ] 2. read CONSTRAINTS.md       → 确认性能/安全/兼容性硬约束
[ ] 3. read 相关 SPEC 文件       → 确认要做的是什么（WHAT）
[ ] 4. read DESIGN_SYSTEM.md     → 确认 UI/视觉要求（如果有前端改动）
[ ] 5. read DECISIONS.md         → 确认相关设计决策的 Why（如果遇到架构疑问）
```

------

## 文件命名约定

| 前缀 | 含义 | 示例 |
|---|---|---|
| 无前缀 | 全局/根级文档，跨所有模块 | `CONTEXT.md`、`DESIGN_SYSTEM.md` |
| `SPEC_` | 模块级需求规范 | `SPEC_AUTH.md`、`SPEC_EDITOR.md` |
| `INTERFACES_` | 模块级接口约束 | `INTERFACES_AUTH.md`、`INTERFACES_EDITOR.md` |
| `PROCESS_` | 流程文档（人读或按需发给 Agent） | `PROCESS_TDD.md` |

**规则**：

- 所有文件名使用 **kebab-case**（小写 + 连字符）
- 全局文档无前缀，直接用含义命名（如 `CONTEXT`、`DECISIONS`）
- 模块文档用 `SPEC_` 或 `INTERFACES_` 前缀 + 模块名

------

## 变更管理流程

### Agent 提交规范

每次 commit message 必须包含：

```
类型: 简短描述

- 改了什么：
- 为什么改：（引用 DECISIONS.md 的决策编号，如 D-007；或引用 USER_STORIES.md 的需求编号，如 US-3.1）
- 怎么验证：（描述自验方式）
```

**类型前缀**：`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`

**示例**：
```
feat: 实现编辑器撤销/重做功能

- 改了什么：实现了 Ctrl+Z 撤销和 Ctrl+Y 重做，撤销栈深度 200 步
- 为什么改：USER_STORIES.md US-3.1 AC#2
- 怎么验证：手动在编辑器输入文字，执行撤销/重做，确认栈行为符合预期
```

### CHANGELOG.md 追加规则

每次 commit 后，在 `CHANGELOG.md` 顶部追加一条记录，格式：

```
## YYYY-MM-DD · [commit hash] · [简短描述]

**需求关联**：US-X.X 或 D-XXX
**变更文件**：列出变更的文件
**变更摘要**：一句话描述
```

------

## 文档更新规则

| 场景 | 谁负责更新 | 更新什么 |
|---|---|---|
| 新功能规划落地 | Owner | CONTEXT.md（更新阶段）、DECISIONS.md（如有新决策） |
| 需求变更 | Owner + Agent | USER_STORIES.md 更新对应 US + CHANGELOG 记录 |
| 架构决策落地 | Agent（由 Owner 指派） | DECISIONS.md 补充技术选型 Why |
| 约束被违反 | Agent | 立即上报，不自行修改 CONSTRAINTS.md |
| 发现文档错误 | 任何人 | 修复 + CHANGELOG 记录 |

**Agent 永远不主动删除** `CONTEXT.md`、`CONSTRAINTS.md`、`DECISIONS.md` 中的内容，只能追加或修正。

------

## 向后兼容

> ⚠️ 文档体系的变更（如文件重命名、新增前缀约定）需要同步更新本文档 `DOC_ORGANIZATION.md`。

文档格式变更记录在 `CHANGELOG.md` 中，引用变更决策编号。

------
