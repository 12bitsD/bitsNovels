# Definition of Done

> Agent 每完成一个 US，必须逐项通过以下检查才能标记完成。无例外。

## ⚠️ TDD 是开发前提，不是完成条件

**实现任何功能前，必须先写测试。这不是"完成后再补测试"，而是"没有测试就不能开始写实现"。**

```
错误做法：写实现 → 再补测试         ← 不允许，必须返工
正确做法：先写测试（红）→ 再写实现（绿）→ 重构
```

---

## 代码质量

| 检查项 | 标准 |
|--------|------|
| 测试覆盖率 | 新增代码行覆盖率 ≥ 80% |
| 单元测试 | 全部通过 |
| 集成测试 | 相关联调测试通过 |
| 类型检查 | TypeScript 无错误（FE）/ mypy 无错误（BE） |
| 代码风格 | ESLint/Prettier（FE）/ ruff（BE）无警告 |

## 功能正确性

| 检查项 | 标准 |
|--------|------|
| AC 全覆盖 | 对照 `specs/epic-N/fe.md` 或 `be.md`，每条 AC 逐项验证 |
| 约束满足 | 对照 `process/constraints.md`，所有涉及数值约束未被突破 |
| 错误处理 | 异常 / 空状态 / 超限 场景有明确提示 |

## 文档同步

| 检查项 | 标准 |
|--------|------|
| contract.md | 如有数据结构或接口变更，必须先更新 `specs/epic-N/contract.md` |
| AGENTS.md 看板 | 将完成的 US 状态更新为 ✅ |
| CHANGELOG.md | 新功能或 breaking change 必须记录 |

---

## 接口契约冻结规则

```
BE Agent 完成 contract.md → 标记"契约已冻结"
          ↓
FE Agent 才可开始依赖该接口（用 Mock 数据对齐契约开发）
          ↓
BE 实现完成 → FE 替换 Mock 为真实 API
```

**BE 未冻结契约之前，FE 不得开始实现依赖该接口的组件。**

---

## TDD 循环（铁律）

```
红（写测试，此时测试失败）
  ↓
绿（写最少实现让测试通过）
  ↓
重构（在测试绿色状态下优化代码）
```

跳过任何一步都不算完成。

---

## 文件结构约定

### FE 测试位置
```
src/features/epic-N/__tests__/ComponentName.test.tsx
src/features/epic-N/__tests__/useHookName.test.ts
```

### BE 测试位置
```
server/epic_N/tests/test_router.py
server/epic_N/tests/test_service.py
```
