# 跨 Epic 共享类型

> 以下类型被多个 Epic 引用，定义在此处作为单一真相源。
> Agent 读取某 Epic 任务时，如需用到这些类型，直接引用本文件中的定义。

---

## 归属说明

| 类型 | 定义来源 | 被哪些 Epic 使用 |
|------|---------|----------------|
| User / Session | epic-1/contract.md | 全局 |
| Project | epic-1/contract.md | Epic 1,2,3,4,5 |
| Volume / Chapter | epic-3/contract.md | Epic 1,2,3,4,5 |
| KnowledgeBase 实体 | epic-2/contract.md | Epic 2,4 |
| AITaskType | epic-4/contract.md | Epic 2,4 |

---

## 跨 Epic 契约规则

1. **contract.md 是 FE/BE 唯一数据契约** — BE Agent 必须先写或更新 contract.md，FE Agent 才能开始依赖该接口
2. **任何一方修改 contract.md，必须在 AGENTS.md 任务看板备注变更原因**
3. **跨 Epic 引用只走本文件** — 不得在低级 Epic 的 contract.md 里重新定义高级 Epic 已定义的类型
