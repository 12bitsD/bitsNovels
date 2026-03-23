# bitsNovels · Sprint 跟踪

> 每个 Sprint 的目标、进展和阻塞项记录于此。

------

## Sprint 0 · 规划阶段

**时间：** 2026-03-20 ~ 2026-03-23

**状态：** ✅ 已完成

### 目标

- [x] 确定文档架构（per-Epic FE/BE/context 拆分）
- [x] 完成全部 6 个 Epic 的需求拆分文档
- [x] 建立 TDD 工作流和 NFR 约束文档
- [x] 完成 FE 技术栈选型决策
- [x] 完成 BE 技术栈选型决策
- [x] 确认架构设计（design/BACKEND.md）

### 已完成

| 完成项 | 涉及文件 | 日期 |
|--------|----------|------|
| 文档架构设计 | specs/EPIC/INDEX.md, docs/CONTEXT.md | 2026-03-20 |
| EPIC1~6 拆分（FE.md + BE.md + context.md） | specs/EPIC/EPIC1~6/ | 2026-03-20 |
| TDD 工作流文档 | process/TDD.md | 2026-03-20 |
| NFR 约束表 | process/CONSTRAINTS.md | 2026-03-20 |
| 设计文档框架 | design/FRONTEND.md, design/BACKEND.md | 2026-03-20 |
| FE 技术栈确认（React+TS + TipTap + Tailwind） | docs/CONTEXT.md, design/FRONTEND.md | 2026-03-20 |
| TipTap vs Slate 深度调研 | docs/research/EDITOR_ENGINE_RESEARCH.md | 2026-03-20 |
| BE 技术栈确认（Python + FastAPI + ARQ + pgvector） | design/BACKEND.md, docs/CONTEXT.md | 2026-03-23 |
| 后端技术栈深度调研（Node vs Python vs Bun） | docs/research/BACKEND_TECH_STACK_RESEARCH.md | 2026-03-23 |
| 编辑器 Markdown 实时渲染确认（@tiptap/extension-markdown） | design/FRONTEND.md, specs/EPIC/EPIC3/FE.md | 2026-03-23 |
| 导出格式变更：EPUB→Markdown，去除 EPUB | specs/EPIC/EPIC5/, design/BACKEND.md | 2026-03-23 |
| 文档真相源统一：删除根目录 USER_STORIES.md，以 specs/EPIC 为准 | — | 2026-03-23 |

### 决策记录

| 决策 | 依据 | 状态 |
|------|------|------|
| 文档架构采用 per-Epic FE/BE/context 拆分 | 解决 Agent 上下文窗口爆炸问题 | ✅ |
| Epic 开发顺序：EPIC1→3→2→4→5→6 | EPIC3 是基础，EPIC2 依赖 EPIC3 | ✅ |
| 前端框架：React + TypeScript | 生态最大，AI coding 工具支持最好 | ✅ |
| 编辑器引擎：TipTap 核心 + @tiptap/extension-markdown | AI 写作集成成本最低，类 Typora 体验 | ✅ |
| CSS 方案：Tailwind CSS | AI 生成效率最高，与 React 集成最佳 | ✅ |
| 后端运行时：Python 3.11+ + FastAPI | AI 生态一等公民，LangChain/LlamaIndex 最成熟 | ✅ |
| 任务队列：ARQ + Redis | asyncio 原生，轻量，支持优先级/重试/并发上限 | ✅ |
| 向量库：pgvector（PostgreSQL 扩展） | V1 数据量小，同栈简化架构，ACID 一致性 | ✅ |
| 前后端类型同步：openapi-typescript | FastAPI 自动生成 openapi.json → 前端 TS 类型 | ✅ |
| V1 导出格式：DOCX / TXT / PDF / Markdown（去除 EPUB） | epub-gen 生态不成熟，Markdown 更实用 | ✅ |
| V1 不支持跨项目搜索、多人协作、移动端 | Scope 控制，降低复杂度 | ✅ |
| specs/EPIC 作为需求真相源，删除根目录 USER_STORIES.md | 方案 B，避免双重维护，符合 Agent 4 文件上限约束 | ✅ |

### 复盘
- 做得好：需求文档完整度高，技术选型有调研依据，文档架构为 Agent 并行开发做了充分准备
- 可改进：BE 技术栈决策用了两轮调研（第一轮未含 Python），下次明确候选范围再启动调研

------

## Sprint 1 · 校准 Sprint

**时间：** 2026-03-23 起（预计 2 周）

**状态：** 🔄 进行中

### Sprint Goal
搭建 FE+BE 脚手架，完成 US-1.1~1.3，**跑出 Agent 开发速度基线**。故意保守，用于校准后续排期。

### 计划目标

- [ ] 搭建 FE + BE 项目脚手架（monorepo 结构）
- [ ] 配置 OpenAPI → openapi-typescript 类型生成流水线
- [ ] 搭建 CI/CD 基础流水线
- [ ] US-1.1 BE：注册 / 登录 / OAuth
- [ ] US-1.1 FE：注册 / 登录页面
- [ ] US-1.2 BE：项目列表接口
- [ ] US-1.2 FE：项目列表与仪表盘
- [ ] US-1.3 BE：创建项目接口
- [ ] US-1.3 FE：创建项目流程

### 前置依赖

- ✅ Sprint 0 全部决策完成
- ✅ Release Planning 完成（9 Sprint Roadmap 已确认）

### Sprint 结束时复盘

- 记录实际完成量 vs 计划
- 记录每个 US 实际耗时（BE + FE 分开）
- 用于校准 S2~S9 估算

------

## Sprint 2 · Epic 1 项目管理完整可用

**预计时间：** Week 3-4

**状态：** 🔲 待开始

### Sprint Goal
Epic 1 项目管理全能力完整可用：项目设置、卷章目录、写作目标、归档功能全部上线。

### 计划目标

- [ ] US-1.4 BE+FE：项目设置（基本信息修改、危险操作区）
- [ ] US-1.5 BE+FE：卷章目录管理（卷CRUD/排序/软删除、章CRUD/跨卷移动/批量操作、SSE实时同步）
- [ ] US-1.6 BE+FE：写作目标设定（每日/总字数目标、截止日期、进度统计、完成预估）
- [ ] US-1.8 BE+FE：项目归档（归档/取消归档、归档后只读标记、自动备份暂停）

### 前置依赖

- Sprint 1 脚手架稳定
- US-1.3（创建项目）完成

### Sprint 结束时复盘

- 记录 US-1.4~1.6, 1.8 实际完成量
- 评估 US-1.7（回收站）是否可以提前到 Sprint 2

------

## Sprint 3 · 编辑器核心 + 通知基础设施

**预计时间：** Week 5-6

**状态：** 🔲 待开始

### Sprint Goal
编辑器核心（最高风险 XL US）稳定上线，通知中心基础设施同步建设完成。

### 计划目标

**Epic 3（编辑器核心）：**
- [ ] US-3.1 BE+FE：编辑器核心（章节保存/读取、自动保存幂等、字数计算、失败错误码）
- ⚠️ US-3.1 独占本 Sprint，是后续 12 个 US 的前置，高风险节点

**Epic 6（通知基础设施）：**
- [ ] US-6.6 BE+FE：通知中心（通知事件落库、分页查询、已读/删除、90天清理、上下文跳转）

### 前置依赖

- US-1.3（创建项目）完成
- ⚠️ US-3.1 如 Sprint 内拖延，需立即上报

------

## Sprint 4 · 章节管理 + 知识库解析引擎上线

**预计时间：** Week 7-8

**状态：** 🔲 待开始

### Sprint Goal
章节管理功能完整可用，AI 知识库 Parser 引擎上线，为后续实体识别全系铺路。

### 计划目标

**Epic 3（编辑器扩展）：**
- [ ] US-3.2 BE+FE：章节管理（卷章树、章节 CRUD、排序、删除进回收站）
- [ ] US-3.3 BE+FE：写作统计（今日/本周/本月字数、趋势热力图）
- [ ] US-3.4 BE+FE：专注模式（FE 主导，BE 无新增接口）
- [ ] US-3.5 BE+FE：编辑器主题（FE 主导，BE 依赖 US-6.2）
- [ ] US-3.6 BE+FE：版本快照（创建/查询/恢复/清理，存储统计）

**Epic 2（知识库核心）：**
- [ ] US-2.1 BE：Parser 解析触发（队列、优先级、重试、状态机、批量解析）

### 前置依赖

- Sprint 3 US-3.1（编辑器核心）完成
- US-2.1 Parser 是 Epic 2 后续全部 US 的前置

### 高风险点

- US-2.1 Parser 引擎：AI 不确定性，Mock AI 回包策略需提前定义

---

## Sprint 5 · 知识库实体识别全系 + 回收站 + 编辑器辅助

**预计时间：** Week 9-10

**状态：** 🔲 待开始

### Sprint Goal
知识库五大实体（角色/地点/道具/势力/伏笔）识别与管理全系上线，编辑器辅助功能完善。

### 计划目标

**Epic 2（知识库实体）：**
- [ ] US-2.2 BE+FE：角色识别与管理（去重归并、别名、确认/非角色）
- [ ] US-2.3 BE+FE：地点识别与管理（树结构、层级关系）
- [ ] US-2.4 BE+FE：道具/物品识别（重要性过滤、持有者变更历史）
- [ ] US-2.5 BE+FE：势力/组织识别（归属关系、敌对/同盟）
- [ ] US-2.6 BE+FE：伏笔追踪（埋设/回收状态、提醒机制）

**Epic 1（项目管理扩展）：**
- [ ] US-1.7 BE+FE：回收站（软删除、30天恢复、彻底删除）

**Epic 3（编辑器辅助）：**
- [ ] US-3.7 BE+FE：内容注释/批注（锚点、已解决状态、导出脚注）
- [ ] US-3.8 BE+FE：章节备注（富文本2000字、hasNote字段）
- [ ] US-3.9 BE+FE：写作计时器（stopwatch/countdown、会话持久化）
- [ ] US-3.10：查找替换（FE 主导，BE 复用 US-3.1 保存接口）

### 前置依赖

- Sprint 4 US-2.1（Parser）完成

---

## Sprint 6 · 知识库高级功能 + 系统设置基础

**预计时间：** Week 11-12

**状态：** 🔲 待开始

### Sprint Goal
知识库图谱与一致性检查上线，系统设置基础能力完成，为 AI 写作和通知中心打好基础设施。

### 计划目标

**Epic 2（知识库高级）：**
- [ ] US-2.7 BE+FE：关系图谱（图节点/边、筛选着色、PNG导出）
- [ ] US-2.8 BE+FE：一致性检查（冲突检测、置信度、处理状态）
- [ ] US-2.9 BE+FE：知识库搜索（统一搜索接口、类型筛选、高亮）
- [ ] US-2.10 BE+FE：世界观设定管理（CRUD、分类标签、关联实体）
- [ ] US-2.11 BE+FE：知识库手动编辑（软删除、恢复、合并、引用检查）

**Epic 6（系统设置）：**
- [ ] US-6.1 BE+FE：用户资料管理（资料读写、密码修改、OAuth绑定、会话管理、30天冻结注销）
- [ ] US-6.2 BE+FE：界面偏好设置（主题/字体/音效/语言，复用 US-5.3 模板入口）
- [ ] US-6.3 BE+FE：快捷键配置（冲突校验、默认值恢复）

**Epic 6 通知基础设施（与 Sprint 3 US-6.6 联动）：**
- [ ] US-6.4 BE+FE：通知配置（站内通知+浏览器推送、muteAll、AI全局默认值）

### 前置依赖

- Sprint 3 US-6.6（通知中心）完成
- Sprint 5 US-2.6（伏笔追踪）完成（伏笔提醒依赖 US-6.4）

---

## Sprint 7 · AI 写作核心上线

**预计时间：** Week 13-14

**状态：** 🔲 待开始

### Sprint Goal
AI 续写核心（最高风险 XL US）上线，AI 辅助写作基础能力完整可用。

### 计划目标

**Epic 4（AI 写作）：**
- [ ] US-4.8 BE+FE：项目 AI 配置（三级覆盖：系统>用户>项目，字段级继承）
- [ ] US-4.1 BE+FE：AI 续写（流式输出、Esc 停止、上下文注入规则、Token 裁剪算法）
- [ ] US-4.2 BE+FE：AI 润色（Diff 替换、可撤销）
- [ ] US-4.3 BE+FE：AI 扩写/缩写（倍数控制、Diff 输出）
- [ ] US-4.4 BE+FE：AI 对话生成（角色画像、场景描述）

### 前置依赖

- Sprint 6 US-6.4（通知配置）完成
- US-4.8 项目配置是 US-4.1~4.4 的前置

### 高风险点

- US-4.1 AI续写：流式输出 + 上下文裁剪，TDD 最难，需提前规划测试策略

---

## Sprint 8 · AI 辅助完整 + 导入 + 导出

**预计时间：** Week 15-16

**状态：** 🔲 待开始

### Sprint Goal
AI 辅助写作全能力上线，导出功能（V1 核心交付）完成。

### 计划目标

**Epic 4（AI 辅助完整）：**
- [ ] US-4.5 BE+FE：大纲生成（结构化输出、伏笔关联）
- [ ] US-4.6 BE+FE：AI 起名（命名类型、文化背景、10个候选）
- [ ] US-4.7 BE+FE：写作建议（四维度、段落位置、反馈接口）

**Epic 1（项目管理扩展）：**
- [ ] US-1.9 BE+FE：数据导入（Word/TXT/Markdown/纯文本）

**Epic 5（导出核心）：**
- [ ] US-5.1 BE+FE：导出作品（DOCX/TXT/PDF/Markdown，异步任务、下载链接、历史记录）

### 前置依赖

- Sprint 7 US-4.1（续写）完成
- US-5.1 导出依赖 US-3.1（编辑器）和 US-2.x（知识库）完成

---

## Sprint 9 · 备份恢复 + 存储管理，收尾

**预计时间：** Week 17-18

**状态：** 🔲 待开始

### Sprint Goal
备份恢复全能力上线，存储管理完成，项目收尾。

### 计划目标

**Epic 5（备份与恢复）：**
- [ ] US-5.2 BE+FE：自动备份（24小时轮询、7份保留、归档跳过）
- [ ] US-5.3 BE+FE：导出模板（用户级CRUD、20个上限）
- [ ] US-5.4 BE+FE：知识库导出/导入（JSON schema、冲突处理）
- [ ] US-5.5 BE+FE：项目备份与恢复（ZIP打包、覆盖/创建新项目、版本兼容）

**Epic 6（系统设置收尾）：**
- [ ] US-6.5 BE+FE：存储管理（配额聚合、80/90/100%阈值、清理建议与执行）

### 前置依赖

- Sprint 8 US-5.1（导出）完成

---



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
