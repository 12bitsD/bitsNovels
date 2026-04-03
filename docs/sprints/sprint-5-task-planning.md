# Sprint 5 Task Planning Document

> **Sprint 5 任务规划文档** — 知识库实体识别全系 + 回收站 + 编辑器辅助功能
>
> **时间**：Week 9-10（2026-04-07 起）
>
> **状态**：✅ 上下文收集完成 → 📝 任务规划中

---

## 读者确认

- **核心读者**：Sprint 5 执行 Agent（BE Agent + FE Agent）
- **已具备背景**：Sprint 0~4 完成情况、Epic 开发顺序、契约冻结规则、TDD 铁律
- **最关心**：任务范围、依赖关系、并行机会、验收标准

---

## 问题定义

Sprint 5 需要交付：US-2.1 Parser 引擎（XL · P0）、US-2.2~2.6 知识库五大实体（角色/地点/道具/势力/伏笔）、US-1.7 回收站、US-3.7~3.10 编辑器辅助功能。

---

## 核心结论（6 条）

1. **US-2.1 Parser 是 Sprint 5 核心 P0 任务**，是 US-2.2~2.6 的前置依赖，必须优先完成基础版本
2. **US-2.2~2.6 可在 Parser 有初步输出后并行启动**，5 个实体管理功能可由同一 BE Agent 顺序或分段完成
3. **US-1.7 回收站可立即启动**，不依赖 Parser（US-3.2 章节软删除已在 Sprint 4 完成）
4. **US-3.7~3.10 编辑器辅助可与 Parser 并行**，全部为 FE主导或 FE-only，可立即启动
5. **AI Mock 策略是 Sprint 5 最大风险**，建议采用确定性规则引擎而非真实 AI 调用
6. **建议 2 个 BE Agent + 2 个 FE Agent 并行**执行（见并行策略节）

---

## Sprint 5 任务全景

### P0 · US-2.1 Parser 引擎（XL 级）

**风险等级**：最高 — AI 不确定性测试、状态机设计、队列集成

**前置准备**（Sprint 5 开始前必须完成）：
- [ ] 确定 AI Mock 策略（推荐：确定性规则引擎，不依赖真实 AI 服务）
- [ ] 设计 Parser 状态机与状态持久化方案（参考 ADR-007）
- [ ] 准备 AI 回包格式的单元测试 fixtures
- [ ] 与 US-6.6 通知中心集成方案确认（伏笔到期提醒依赖通知）

**Task 分解**：

| 子任务 | 描述 | BE 文件 | FE 文件 | 依赖 |
|--------|------|---------|---------|------|
| T-2.1-A | Parser 状态机设计与实现 | `routes/us21_parser.py` | — | 契约已冻结 |
| T-2.1-B | 解析任务队列（ARQ）集成 | `worker.py` | — | T-2.1-A |
| T-2.1-C | 文本解析 API 端点实现 | `routes/us21_parser.py` | — | T-2.1-A |
| T-2.1-D | 实体输出接口（角色/地点/道具/势力/伏笔） | `routes/us21_parser.py` | — | T-2.1-A |
| T-2.1-E | Parser 测试基建（AI Mock fixtures） | `tests/epic_2/` | — | T-2.1-A |
| T-2.1-F | 通知集成（伏笔到期 → US-6.6） | `routes/us21_parser.py` | — | T-2.1-C |

**BE API 端点**（来自 `specs/epic-2/contract.md`，已冻结）：
- `POST /api/projects/:projectId/parser/chapters/:chapterId/trigger` — 手动触发章节解析
- `POST /api/projects/:projectId/parser/chapters/:chapterId/auto-trigger` — 自动触发（60s 防抖）
- `POST /api/projects/:projectId/parser/batch` — 创建批量解析任务
- `GET /api/projects/:projectId/parser/status` — 项目级解析概览与待解析数量
- `GET /api/projects/:projectId/parser/chapters/:chapterId/status` — 单章节解析状态与失败原因

**验收标准**：
- [ ] `POST /api/projects/:projectId/parser/chapters/:chapterId/trigger` 触发解析，返回 202 Accepted
- [ ] `GET /api/projects/:projectId/parser/status` 返回项目级解析概览
- [ ] Parser 状态机：PENDING → QUEUED → PARSING → PARSED/FAILED
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] AI 调用使用确定性 Mock（无真实 AI 依赖）

---

### P1 · US-2.2~2.6 知识库实体管理

**依赖**：US-2.1 Parser 初步输出后启动（预计 Sprint 第 2 周）

#### US-2.2 · 角色识别与管理

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-2.2-BE | 角色 CRUD + 去重归并 + 别名 + 确认/非角色标记 | `routes/us22_character.py` | — |
| T-2.2-FE | 角色列表、详情页、搜索过滤、批量确认操作 | — | `features/epic-2/components/KBCharacter*` |

**BE API 端点**（通用实体模式，来自 contract.md）：
- `GET /api/projects/:projectId/kb/:entityType` — 获取某类知识库列表（entityType: character/location/item/faction/foreshadow）
- `POST /api/projects/:projectId/kb/:entityType` — 手动创建知识库条目
- `GET /api/projects/:projectId/kb/:entityType/:entityId` — 获取知识库条目详情
- `PATCH /api/projects/:projectId/kb/:entityType/:entityId` — 更新知识库条目
- `DELETE /api/projects/:projectId/kb/:entityType/:entityId` — 软删除知识库条目
- `POST /api/projects/:projectId/kb/:entityType/:entityId/confirm` — 确认 AI 识别条目
- `POST /api/projects/:projectId/kb/:entityType/:entityId/reject` — 标记为非实体并加入排除规则
- `POST /api/projects/:projectId/kb/:entityType/bulk-confirm` — 批量确认待确认条目
- `POST /api/projects/:projectId/kb/:entityType/:entityId/merge` — 合并到同类型其他条目

#### US-2.3 · 地点识别与管理

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-2.3-BE | 地点 CRUD + 树结构 + 层级关系 | `routes/us23_location.py` | — |
| T-2.3-FE | 地点树视图、层级关系展示 | — | `features/epic-2/components/KBLocation*` |

**BE API 端点**（复用通用 KB CRUD）：
- `GET /api/projects/:projectId/kb/location` — 地点列表
- `POST /api/projects/:projectId/kb/location` — 创建地点
- `GET /api/projects/:projectId/kb/location/:entityId` — 地点详情（含 parentId 层级）
- `PATCH /api/projects/:projectId/kb/location/:entityId` — 更新地点
- `DELETE /api/projects/:projectId/kb/location/:entityId` — 删除地点
- `GET /api/projects/:projectId/kb/location/:entityId/references` — 删除前检查引用

#### US-2.4 · 道具/物品识别

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-2.4-BE | 道具 CRUD + 重要性过滤 + 持有者变更历史 | `routes/us24_item.py` | — |
| T-2.4-FE | 道具列表、重要性标注、持有者追踪 | — | `features/epic-2/components/KBItem*` |

**BE API 端点**（复用通用 KB CRUD）：
- `GET /api/projects/:projectId/kb/item` — 道具列表
- `POST /api/projects/:projectId/kb/item` — 创建道具
- `GET /api/projects/:projectId/kb/item/:entityId` — 道具详情
- `PATCH /api/projects/:projectId/kb/item/:entityId` — 更新道具
- `DELETE /api/projects/:projectId/kb/item/:entityId` — 删除道具
- `GET /api/projects/:projectId/kb/item/:entityId/references` — 删除前检查引用

#### US-2.5 · 势力/组织识别

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-2.5-BE | 势力 CRUD + 归属关系 + 敌对/同盟标注 | `routes/us25_faction.py` | — |
| T-2.5-FE | 势力关系面板、敌对/同盟标注 | — | `features/epic-2/components/KBFaction*` |

**BE API 端点**（复用通用 KB CRUD + 图谱）：
- `GET /api/projects/:projectId/kb/faction` — 势力列表
- `POST /api/projects/:projectId/kb/faction` — 创建势力
- `GET /api/projects/:projectId/kb/faction/:entityId` — 势力详情
- `PATCH /api/projects/:projectId/kb/faction/:entityId` — 更新势力
- `DELETE /api/projects/:projectId/kb/faction/:entityId` — 删除势力
- `POST /api/projects/:projectId/graph/edges` — 新增关系边（敌对/同盟/归属）
- `PATCH /api/projects/:projectId/graph/edges/:edgeId` — 编辑关系边
- `DELETE /api/projects/:projectId/graph/edges/:edgeId` — 删除关系边

#### US-2.6 · 伏笔追踪

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-2.6-BE | 伏笔 CRUD + 埋设/回收状态 + 提醒机制 | `routes/us26_foreshadow.py` | — |
| T-2.6-FE | 伏笔面板、状态流转、自动回收提醒 | — | `features/epic-2/components/KBForeshadow*` |

**BE API 端点**（复用通用 KB CRUD + 伏笔专用）：
- `GET /api/projects/:projectId/kb/foreshadow` — 伏笔列表
- `POST /api/projects/:projectId/kb/foreshadow` — 创建伏笔
- `GET /api/projects/:projectId/kb/foreshadow/:entityId` — 伏笔详情
- `PATCH /api/projects/:projectId/kb/foreshadow/:entityId` — 更新伏笔
- `DELETE /api/projects/:projectId/kb/foreshadow/:entityId` — 删除伏笔
- `PATCH /api/projects/:projectId/kb/foreshadows/:entityId/status` — 更新伏笔状态
- `PATCH /api/projects/:projectId/kb/foreshadows/:entityId/expected-resolve` — 更新预期回收章节

---

### P2 · US-1.7 回收站

**前置依赖**：US-3.2 章节软删除 ✅（Sprint 4 已完成）

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-1.7-BE | 回收站列表 + 恢复 + 彻底删除 + 30天清理 + 存储计算 | `routes/us17_trash.py` | — |
| T-1.7-FE | 目录面板入口 + 列表展示 + 倒计时 + 确认对话框 | — | `features/epic-1/components/Trash*` |

**BE API 端点**（来自 `specs/epic-1/contract.md`）：
- `GET /api/projects/:projectId/trash` — 获取项目回收站列表
- `POST /api/projects/:projectId/trash/:itemId/restore` — 恢复回收站条目
- `DELETE /api/projects/:projectId/trash/:itemId` — 永久删除单条回收站内容
- `DELETE /api/projects/:projectId/trash` — 清空回收站
- `GET /api/projects/:projectId/storage` — 获取项目存储占用（含回收站）

**FE 交互要点**：
- 入口：目录面板（VolumeOutline）右键菜单 + 编辑器文件菜单
- 显示字段：标题 / 类型（volume/chapter）/ 原卷 / 字数 / 删除时间 / 剩余天数
- 恢复操作：volume 已删除时 toast 提示"原卷已删除，恢复至根目录"
- 彻底删除：二次确认对话框，需输入项目名称

---

### P2/P3 · US-3.7~3.10 编辑器辅助功能

**前置依赖**：无，可立即启动（与 Parser 并行）

#### US-3.7 · 内容注释/批注

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-3.7-BE | 批注 CRUD + 锚点持久化 + 已解决状态 | `routes/us37_annotation.py` | — |
| T-3.7-FE | 批注面板 + 选中文本→添加批注 + 黄色高亮 + 悬停预览 | — | `features/epic-3/components/Annotation*` |

**BE API 端点**：
- `GET /api/chapters/{chapterId}/annotations` — 章节批注列表
- `POST /api/chapters/{chapterId}/annotations` — 创建批注（含 anchorStart/anchorEnd）
- `PATCH /api/chapters/{chapterId}/annotations/{id}` — 更新批注（含 resolved 状态）
- `DELETE /api/chapters/{chapterId}/annotations/{id}` — 删除批注

#### US-3.8 · 章节备注

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-3.8-BE | 章节备注存储 + 富文本支持（2000字限制） | `routes/us38_chapter_note.py` | — |
| T-3.8-FE | 可折叠备注区 + 富文本编辑器 + auto-save 反馈 | — | `features/epic-3/components/ChapterNote*` |

**BE API 端点**：
- `GET /api/chapters/{chapterId}/note` — 获取备注
- `PUT /api/chapters/{chapterId}/note` — 保存备注（含 charCount 校验 ≤2000）

#### US-3.9 · 写作计时器

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-3.9-BE | 计时会话管理（stopwatch/countdown）+ 服务端时间校验 | `routes/us39_timer.py` | — |
| T-3.9-FE | 浮动可拖动计时窗口 + 25分钟番茄钟默认 + 本次字数增量 | — | `features/epic-3/components/WritingTimer*` |

**BE API 端点**：
- `POST /api/projects/{projectId}/timer/sessions` — 开始计时会话
- `PATCH /api/projects/{projectId}/timer/sessions/{sessionId}` — 更新会话（暂停/继续/结束）
- `GET /api/projects/{projectId}/timer/sessions` — 获取历史会话

**安全注意**：客户端时间不可信，wordCountDelta 由 BE 根据保存内容计算

#### US-3.10 · 查找替换（FE Only）

| 子任务 | 描述 | BE | FE |
|--------|------|----|----|
| T-3.10-FE | Ctrl+F/Ctrl+H 查找替换栏 + match 高亮 + replace all + 单次撤销 | — | `features/epic-3/components/FindReplace*` |

**无新增 BE 端点**，复用 US-3.1 编辑器内容接口

---

## 并行执行策略

### Agent 分组建议

```
┌─────────────────────────────────────────────────────────┐
│  BE Agent 1 — US-2.1 Parser 引擎（P0 · XL）              │
│  阶段 1：Parser 状态机 + 队列集成 + 基础解析 API          │
│  阶段 2：通知集成（T-2.1-F）                            │
│  输出：Parser 可用 → 触发 US-2.2~2.6 BE 启动            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BE Agent 2 — US-1.7 回收站 + US-2.2~2.6 实体          │
│  US-1.7 可立即开始                                      │
│  US-2.2~2.6 等待 Parser 初步输出后顺序完成              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  FE Agent 1 — US-3.7~3.10 编辑器辅助（P2/P3）           │
│  可立即开始，与 BE Parser 开发完全并行                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  FE Agent 2 — US-2.2~2.6 前端（等待 Parser 初步输出）   │
│  US-2.1 Parser 有基础输出后启动                         │
└─────────────────────────────────────────────────────────┘
```

### Sprint Week 1 vs Week 2 划分

| Week | BE Agent 1 | BE Agent 2 | FE Agent 1 | FE Agent 2 |
|------|-----------|------------|------------|------------|
| **Week 1** | T-2.1-A~D（Parser 核心） | T-1.7-BE（回收站） | T-3.7~3.10-FE（全量并行） | — |
| **Week 2** | T-2.1-E~F（测试+通知） | T-2.2~2.6-BE（实体管理） | T-2.2~2.6-FE（实体管理） | — |

---

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| AI Mock 策略不确定导致测试无法通过 | 高 | 高 | Sprint 5 开始前必须确定 Mock 策略（建议规则引擎） |
| US-2.2~2.6 等待 Parser 阻塞 BE Agent 2 | 中 | 高 | Parser 分阶段交付，实体管理在基础输出后立即启动 |
| US-3.9 计时器客户端时间篡改 | 低 | 中 | wordCountDelta 由 BE 根据实际保存内容计算 |
| US-1.7 恢复时 volume 已删除的 fallback 逻辑遗漏 | 低 | 中 | BE 测试覆盖 volume 已删除场景 |
| US-2.6 伏笔提醒依赖 US-6.4（通知配置）| 中 | 低 | 通知集成方案已与 US-6.6 对齐，Sprint 6 US-6.4 完善 |

---

## Sprint 5 开始前待确认事项

| 事项 | 负责人 | 状态 | 备注 |
|------|--------|------|------|
| AI Mock 策略确定（规则引擎 vs 本地 LLM） | Team | 🔲 待确认 | 影响 T-2.1-E 测试基建 |
| Parser 状态机设计评审 | BE Agent 1 | 🔲 Sprint 5 Week 1 Day 1 | 契约已冻结，设计需内部评审 |
| US-2.1~2.6 contract.md 最终确认 | BE Agent | 🔲 Sprint 5 Week 1 Day 1 | 部分端点可能微调 |
| US-3.7~3.10 contract.md 最终确认 | FE Agent | 🔲 Sprint 5 Week 1 Day 1 | Annotation/ChapterNote 接口已冻结 |

---

## 验收标准（DoD）

Sprint 5 完成的判定条件：

| 类别 | 标准 |
|------|------|
| **US-2.1 Parser** | 解析触发 → 状态查询 → 实体输出，全流程可运行；测试覆盖率 ≥ 80% |
| **US-2.2~2.6** | 5 类实体 CRUD 全部可用；批量确认/去重归并功能正常 |
| **US-1.7** | 回收站列表/恢复/彻底删除全流程通过；volume 已删除 fallback 正常 |
| **US-3.7~3.10** | 批注/备注/计时器/查找替换全量通过 FE 组件测试 |
| **回归测试** | 现有测试全部通过（BE ≥ 80%，FE ≥ 73%） |
| **契约更新** | 所有 contract.md 变更已在 AGENTS.md 看板备注 |
| **文档同步** | CHANGELOG.md 已新增 Sprint 5 条目 |

---

## 参考文档

| 文档 | 路径 | 用途 |
|------|------|------|
| Sprint 5 ADR | `docs/decisions/adr-007-sprint5-parser-defer.md` | US-2.1 推迟原因及规划说明 |
| Sprint Log | `docs/SPRINT_LOG.md` | Sprint 0~4 历史记录 |
| EPIC 2 BE Spec | `specs/epic-2/be.md` | US-2.1~2.11 后端需求 |
| EPIC 2 FE Spec | `specs/epic-2/fe.md` | US-2.1~2.11 前端需求 |
| EPIC 2 Contract | `specs/epic-2/contract.md` | Parser + KB 实体 API 契约（已冻结） |
| EPIC 1 BE Spec | `specs/epic-1/be.md` | US-1.7 后端需求（lines 300-347） |
| EPIC 1 FE Spec | `specs/epic-1/fe.md` | US-1.7 前端需求（lines 180-211） |
| EPIC 3 BE Spec | `specs/epic-3/be.md` | US-3.7~3.10 后端需求 |
| EPIC 3 FE Spec | `specs/epic-3/fe.md` | US-3.7~3.10 前端需求 |
| DoD | `process/dod.md` | 完成标准（TDD 铁律、覆盖率要求） |
| NFR 约束 | `process/CONSTRAINTS.md` | 性能/存储/安全约束值 |

---

*文档版本：v1.1 | 创建日期：2026-04-03 | 更新：修正 API 端点以匹配冻结的 contract.md | 状态：待 Sprint 5 Team 确认*
