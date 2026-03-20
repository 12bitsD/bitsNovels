# bitsNovels · Sprint 跟踪

> 每个 Sprint 的目标、进展和阻塞项记录于此。

------

## Sprint 0 · 规划阶段

**时间：** 2026-03-20 起（预计 2 周）

**状态：** 🔄 进行中

### 目标

- [x] 确定文档架构（per-Epic FE/BE/context 拆分）
- [x] 完成全部 6 个 Epic 的需求拆分文档
- [x] 建立 TDD 工作流和 NFR 约束文档
- [ ] 完成技术栈选型决策（FE 框架 / BE 框架 / AI 服务）
- [ ] 确认架构设计（design/FRONTEND.md / design/BACKEND.md）

### 已完成

| 完成项 | 涉及文件 | 日期 |
|--------|----------|------|
| 文档架构设计 | specs/EPIC/INDEX.md, docs/CONTEXT.md | 2026-03-20 |
| EPIC1~6 拆分（FE.md + BE.md + context.md） | specs/EPIC/EPIC1~6/ | 2026-03-20 |
| TDD 工作流文档 | process/TDD.md | 2026-03-20 |
| NFR 约束表 | process/CONSTRAINTS.md | 2026-03-20 |
| 设计文档框架 | design/FRONTEND.md, design/BACKEND.md | 2026-03-20 |
| CHANGELOG 和 Sprint 跟踪 | docs/CHANGELOG.md, docs/SPRINT_LOG.md | 2026-03-20 |
| 根目录文档（INDEX + README） | INDEX.md, README.md | 2026-03-20 |

### 进行中

| 进行项 | 负责人 | 状态 |
|--------|--------|------|
| 技术栈选型决策 | Tech Lead | 等待 |

### 阻塞项

| 阻塞项 | 影响 | 解决方案 |
|--------|------|----------|
| 技术栈未确定 | 无法完善 design/BACKEND.md 和 design/FRONTEND.md 中的框架选型章节 | Tech Lead 评审后决策 |

### 决策记录

| 决策 | 依据 | 状态 |
|------|------|------|
| 文档架构采用 per-Epic FE/BE/context 拆分 | 解决 Agent 上下文窗口爆炸问题 | ✅ 已确认 |
| Epic 开发顺序：EPIC1→3→2→4→5→6 | EPIC3 是基础，EPIC2 依赖 EPIC3 | ✅ 已确认 |
| V1 不支持跨项目搜索、多人协作、移动端 | Scope 控制，降低复杂度 | ✅ 已确认 |

------

## Sprint 1 · 未开始

**预计时间：** Sprint 0 结束后

### 计划目标

- [ ] EPIC1（项目管理）FE + BE 实现
- [ ] 搭建 CI/CD 流水线
- [ ] 确定技术栈并完成项目初始化

### 前置依赖

- Sprint 0 技术栈决策完成
- EPIC1 详细设计评审通过

------

## Sprint 2 · 未开始

**预计时间：** Sprint 1 结束后

### 计划目标

- [ ] EPIC3（写作工作台）FE + BE 实现
- [ ] EPIC2（知识库）基础架构

### 前置依赖

- EPIC1 上线并稳定
- EPIC3 核心编辑器完成

------

## Sprint 模板（供后续使用）

```
## Sprint N · 名称

**时间：** YYYY-MM-DD 起（预计 2 周）

**状态：** 🆕 新建

### 目标
- [ ] 

### 已完成
（完成时填写）

### 进行中
（进行时填写）

### 阻塞项
（遇到时填写）

### 复盘
- 做得好：
- 可改进：
- 下个 Sprint 调整：
```
