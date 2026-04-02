# Sprint 4 执行计划

**时间**: Week 7-8（2026-04-02 起）  
**分支**: `feat/sprint-4`  
**负责人**: Sprint Master (AI Orchestrator)

---

## 📋 Sprint 4 任务总览

### 核心目标
完成 Epic 3 剩余 US (3.2~3.6) + Epic 2 US-2.1 Parser引擎契约设计

### 任务分解

| 任务ID | 任务描述 | 负责人 | 复杂度 | 状态 | 依赖 |
|--------|----------|--------|--------|------|------|
| **Epic 2** |
| BE-2.1-CONTRACT | US-2.1 Parser契约设计 | Subagent | XL | 🔄 进行中 | Sprint 3完成 |
| BE-2.1-IMPL | US-2.1 Parser后端实现 | Subagent | XL | ⏳ 等待契约 | BE-2.1-CONTRACT |
| FE-2.1-IMPL | US-2.1 Parser前端实现 | Subagent | L | ⏳ 等待契约 | BE-2.1-CONTRACT |
| **Epic 3** |
| BE-3.2 | US-3.2 章节管理API | Subagent | M | 🔄 进行中 | Sprint 3 US-3.1 |
| BE-3.3 | US-3.3 写作统计API | Subagent | M | 🔄 进行中 | Sprint 3 US-3.1 |
| BE-3.6 | US-3.6 版本快照API | Subagent | L | 🔄 进行中 | Sprint 3 US-3.1 |
| FE-3.2 | US-3.2 章节管理面板 | Subagent | M | 🔄 进行中 | Sprint 3 US-3.1 |
| FE-3.3 | US-3.3 写作统计UI | Subagent | M | 🔄 进行中 | Sprint 3 US-3.1 |
| FE-3.4 | US-3.4 专注模式 | Subagent | S | 🔄 进行中 | FE-3.2 |
| FE-3.5 | US-3.5 编辑器主题 | Subagent | S | 🔄 进行中 | Sprint 3 US-3.1 |
| FE-3.6 | US-3.6 版本快照UI | Subagent | M | 🔄 进行中 | Sprint 3 US-3.1 |
| **质量门禁** |
| CR-1 | 第一轮Code Review | Subagent | - | ⏳ 等待开发 | 所有开发完成 |
| CR-2 | 第二轮Code Review | Subagent | - | ⏳ 等待CR-1 | CR-1完成 |
| **文档** |
| DOC-1 | 更新CHANGELOG.md | Subagent | - | ⏳ 等待开发 | CR-2完成 |
| DOC-2 | 更新AGENTS.md看板 | Subagent | - | ⏳ 等待开发 | CR-2完成 |
| **发布** |
| REL-1 | 合并至main | Sprint Master | - | ⏳ 等待文档 | DOC-1/2完成 |

---

## 🎯 当前活跃任务

### 正在执行的Subagents

1. **US-2.1 Parser引擎契约设计** (bg_d733be4a)
   - 任务: 设计contract.md，包含解析状态、队列结构、AI集成点
   - 复杂度: XL
   - 预计完成: 2-3小时
   - 阻塞: US-2.1所有实现任务

2. **Epic 3 BE实现** (bg_eeeb162d)
   - 任务: US-3.2章节管理 + US-3.3写作统计 + US-3.6版本快照
   - 复杂度: M/L
   - 预计完成: 4-6小时
   - 依赖: Sprint 3 US-3.1

3. **Epic 3 FE实现** (bg_dd097323)
   - 任务: US-3.2~3.6前端界面
   - 复杂度: M
   - 预计完成: 4-6小时
   - 依赖: Sprint 3 US-3.1

---

## 📊 Sprint 4 依赖图

```
Sprint 3 已完成
├── US-3.1 编辑器核心
└── US-6.6 通知中心
    │
    ▼
Sprint 4 Week 1
├── BE-2.1-CONTRACT (US-2.1契约)
│   └── 完成后启动: BE-2.1-IMPL, FE-2.1-IMPL
│
└── Epic 3 并行开发
    ├── BE-3.2 (章节管理API)
    ├── BE-3.3 (写作统计API)
    ├── BE-3.6 (版本快照API)
    ├── FE-3.2 (章节面板)
    ├── FE-3.3 (统计UI)
    ├── FE-3.4 (专注模式)
    ├── FE-3.5 (编辑器主题)
    └── FE-3.6 (版本快照UI)

Sprint 4 Week 2
├── BE-2.1-IMPL (Parser实现)
├── FE-2.1-IMPL (Parser UI)
├── CR-1 (第一轮Code Review)
├── CR-2 (第二轮Code Review)
├── DOC-1 (CHANGELOG更新)
└── DOC-2 (AGENTS.md更新)

Sprint 4 结束
└── REL-1 (合并至main)
```

---

## 🚦 质量门禁检查点

### 开发阶段
- [ ] TDD: 先写测试（红灯）→ 再写实现（绿灯）→ 重构
- [ ] 测试覆盖率 ≥ 73%
- [ ] TypeScript/mypy 无错误
- [ ] ESLint/ruff 无警告

### Code Review阶段
- [ ] 第一轮: 功能正确性 + 代码规范
- [ ] 第二轮: 架构合理性 + 性能优化

### 发布阶段
- [ ] 所有测试通过
- [ ] 文档同步完成
- [ ] CHANGELOG更新
- [ ] AGENTS.md看板更新

---

## 📝 关键文档

| 文档 | 路径 | 用途 |
|------|------|------|
| Epic 2 BE | `specs/epic-2/be.md` | US-2.1~2.11后端需求 |
| Epic 2 FE | `specs/epic-2/fe.md` | US-2.1~2.11前端需求 |
| Epic 2 Contract | `specs/epic-2/contract.md` | 数据契约(API) |
| Epic 3 BE | `specs/epic-3/be.md` | US-3.2~3.10后端需求 |
| Epic 3 FE | `specs/epic-3/fe.md` | US-3.2~3.10前端需求 |
| Epic 3 Contract | `specs/epic-3/contract.md` | 数据契约(API) |
| DoD | `process/dod.md` | 完成标准 |
| Frontend Design | `design/FRONTEND.md` | 视觉规范 |
| Backend Design | `design/BACKEND.md` | 架构规范 |

---

## ⚠️ 风险与缓解

| 风险 | 影响 | 缓解策略 |
|------|------|----------|
| US-2.1契约设计延期 | 阻塞所有Parser实现 | 优先完成，必要时简化初始版本 |
| US-3.6版本快照复杂度高 | 可能影响进度 | 预留缓冲时间，先实现MVP |
| Code Review发现大量问题 | 需要返工 | 提前约定规范，每日检查进度 |
| 测试覆盖率不达标 | 无法合并 | TDD严格执行，覆盖率检查自动化 |

---

## 📅 进度跟踪

### Day 1 (2026-04-02)
- [x] 创建Sprint 4分支
- [x] 启动BE-2.1-CONTRACT
- [x] 启动BE-3.2~3.6
- [x] 启动FE-3.2~3.6

### Day 2-3
- [ ] BE-2.1-CONTRACT完成 → 启动BE-2.1-IMPL, FE-2.1-IMPL
- [ ] Epic 3开发进行中

### Day 4-5
- [ ] Epic 3开发完成
- [ ] 第一轮Code Review

### Day 6-7
- [ ] US-2.1实现完成
- [ ] 第二轮Code Review
- [ ] 文档更新

### Day 8
- [ ] 合并至main

---

## 🔗 Subagent任务链接

| 任务 | Task ID | Session ID | 状态 |
|------|---------|------------|------|
| BE-2.1-CONTRACT | bg_d733be4a | ses_2b397a32affekvQBD1JgUQfqyY | 🔄 Running |
| BE-3.2~3.6 | bg_eeeb162d | ses_2b39770f3ffe85VSKnFgksEXhA | 🔄 Running |
| FE-3.2~3.6 | bg_dd097323 | ses_2b3971fdbffeApLuI9EJtJY355 | 🔄 Running |

---

*最后更新: 2026-04-02*
