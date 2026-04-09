# bitsNovels · Agent 操作手册

> 所有 Agent 每次任务前必须先读本文件。工程代码统一放在 `workspace/` 下。

## 铁律（详见 `process/dod.md`）

- **TDD**：先写测试（红）→ 写实现（绿）→ 重构。跳过 = 返工。
- **覆盖率** ≥ 73%，不达标 = 任务不合格。
- **契约冻结**：BE 先冻结 `contract.md`，FE 才可开始依赖该接口。

---

## 当前进度

| Sprint | 状态 | 说明 |
|--------|------|------|
| S1 ~ S5 | ✅ 全部完成 | 详见 `docs/SPRINT_LOG.md` |
| **S6**（下一个） | 🔲 待开始 | US-2.7~2.11 + US-6.4 + US-6.1~6.3 |

完整 Roadmap 与依赖图见 `docs/SPRINT_LOG.md`。

---

## Agent 任务路由（每次最多读 4 文件）

### BE Agent

```
specs/epic-N/be.md          ← AC 和实现要求
specs/epic-N/contract.md    ← 类型 + API 端点（唯一数据契约）
design/BACKEND.md           ← 架构规范
process/dod.md              ← 完成标准（含 TDD / 契约冻结规则）
```

### FE Agent

```
specs/epic-N/fe.md          ← AC 和交互要求
specs/epic-N/contract.md    ← 类型 + API 端点（唯一数据契约）
design/frontend.md          ← 视觉规范
process/dod.md              ← 完成标准（含 TDD / 契约冻结规则）
```

按需替换其中一个文件：`process/CONSTRAINTS.md`（NFR 数值约束）。

### 跨 Epic 类型归属

| 类型 | 定义来源 | 被哪些 Epic 使用 |
|------|---------|----------------|
| User / Session | epic-1/contract.md | 全局 |
| Project | epic-1/contract.md | Epic 1,2,3,4,5 |
| Volume / Chapter | epic-3/contract.md | Epic 1,2,3,4,5 |
| KnowledgeBase 实体 | epic-2/contract.md | Epic 2,4 |
| AITaskType | epic-4/contract.md | Epic 2,4 |

跨 Epic 引用只查对应 contract.md，不得重复定义。

---

## 完成后必须做

1. 在 `docs/CHANGELOG.md` 新增条目
2. 如有 contract.md 变更，说明变更内容

---

## 文档索引

| 你需要什么 | 读哪里 |
|-----------|--------|
| US 具体要求 | `specs/epic-N/fe.md` 或 `be.md` |
| 类型 / API | `specs/epic-N/contract.md` |
| 完成标准 + TDD + 契约冻结 | `process/dod.md` |
| 视觉规范 | `design/frontend.md` |
| 架构规范 | `design/BACKEND.md` |
| NFR 数值约束 | `process/CONSTRAINTS.md` |
| 技术选型 | `docs/decisions/tech-stack.md` |
| 工程目录 | `docs/ENGINEERING_WORKSPACE.md` |
| Sprint 历史 + Roadmap | `docs/SPRINT_LOG.md` |
| 变更记录 | `docs/CHANGELOG.md` |
