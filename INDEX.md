# bitsNovels · 文档索引

> **TDD + 敏捷迭代**的 AI 辅助长篇小说创作平台。

---

## 文件夹职责

| 文件夹 | 存什么 | 谁读 |
|---|---|---|
| `docs/` | 项目上下文、Sprint 日志、变更记录 | 人 + Agent |
| `specs/` | 需求（User Stories） | 人 + Agent |
| `design/` | 视觉规范、架构决策 Why | 人 + Agent |
| `process/` | TDD 流程、非功能约束 | **Agent 开工必读** |

## Agent 开工必读的 5 个文件

```
1. docs/CONTEXT.md          → 我现在在哪个阶段
2. process/CONSTRAINTS.md   → 硬约束（性能/安全/兼容性），开工前必读
3. specs/USER_STORIES.md    → 我要做的是什么（找对应 US + AC）
4. design/DESIGN_SYSTEM.md  → 如果涉及 UI，视觉规范必读
5. process/PROCESS_TDD.md   → TDD 怎么跑（步骤 + Epic 顺序）
```

遇到架构疑问 → `design/DECISIONS.md`

## 变更记录

每次 commit 后在 `docs/CHANGELOG.md` 顶部追加一条（格式见文件内模板）。

## commit 规范

```
feat: 简短描述

- 改了什么
- 为什么改（引用 specs/USER_STORIES.md 的 US 编号，或 design/DECISIONS.md 的 D 编号）
- 怎么验证
```

类型前缀：`feat:` `fix:` `docs:` `refactor:` `test:` `chore:`

## 完整文件清单

```
INDEX.md

docs/
├── CHANGELOG.md
├── CONTEXT.md
└── SPRINT_LOG.md

specs/
└── USER_STORIES.md

design/
├── DECISIONS.md
└── DESIGN_SYSTEM.md

process/
├── CONSTRAINTS.md
└── PROCESS_TDD.md
```
