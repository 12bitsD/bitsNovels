# SPRINT_LOG · Sprint 执行日志

> 敏捷迭代的进展追踪。每个 Sprint 一节，Sprint 末更新。

------

## 如何使用

- 每个 Sprint 开始前，Owner 在顶部创建新章节，填入 Sprint Goal
- Sprint 期间，Agent 每次交付后更新"已完成"和"进行中"
- Sprint 末做 Retro，将教训记入下一 Sprint 的"注意事项"

---

<!-- 模板：删除此行，将下方内容移到上方 -->

## Template

```
## Sprint N · YYYY-MM-DD ~ YYYY-MM-DD

**Sprint Goal**：[这个 Sprint 要交付什么]
**状态**：🟡 进行中 / ✅ 完成 / ❌ 中止

### 承诺范围

| US | 标题 | 状态 | 备注 |
|---|---|---|---|
| US-X.X | 标题 | ✅/🟡/❌ | — |

### 完成标准（Definition of Done）

- [ ] 测试全部通过
- [ ] lsp_diagnostics 无 error
- [ ] 功能符合 AC
- [ ] CONSTRAINTS 未违反
- [ ] 代码已推送

### Sprint Retro

**做得好的**：
- ...

**需要改进的**：
- ...

**下一个 Sprint 注意**：
- ...
```

---

## Sprint 0 · 规划 Sprint · 2026-03-20 ~ 待定

**Sprint Goal**：建立开发支架，确定技术选型

**状态**：🟡 进行中

### 承诺范围

| US | 标题 | 状态 | 备注 |
|---|---|---|---|
| — | 项目文档体系搭建 | ✅ 完成 | 见 commit 9521084 |
| US-0（规划） | 技术选型决策 | 🟡 进行中 | 待定：前端框架、编辑器、后端、数据库 |
| US-0（规划） | Phase 0 基建 Sprint 规划 | 🟡 进行中 | 待启动 |

### 完成标准（Definition of Done）

- [ ] 技术选型已记录至 DECISIONS.md（含 Why）
- [ ] 项目骨架搭建完成（可运行的最简系统）
- [ ] 第一个 US 完成 TDD 循环（auth / US-1.1）

### Sprint Retro

（待 Sprint 0 完成后再填写）

### 下一个 Sprint 注意

- TDD 流程刚开始，Agent 需要每次被提醒"先写测试"
- 技术选型决策一旦做出需立即记录 Why

------
