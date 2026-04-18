# bitsNovels · Sprint 跟踪

> 每个 Sprint 的目标、进展和阻塞项记录于此。

***

## Sprint 0 · 规划阶段

**时间：** 2026-03-20 \~ 2026-03-23

**状态：** ✅ 已完成

### 目标

- [x] 确定文档架构（per-Epic FE/BE/context 拆分）
- [x] 完成全部 6 个 Epic 的需求拆分文档
- [x] 建立 TDD 工作流和 NFR 约束文档
- [x] 完成 FE 技术栈选型决策
- [x] 完成 BE 技术栈选型决策
- [x] 确认架构设计（design/BACKEND.md）

### 已完成

| 完成项                                             | 涉及文件                                            | 日期         |
| ----------------------------------------------- | ----------------------------------------------- | ---------- |
| 文档架构设计                                          | AGENTS.md, specs/, docs/SPRINT_LOG.md           | 2026-03-20 |
| EPIC1\~6 拆分（FE.md + BE.md + context.md）         | specs/epic-1\~6/                                | 2026-03-20 |
| TDD 工作流文档                                       | AGENTS.md, process/dod.md                       | 2026-03-20 |
| NFR 约束表                                         | process/CONSTRAINTS.md                          | 2026-03-20 |
| 设计文档框架                                          | design/FRONTEND.md, design/BACKEND.md           | 2026-03-20 |
| FE 技术栈确认（React+TS + TipTap + Tailwind）          | docs/decisions/tech-stack.md, design/FRONTEND.md | 2026-03-20 |
| TipTap vs Slate 深度调研                            | docs/decisions/tech-stack.md                    | 2026-03-20 |
| BE 技术栈确认（Python + FastAPI + ARQ + pgvector）     | design/BACKEND.md, docs/decisions/tech-stack.md | 2026-03-23 |
| 后端技术栈深度调研（Node vs Python vs Bun）                | docs/decisions/tech-stack.md                    | 2026-03-23 |
| 编辑器 Markdown 实时渲染确认（@tiptap/extension-markdown） | design/FRONTEND.md, specs/epic-3/fe.md          | 2026-03-23 |
| 导出格式变更：EPUB→Markdown，去除 EPUB                    | specs/epic-5/, design/BACKEND.md                | 2026-03-23 |
| 文档真相源统一：删除根目录 USER\_STORIES.md，以 specs/epic 为准  | AGENTS.md, specs/                               | 2026-03-23 |

### 决策记录

| 决策                                           | 依据                                   | 状态 |
| -------------------------------------------- | ------------------------------------ | -- |
| 文档架构采用 per-Epic FE/BE/context 拆分             | 解决 Agent 上下文窗口爆炸问题                   | ✅  |
| Epic 开发顺序：EPIC1→3→2→4→5→6                    | EPIC3 是基础，EPIC2 依赖 EPIC3             | ✅  |
| 前端框架：React + TypeScript                      | 生态最大，AI coding 工具支持最好                | ✅  |
| 编辑器引擎：TipTap 核心 + @tiptap/extension-markdown | AI 写作集成成本最低，类 Typora 体验              | ✅  |
| CSS 方案：Tailwind CSS                          | AI 生成效率最高，与 React 集成最佳               | ✅  |
| 后端运行时：Python 3.11+ + FastAPI                 | AI 生态一等公民，LangChain/LlamaIndex 最成熟   | ✅  |
| 任务队列：ARQ + Redis                             | asyncio 原生，轻量，支持优先级/重试/并发上限          | ✅  |
| 向量库：pgvector（PostgreSQL 扩展）                  | V1 数据量小，同栈简化架构，ACID 一致性              | ✅  |
| 前后端类型同步：openapi-typescript                   | FastAPI 自动生成 openapi.json → 前端 TS 类型 | ✅  |
| V1 导出格式：DOCX / TXT / PDF / Markdown（去除 EPUB） | epub-gen 生态不成熟，Markdown 更实用          | ✅  |
| V1 不支持跨项目搜索、多人协作、移动端                         | Scope 控制，降低复杂度                       | ✅  |
| specs/epic 作为需求真相源，删除根目录 USER\_STORIES.md    | 方案 B，避免双重维护，符合 Agent 4 文件上限约束        | ✅  |

### 复盘

- 做得好：需求文档完整度高，技术选型有调研依据，文档架构为 Agent 并行开发做了充分准备
- 可改进：BE 技术栈决策用了两轮调研（第一轮未含 Python），下次明确候选范围再启动调研

***

## Sprint 1 · 校准 Sprint

**时间：** 2026-03-23 起（预计 2 周）

**状态：** ✅ 已完成

### Sprint Goal

搭建 FE+BE 脚手架，完成 US-1.1\~1.3，**跑出 Agent 开发速度基线**。故意保守，用于校准后续排期。

### 计划目标

- [x] 搭建 FE + BE 项目脚手架（monorepo 结构）
- [x] 配置 OpenAPI → openapi-typescript 类型生成流水线
- [x] 搭建 CI/CD 基础流水线
- [x] US-1.1 BE：注册 / 登录 / OAuth
- [x] US-1.1 FE：注册 / 登录页面
- [x] US-1.2 BE：项目列表接口
- [x] US-1.2 FE：项目列表与仪表盘
- [x] US-1.3 BE：创建项目接口
- [x] US-1.3 FE：创建项目流程

### 已完成

| 完成项 | 涉及文件 | 日期 |
| --- | --- | --- |
| US-1.1 FE：注册/登录/OAuth 页面 | src/features/epic-1/components/* | 2026-03-26 |
| US-1.2 FE：项目列表与仪表盘 | src/features/epic-1/components/ProjectDashboard.tsx | 2026-03-26 |
| US-1.3 FE：创建项目流程（3步向导） | src/features/epic-1/components/CreateProjectModal.tsx | 2026-03-26 |
| 前端测试基建：MSW mock、localStorage polyfill | src/test/setup.ts, src/mocks/* | 2026-03-26 |
| Sprint 1 前后端全链路测试通过 | npm test 全量通过 | 2026-03-26 |

### 复盘

- 做得好：BE+FE 并行开发，契约先行，TDD 基线已建立
- 可改进：本地环境依赖安装繁琐（pip/python 版本），后续需优化
- 下个 Sprint 调整：Sprint 2 可直接开始 US-1.4，基线已校准

### 开发支撑

- [x] Sprint 1 后端红灯测试基建
- [x] VSCode 后端测试入口配置（pytest 发现目录 + 任务入口）

### 前置依赖

- ✅ Sprint 0 全部决策完成
- ✅ Release Planning 完成（9 Sprint Roadmap 已确认）

### Sprint 结束时复盘

- 记录实际完成量 vs 计划
- 记录每个 US 实际耗时（BE + FE 分开）
- 用于校准 S2\~S9 估算

***

## Sprint 1.5 · 前端架构重构

**时间：** 2026-03-26（半天）

**状态：** ✅ 已完成

### Sprint Goal

将 Sprint 1 前端从"功能可用但粗糙"（6/10）提升至"专业质量"（8/10）。消除代码重复，建立共享组件库和全局状态管理。

### 计划目标

- [x] Round 1：共享 UI 组件层（FormInput、ErrorAlert、LoadingButton、SuccessView、AuthCard、SkeletonLoader、Lucide Icons）
- [x] Round 1：迁移 8 个页面至共享组件
- [x] Round 2：自定义 Hook（useApi、usePasswordValidation）
- [x] Round 3：AuthContext + AuthProvider + useAuth()
- [x] Round 4：Lucide 图标全面替换 + 无障碍改进（跳过链接、焦点陷阱）

### 已完成

| 完成项 | 涉及文件 | 日期 |
| --- | --- | --- |
| 7 个共享 UI 组件（TDD 模式） | src/components/ui/ | 2026-03-26 |
| 3 个自定义 Hook | src/hooks/ | 2026-03-26 |
| AuthContext 全局认证状态 | src/contexts/AuthContext.tsx | 2026-03-26 |
| 8 个页面迁移至共享组件 | src/features/epic-1/components/* | 2026-03-26 |
| Lucide Icons + 无障碍 | src/components/ui/icons/, src/hooks/useFocusTrap.ts | 2026-03-26 |
| 4 轮质量门禁评估 | subagent code review | 2026-03-26 |
| 关键 bug 修复后合并至 main | — | 2026-03-26 |
| Sprint 1.5 收尾：lint 修复 + 测试用例补充 | src/contexts/, src/hooks/ | 2026-03-30 |

### 质量评估结果

| Round | 质量评分 | 关键问题 |
| --- | --- | --- |
| R1 共享组件 | 6.5/10 | lint 错误、硬编码颜色、缺 autoComplete |
| R2 Hooks | 5.5/10 | useApi 无 unmount guard、类型不安全 |
| R3 AuthContext | 5.5/10 | **logout 后 token 泄漏（安全漏洞）** |
| R4 A11y | 6/10 | 跳过链接为空 div、空 Modal 失焦 |
| **合并前** | **全部修复** | 4 个关键 bug 已修复 |

### 测试结果

- 前端：`npm run test` — 90 passed，覆盖率 88.5% statement / 87.38% branch / 75.51% funcs / 89.58% lines
- TypeScript：`npm run typecheck` — 0 错误
- 新增 11 个测试用例（79 → 90 passed）

### 复盘

- 做得好：4 轮渐进式迁移，每轮有质量门禁评估；子 agent 并行评估效率高
- 可改进：质量评估在执行后补做，应在计划阶段就内置质量标准；部分 minor issue（autoComplete、hardcoded color）可随任务自然修复而非遗留

***

## Sprint 2 · Epic 1 项目管理完整可用

**时间：** Week 3-4（2026-03-30 起）

**状态：** ✅ 已完成

### Sprint Goal

Epic 1 项目管理全能力完整可用：项目设置、卷章目录、写作目标、归档功能全部上线。

### 计划目标

- [x] 测试基建：conftest 扩展（volumes/chapters/goals/writing_stats/trash fixtures）
- [x] US-1.4 BE：项目设置 API（commit 5716a0f）
- [x] US-1.4 FE：项目设置页面（commit 354b8e8）
- [x] US-1.5 BE+FE：卷章目录管理（卷CRUD/排序/软删除、章CRUD/跨卷移动/批量操作）
- [x] US-1.6 BE+FE：写作目标设定（每日/总字数目标、截止日期、进度统计）
- [x] US-1.8 BE+FE：项目归档（归档/取消归档、归档后只读）
- [x] E2E 测试：US-1.4/1.5/1.8 覆盖（commit 9da84b4）

### 前置依赖

- ✅ Sprint 1 脚手架稳定
- ✅ US-1.3（创建项目）完成

### Sprint 结束时复盘

- US-1.4~1.6, 1.8 BE+FE 全部完成
- US-1.7（回收站）待后续 Sprint（依赖 US-3.2）
- FE 覆盖率 79.63%，BE 覆盖率 92%

### 质量审查摘要

- 质量评分：9.1/10（修复前 7.8/10）
- 关键修复：5个（2安全漏洞+3性能瓶颈），详见 commit 历史
- 压力测试：16个通过，100卷×1000章场景响应时间 < 20ms
- 最终测试：100 BE passed + 207 FE passed + TypeScript零错误

***

## Sprint 3 · 编辑器核心 + 通知基础设施

**时间：** Week 5-6（2026-04-01 起）

**状态：** ✅ 已完成

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

***

## Sprint 4 · 章节管理 + 知识库解析引擎上线

**时间：** Week 7-8（2026-04-02 起）

**状态：** ✅ 已完成（2026-04-02）

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

***

## Sprint 5 · 知识库实体识别全系 + 回收站 + 编辑器辅助

**时间：** Week 9-10（2026-04-07）

**状态：** ✅ 已完成

### Sprint Goal

知识库五大实体（角色/地点/道具/势力/伏笔）识别与管理全系上线，编辑器辅助功能完善。

### 计划目标

**Epic 2（知识库实体）：**

- [x] US-2.2 BE+FE：角色识别与管理（去重归并、别名、确认/非角色、批量确认）
- [x] US-2.3 BE+FE：地点识别与管理（树结构、层级关系、搜索筛选）
- [x] US-2.4 BE+FE：道具/物品识别（重要性过滤、持有者变更历史、所有权追踪）
- [x] US-2.5 BE+FE：势力/组织识别（归属关系、敌对/同盟双向同步）
- [x] US-2.6 BE+FE：伏笔追踪（埋设/回收状态、AI建议、提醒机制、超期警告）

**Epic 1（项目管理扩展）：**

- [x] US-1.7 BE：回收站（软删除、30天恢复、彻底删除、自动清理）

**Epic 3（编辑器辅助）：**

- [x] US-3.7 BE：内容注释/批注（锚点、已解决状态、类型标记）
- [x] US-3.8 BE：章节备注（富文本2000字、hasNote字段、自动保存）
- [x] US-3.9 BE：写作计时器（stopwatch/countdown、会话持久化、3分钟防抖）
- [x] US-3.10 BE：查找替换（全文/章节内、大小写敏感、正则支持）

### 已完成

| 完成项 | 涉及文件 | 日期 |
| --- | --- | --- |
| US-2.1 Parser 引擎 Backend | `us21_parser.py`, `parser_service.py` | 2026-04-07 |
| US-2.2 Character BE+FE | `us22_character.py`, `kb_character_service.py`, `KBCharacter/` | 2026-04-07 |
| US-2.3 Location BE | `us23_location.py`, `kb_location_service.py` | 2026-04-07 |
| US-2.4 Item BE+FE | `us24_item.py`, `kb_item_service.py`, `KBItem/` | 2026-04-07 |
| US-2.5 Faction BE | `us25_faction.py`, `kb_faction_service.py` | 2026-04-07 |
| US-2.6 Foreshadow BE+FE | `us26_foreshadow.py`, `kb_foreshadow_service.py`, `KBForeshadow/` | 2026-04-07 |
| US-1.7 Trash BE | `us17_trash.py`, `trash_service.py` | 2026-04-07 |
| US-3.7~3.10 Editor Assist BE | `us37_annotations.py`~`us310_find_replace.py` | 2026-04-07 |
| Parser Status FE | `ParserStatus/`, `useParserStatus.ts` | 2026-04-07 |
| Sprint 5 全量测试 | 61+ BE tests, 77+ FE tests, 覆盖率≥80% | 2026-04-07 |
| Sprint 5 合并至 main | commit a9e703a | 2026-04-07 |

### 前置依赖

- Sprint 4 US-2.1（Parser）完成 ✅

***

## Sprint 6 · 知识库高级功能 + 系统设置基础

**预计时间：** Week 11-12

**状态：** ⏸️ 规划保留（未作为最近一轮独立交付批次推进）

### Sprint Goal

完成 Parser v2 重做并恢复 AI 识别/提取主链路，在此基础上推进知识库图谱与一致性检查上线，补齐系统设置基础能力，为 AI 写作和通知中心打好基础设施。

### 计划目标

**Epic 2（知识库高级）：**

- [ ] US-2.1 BE：Parser v2 重做（对齐 AIParseRequest/AIParseResponse、existingKB/excludeWords、置信度输出；当前规则解析降级为 fallback/mock）
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
- Sprint 6 进入 US-2.7 / US-2.8 前，需先完成 US-2.1 Parser v2 重做，恢复 AI 识别/提取主链路

### 当前情况（2026-04-19）

- [ ] US-2.1 Parser v2、US-2.7~2.11、US-6.1~6.4 仍未形成完整闭环实现
- [ ] Sprint 6 原始范围尚未关闭，仍保留在路线图中
- [x] 与 AI 平台相关的部分前置基础能力已在 Sprint 7 / Sprint 8 中先行推进，但不等于 Sprint 6 已完成

***

## Sprint 7 · AI 写作核心上线

**预计时间：** Week 13-14

**状态：** 🟡 核心范围完成，残余项已转入 Sprint 8

### Sprint Goal

完成 AI 平台收敛重构，并上线 Story Writer 核心链路，为后续 Story Copilot 与高级推理打好底座。

### 计划目标

**Epic 4（AI 平台重构 + Story Writer）：**

- [ ] AI 平台重构：收敛 `AITaskType` 为稳定任务集（不把世界构建 / 剧情推演继续做成顶层 task type）
- [ ] AI 平台重构：`AIResult` 改为判别式 payload 模型
- [ ] AI 平台重构：新增 `StoryCopilotSession` 会话模型与消息 / 草稿持久化
- [ ] AI 平台重构：V1 用 `StoryPlan` 取代重型 `WritingGraph`
- [ ] US-4.8 BE+FE：项目 AI 配置（三级覆盖：系统>用户>项目，字段级继承）
- [ ] US-4.1 BE+FE：AI 续写（流式输出、Esc 停止、上下文注入规则、Token 裁剪算法）
- [ ] US-4.2 BE+FE：AI 润色（Diff 替换、可撤销）
- [ ] US-4.3 BE+FE：AI 扩写/缩写（倍数控制、Diff 输出）
- [ ] US-4.4 BE+FE：AI 对话生成（角色画像、场景描述）

### 当前进展（2026-04-19）

**已完成**

- [x] AI 平台重构：收敛 `AITaskType` 为稳定任务集，并把 `worldbuild / plot_derive_lite` 移出顶层 task type，改走 `StoryCopilotSession.mode`
- [x] AI 平台重构：`AIResult` 改为判别式 `payloadType + payload`，并在 BE/FE/Test 全面落地
- [x] US-4.8 BE+FE：项目 AI 配置页、三级覆盖解析、来源标签、字段重置与保存 toast 已打通
- [x] US-4.1 BE+FE：AI 续写已支持真实 Provider、SSE、Esc 停止、上下文裁剪与任务快照
- [x] US-4.2 BE+FE：AI 润色已支持服务端 Diff 输出与前端采纳
- [x] US-4.3 BE+FE：AI 扩写/缩写已支持服务端 Diff 输出与前端采纳
- [x] US-4.4 BE+FE：AI 对话已支持角色/场景输入与流式结果
- [x] Provider 基建：当前已支持 `moonshot` / `mimo` 两套适配器，并由 env 统一切换；本地默认回归以 MiMo 为准

**转入 Sprint 8**

- [ ] `StoryCopilotSession` 的完整会话持久化、消息历史与草稿确认流转继续在 Sprint 8 收口
- [ ] `StoryPlan` 仍停留在架构/规格层，尚未取代更高阶写作编排
- [ ] US-4.5 / US-4.6 / US-4.7 的完整产品交互继续在 Sprint 8 范围内推进

### 前置依赖

- 原规划中，Sprint 6 US-6.4（通知配置）应先完成；实际执行中先交付了 AI 核心能力，相关设置能力仍留在路线图中
- US-4.8 项目配置是 US-4.1\~4.4 的实际前置，当前已完成

### 高风险点

- US-4.1 AI续写：流式输出 + 上下文裁剪，TDD 最难，需提前规划测试策略
- AI 平台重构若不先做，Sprint 8 的 Copilot 和推演会继续叠加技术债

***

## Sprint 8 · Story Copilot V1 + 导入 + 导出

**预计时间：** Week 15-16

**状态：** 🟡 进行中

### Sprint Goal

Story Copilot V1 上线，完成统一创作入口，并交付导入导出能力的 V1 核心范围。

### 计划目标

**Epic 4（Story Copilot V1）：**

- [ ] US-4.5 BE+FE：大纲生成（结构化输出、伏笔关联）+ Copilot `plot_derive_lite`（基于显式 KB 的轻量剧情推演）
- [ ] US-4.6 BE+FE：AI 起名（命名类型、文化背景、10个候选）
- [ ] US-4.7 BE+FE：写作建议（四维度、段落位置、反馈接口），并入 `Story Copilot`

**Epic 2（知识库 AI 增强）：**

- [ ] US-2.10 缝补 BE+FE：Copilot `worldbuild` mode（多轮对话 + 设定草稿 + KBSetting 确认写入）

**Epic 1（项目管理扩展）：**

- [ ] US-1.9 BE+FE：数据导入（Word/TXT/Markdown/纯文本）

**Epic 5（导出核心）：**

- [ ] US-5.1 BE+FE：导出作品（DOCX/TXT/PDF/Markdown，异步任务、下载链接、历史记录）

### 前置依赖

- Sprint 7 AI 平台重构与 US-4.1（续写）完成
- US-5.1 导出依赖 US-3.1（编辑器）和 US-2.x（知识库）完成

### 当前进展（2026-04-19）

**已完成**

- [x] Phase A：`StoryCopilotSession` 最小持久化与回放接口已落地（创建会话、列表、详情、追加消息、插卡、卡片动作）
- [x] Phase B-E：`turn` / `feedback` 路由已接入，支持 `worldbuild / plot_derive_lite / story_diagnose` 三种 mode 的统一轮次处理
- [x] 世界观设定最小 CRUD 与引用链路已落地，前端已接入 `KnowledgeBasePanel` / `KBSettingPanel`
- [x] AI 起名与建议入口已接入工作台：`NameGeneratorModal`、角色详情回填、段落跳转与建议反馈已形成闭环
- [x] `StoryCopilotPanel` 已从入口脚手架升级为“会话 + 回放 + 发消息 + 结果卡片 + 反馈”的最小可用形态
- [x] Epic 5 的导出/备份/模板/知识库传输/恢复基础面板与接口已存在于代码库中，可作为本 Sprint 的统一体验底座

**进行中**

- [ ] US-1.9 数据导入主链路尚未完整落地
- [ ] Epic 5 现有实现仍需继续做统一体验收口与联调校准
- [ ] Copilot 会话层的更深持久化、草稿确认与高级推演仍在持续推进

***

## Sprint 9 · 推理升级 + 备份恢复 + 存储管理

**预计时间：** Week 17-18

**状态：** 🔲 待开始

### Sprint Goal

完成 Story Reasoning 升级版，并上线备份恢复与存储管理，进入项目收尾阶段。

### 计划目标

**Epic 4（AI 推理升级）：**

- [ ] Story Reasoning Service V2：抽取一致性检查、剧情推演、伏笔判断的共享推理层
- [ ] US-4.5 升级：`plot_derive_v2`（接入摘要链 / 检索后提供更强剧情推演）
- [ ] US-2.8 升级：深度一致性检查与 Copilot 推演共享证据模型

**Epic 5（备份与恢复）：**

- [ ] US-5.2 BE+FE：自动备份（24小时轮询、7份保留、归档跳过）
- [ ] US-5.3 BE+FE：导出模板（用户级CRUD、20个上限）
- [ ] US-5.4 BE+FE：知识库导出/导入（JSON schema、冲突处理）
- [ ] US-5.5 BE+FE：项目备份与恢复（ZIP打包、覆盖/创建新项目、版本兼容）

**Epic 6（系统设置收尾）：**

- [ ] US-6.5 BE+FE：存储管理（配额聚合、80/90/100%阈值、清理建议与执行）

### 前置依赖

- Sprint 8 US-5.1（导出）完成

***

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
