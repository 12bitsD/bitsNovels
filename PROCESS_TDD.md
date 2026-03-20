# PROCESS_TDD · TDD 开发流程

> 本项目采用 **Test-Driven Development（TDD）** 作为核心开发方法论。
> 无论人还是 Agent，实施任何功能前必须遵循本流程。

------

## TDD 核心循环

```
① 写一个失败的测试   → 明确"完成"的标准
② 写最少量代码让测试通过   → 不多不少
③ 重构（Refactor）   → 改善代码结构，测试保证不破坏功能
④ 重复
```

**关键原则**：
- 测试在代码之前写（"先写测试"不是建议，是规则）
- 写测试是为了定义"done 的标准"，不是为了追求覆盖率
- 重构时测试不变，代码变；测试变了说明需求变了，不是重构

------

## Epic 开发顺序

建议按以下顺序开发各 Epic，依赖关系决定了顺序：

```
Phase 0 · 基建
  └── auth（US-1.1）→ 项目列表（US-1.2）→ 新建项目（US-1.3）
       │
Phase 1 · 核心写作
  └── 卷章目录（US-1.5）→ 编辑器核心（US-3.1）→ 章节管理（US-3.2）
       │
Phase 2 · 知识库
  └── Parser 架构（US-2.1）→ 角色/地点/道具/势力（US-2.2~2.5）→ 伏笔（US-2.6）→ 关系图谱（US-2.7）→ 一致性检查（US-2.8）→ 知识库搜索（US-2.9）→ 世界观设定（US-2.10）→ 手动编辑（US-2.11）
       │
Phase 3 · AI 功能
  └── AI 续写（US-4.1）→ AI 润色（US-4.2）→ 扩写缩写（US-4.3）→ 对话生成（US-4.4）→ 大纲建议（US-4.5）→ 名字生成器（US-4.6）→ 写作建议（US-4.7）→ AI 配置（US-4.8）
       │
Phase 4 · 导出备份
  └── 导出（US-5.1）→ 自动备份（US-5.2）→ 导出模板（US-5.3）→ 知识库导入导出（US-5.4）→ 项目备份（US-5.5）
       │
Phase 5 · 完善
  └── 写作目标（US-1.6）→ 回收站（US-1.7）→ 项目归档（US-1.8）→ 导入作品（US-1.9）→ 专注模式（US-3.4）→ 主题（US-3.5）→ 版本快照（US-3.6）→ 批注（US-3.7）→ 章节备注（US-3.8）→ 计时器（US-3.9）→ 查找替换（US-3.10）→ 写作统计（US-3.3）→ 用户资料（US-6.1）→ 偏好设置（US-6.2）→ 快捷键（US-6.3）→ 通知配置（US-6.4）→ 存储管理（US-6.5）→ 通知中心（US-6.6）
```

**为什么这个顺序**：
1. 基建（登录+项目列表）是所有功能的入口
2. 核心写作（编辑器+章节管理）是最核心的用户体验，必须先稳
3. 知识库依赖 Parser，Parser 依赖章节内容，所以 Phase 1 → Phase 2
4. AI 功能依赖知识库和编辑器，所以 Phase 2 → Phase 3
5. 导出备份是辅助功能，依赖核心功能完成后
6. 完善阶段是把 Phase 1~4 中跳过的"锦上添花"功能补全

------

## 每个 User Story 的 TDD 步骤

### Step 0 · 理解需求

- 读 `USER_STORIES.md` 对应 US 的 AC（Acceptance Criteria）
- 确认 CONSTRAINTS.md 中涉及的性能/安全约束
- 确认是否有依赖的 US 尚未实现

### Step 1 · 写测试

**测试文件命名**：`{模块}.test.ts`（前端）或 `{模块}_test.go`（后端）

**测试内容**：
- 每个 AC 对应至少一个测试用例
- 失败场景（边界条件、错误处理）必须有测试
- 测试必须是确定性的（不依赖时间、网络、随机数）

**示例（US-1.1 注册密码校验）**：
```typescript
describe('US-1.1 · 注册', () => {
  it('密码不足 8 位应拒绝注册', async () => {
    const result = await register('test@example.com', 'Ab1')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('密码')
  })

  it('密码无大写字母应拒绝注册', async () => {
    const result = await register('test@example.com', 'abcdefgh')
    expect(result.ok).toBe(false)
  })

  it('密码无数字应拒绝注册', async () => {
    const result = await register('test@example.com', 'Abcdefgh')
    expect(result.ok).toBe(false)
  })

  it('符合规则的密码应注册成功', async () => {
    const result = await register('test@example.com', 'Abc12345')
    expect(result.ok).toBe(true)
  })
})
```

### Step 2 · 验证测试失败

运行测试，确认测试失败原因是**需求理解正确**（不是测试写错了）。

### Step 3 · 写实现代码

写最少量代码让测试通过。**不提前优化，不添加测试未覆盖的功能**。

### Step 4 · 重构

测试全部通过后，在测试保护下重构：
- 提取重复代码
- 改善命名
- 优化结构

### Step 5 · 自验清单

| 检查项 | 通过标准 |
|---|---|
| 所有测试通过 | ✅ `npm test` / `go test` 全部 green |
| lsp_diagnostics 干净 | ✅ 无 error |
| 实现符合 AC | ✅ 对照 USER_STORIES.md 逐条确认 |
| 无类型错误 | ✅ TypeScript 编译通过 |
|CONSTRAINTS 未违反 | ✅ 性能/安全约束测试覆盖 |

### Step 6 · 提交

按 `DOC_ORGANIZATION.md` 的提交规范，commit + CHANGELOG 追加。

------

## Agent 任务执行模板

Owner 每次给 Agent 发任务时，使用以下标准化 prompt 模板：

```
## 任务：{任务名称}

**关联需求**：US-{编号} · {US 标题}
**涉及约束**：CONSTRAINTS.md 的 {PERF-0X / REL-0X / COMPAT-0X}
**相关决策**：DECISIONS.md 的 D-XXX（如有）

---

### 你的操作步骤

1. **读** `CONTEXT.md` → 确认当前项目阶段
2. **读** `CONSTRAINTS.md` → 确认相关硬约束
3. **读** `USER_STORIES.md` 的 US-{编号} → 确认 AC
4. **读** `DESIGN_SYSTEM.md`（如有 UI 改动）→ 确认视觉规范
5. **读** `PROCESS_TDD.md` → 确认 TDD 步骤
6. **写测试** → 每个 AC 至少一个测试用例
7. **实现** → 让测试通过
8. **自验** → 运行测试 + lsp_diagnostics + 对照 AC
9. **提交** → 按 `DOC_ORGANIZATION.md` 规范写 commit message

### 交付标准

- [ ] 所有测试通过
- [ ] lsp_diagnostics 无 error
- [ ] 对照 AC 逐条确认满足
- [ ] commit 已推送

### 完成后

报告：实际交付内容 + 遇到的问题 + 自验结果
```

------
