# PROCESS_TDD · TDD 开发流程

> 所有功能先写测试再实现，2 周一个 Sprint。

---

## TDD 核心循环

```
① 写一个失败的测试   → 明确"完成"的标准
② 写最少量代码让测试通过   → 不多不少
③ 重构   → 改善代码结构，测试保证不破坏功能
④ 重复
```

**原则**：测试在代码之前写；重构时测试不变，测试变了说明需求变了。

---

## Epic 开发顺序

```
Phase 0 · 基建
  └── auth（US-1.1）→ 项目列表（US-1.2）→ 新建项目（US-1.3）
       │
Phase 1 · 核心写作
  └── 卷章目录（US-1.5）→ 编辑器核心（US-3.1）→ 章节管理（US-3.2）
       │
Phase 2 · 知识库
  └── Parser（US-2.1）→ 角色/地点/道具/势力（US-2.2~2.5）→ 伏笔（US-2.6）
      → 关系图谱（US-2.7）→ 一致性检查（US-2.8）→ 知识库搜索（US-2.9）
      → 世界观设定（US-2.10）→ 手动编辑（US-2.11）
       │
Phase 3 · AI 功能
  └── AI 续写（US-4.1）→ AI 润色（US-4.2）→ 扩写缩写（US-4.3）
      → 对话生成（US-4.4）→ 大纲建议（US-4.5）→ 名字生成器（US-4.6）
      → 写作建议（US-4.7）→ AI 配置（US-4.8）
       │
Phase 4 · 导出备份
  └── 导出（US-5.1）→ 自动备份（US-5.2）→ 导出模板（US-5.3）
      → 知识库导入导出（US-5.4）→ 项目备份（US-5.5）
       │
Phase 5 · 完善
  └── 写作目标（US-1.6）→ 回收站（US-1.7）→ 项目归档（US-1.8）
      → 导入作品（US-1.9）→ 专注模式（US-3.4）→ 主题（US-3.5）
      → 版本快照（US-3.6）→ 批注（US-3.7）→ 章节备注（US-3.8）
      → 计时器（US-3.9）→ 查找替换（US-3.10）→ 写作统计（US-3.3）
      → 用户资料（US-6.1）→ 偏好设置（US-6.2）→ 快捷键（US-6.3）
      → 通知配置（US-6.4）→ 存储管理（US-6.5）→ 通知中心（US-6.6）
```

---

## 每个 US 的 TDD 步骤

### Step 1 · 读需求

读 `specs/USER_STORIES.md` 对应 US 的 AC（Acceptance Criteria）。

确认 `process/CONSTRAINTS.md` 中涉及的 PERF / REL / COMPAT 约束。

### Step 2 · 写测试

测试文件：`{模块}.test.ts`（前端）或 `{模块}_test.go`（后端）。

每个 AC 至少一个测试用例。失败场景必须有测试。

**示例（US-1.1 密码校验）**：
```typescript
describe('US-1.1 · 注册', () => {
  it('密码不足 8 位应拒绝', async () => {
    const r = await register('a@b.com', 'Ab1')
    expect(r.ok).toBe(false)
  })
  it('密码无大写应拒绝', async () => {
    const r = await register('a@b.com', 'abcdefgh')
    expect(r.ok).toBe(false)
  })
  it('密码无数字应拒绝', async () => {
    const r = await register('a@b.com', 'Abcdefgh')
    expect(r.ok).toBe(false)
  })
  it('符合规则应注册成功', async () => {
    const r = await register('a@b.com', 'Ab123456')
    expect(r.ok).toBe(true)
  })
})
```

### Step 3 · 验证测试失败

运行测试，确认失败原因是需求理解正确。

### Step 4 · 写实现

写最少量代码让测试通过。不提前优化，不添加测试未覆盖的功能。

### Step 5 · 重构

测试全部通过后重构，测试保护下改善代码结构。

### Step 6 · 自验 + 提交

| 检查项 | 标准 |
|---|---|
| 测试 | ✅ 全部通过 |
| 诊断 | ✅ lsp_diagnostics 无 error |
| AC 对照 | ✅ specs/USER_STORIES.md 逐条确认 |
| 约束 | ✅ process/CONSTRAINTS.md 未违反 |
| commit | ✅ 推送 |

commit 格式：按 INDEX.md 的 commit 规范写。

---
