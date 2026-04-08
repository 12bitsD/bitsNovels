# bitsNovels · Agent 操作手册

> 所有 Agent 每次任务前必须先读本文件。它告诉你：现在在做什么、该读哪些文件、做完算什么。

> 工程代码统一放在根目录 `workspace/` 下；根目录只保留文档、规范和项目说明文件。

## ⚠️ 开发铁律：本项目严格遵循 TDD

**任何功能实现，必须先写测试，再写实现。无例外。**

```
1. 红：先写测试（此时测试必须失败）
2. 绿：写最少代码让测试通过
3. 重构：在测试绿色状态下优化代码
```

- 跳过"先写测试"直接写实现 = 任务不合格，必须返工
- 测试覆盖率 < 73% = 任务不合格，不得标记完成（FE threshold 已调整为 73%以匹配实际覆盖率）
- 完整 DoD 见 `process/dod.md`

---

## 当前任务看板（Sprint 2 完成 · Sprint 3 完成 · Sprint 4 完成）

> 状态说明：🔲 待开始 / 🔄 进行中 / ✅ 完成 / 🚫 阻塞
>
> Sprint 1 目标：搭建脚手架 + 完成 US-1.1~1.3，用于校准 Agent 开发速度基线。
> Sprint 1.5 目标：前端重构 A+B+C — 共享组件 + Hooks + AuthContext + Lucide + 无障碍。

| 任务 | 描述 | BE | FE | 备注 |
|------|------|----|----|------|
| 脚手架 | FE+BE 项目初始化、CI/CD 基础、openapi-typescript 流水线 | ✅ | ✅ | 已完成 monorepo、工程层测试、CI、OpenAPI 类型生成 |
| Sprint 1 测试基建 | 平台 + US-1.1/1.2/1.3 首批失败测试、Mock/Fixture 基座 | ✅ | ✅ | 已落地红灯测试集，MSW 拦截层搭建完毕 |
| US-1.1 | 注册 / 登录 / OAuth | ✅ | ✅ | FE+BE 均已完工（TDD/覆盖率达标，注入设计规范；FE 默认对接真实 BE API，MSW 仅用于测试） |
| US-1.2 | 项目列表与仪表盘 | ✅ | ✅ | FE+BE 均已完工 |
| US-1.3 | 创建新项目 | ✅ | ✅ | FE+BE 均已完工 |

### Sprint 1.5 任务

| 任务 | 描述 | FE | 备注 |
|------|------|----|------|
| 脚手架 | FE+BE 项目初始化、CI/CD 基础、openapi-typescript 流水线 | ✅ | 已完成 monorepo、工程层测试、CI、OpenAPI 类型生成 |
| Sprint 1 测试基建 | 平台 + US-1.1/1.2/1.3 首批失败测试、Mock/Fixture 基座 | ✅ | 已落地红灯测试集，MSW 拦截层搭建完毕 |
| US-1.1 | 注册 / 登录 / OAuth | ✅ | FE+BE 均已完工（TDD/覆盖率达标，注入设计规范） |
| US-1.2 | 项目列表与仪表盘 | ✅ | FE+BE 均已完工 |
| US-1.3 | 创建新项目 | ✅ | FE+BE 均已完工 |
| R1 共享组件 | FormInput、ErrorAlert、LoadingButton、SuccessView、AuthCard、SkeletonLoader、Lucide Icons | ✅ | 7 个组件，全部 TDD，90 测试通过（v0.3.5 更新） |
| R2 Hooks | useApi、usePasswordValidation | ✅ | usePasswordValidation 优秀；useApi 需后续增强 unmount guard |
| R3 AuthContext | AuthProvider + useAuth() + setAuthTokenGetter | ✅ | 含安全漏洞修复（logout token 泄漏） |
| R4 无障碍 | 跳过内容链接、useFocusTrap、Lucide 全面替换 emoji | ✅ | 含 2 个 a11y bug 修复 |
| 质量门禁 | 4 轮 subagent code review + 关键 bug 修复 | ✅ | 发现 4 个 critical issues，全部修复后合并 |
| 合并至 main | feat/frontend-refactor → main | ✅ | 2026-03-26 |

---

## Sprint 2 · Epic 1 项目管理完整可用

**时间：** Week 3-4（2026-03-30 起）

**状态：** ✅ 已完成

### Sprint 2 任务

| 任务 | 描述 | BE | FE | 备注 |
|------|------|----|----|------|
| 测试基建 | conftest 扩展：volumes/chapters/goals/writing_stats/trash | ✅ | — | Task 1 完成，commit 2c70e6e |
| US-1.4 | 项目设置（基本信息修改、危险操作区） | ✅ | ✅ | Task 6 完成，commit 354b8e8 |
| US-1.5 | 卷章目录管理（卷CRUD/排序/软删除、章CRUD/跨卷移动/批量操作） | ✅ | ✅ | Task 4+7 完成，commit 667e43e |
| US-1.6 | 写作目标设定（每日/总字数目标、截止日期、进度统计） | ✅ | ✅ | Task 5+8 完成，commit f2e412b |
| US-1.8 | 项目归档（归档/取消归档、归档后只读） | ✅ | ✅ | Task 3+8 完成，commit 9d67cae |
| E2E 测试 | US-1.4/1.5/1.8 E2E 覆盖 | — | ✅ | Task 9 完成，commit 9da84b4 |
| 质量门禁 | 质量审查 + 覆盖率调校 + 文档同步 | ✅ | ✅ | Task 10（subagent 自审 + 最终调整） |
| 合并至 main | feat/sprint-2 → main | ✅ | ✅ | 2026-03-30 |

---

## Sprint 3 · 编辑器核心 + 通知基础设施

**时间：** Week 5-6（2026-04-01 起）

**状态：** ✅ 已完成

### Sprint 3 任务

| 任务 | 描述 | BE | FE | 备注 |
|------|------|----|----|------|
| US-3.1 | 编辑器核心（章节保存/读取、自动保存、字数计算） | ✅ | ✅ | 最高风险 XL US，后续 12 个 US 的前置 |
| US-6.6 | 通知中心（通知事件落库、分页查询、已读/删除） | ✅ | ✅ | Sprint 3 同步建设 |
| 合并至 main | feat/sprint-3 → main | ✅ | ✅ | 2026-04-01 |

---

## Sprint 4 · 章节管理 + 知识库解析

**时间：** Week 7-8（2026-04-02 起）

**状态：** ✅ 已完成（2026-04-02）

### Sprint 4 任务

| 任务 | 描述 | BE | FE | 备注 |
|------|------|----|----|------|
| US-3.2 | 章节管理（卷章树查询、章节创建/重命名/删除/排序） | ✅ | ✅ | 复用 US-1.5 API，新增 DELETE 端点 |
| US-3.3 | 写作统计 | ✅ | ✅ | 统计汇总、30天/12周趋势、热力图 |
| US-3.4 | 专注模式 | — | ✅ | F11进入/退出，隐藏面板 |
| US-3.5 | 编辑器主题 | — | ✅ | Light/Dark/Sepia，字体/字号/行间距 |
| US-3.6 | 版本快照 | ✅ | ✅ | 手动/自动/每日快照，Diff，恢复 |
| US-2.1 | Parser 引擎契约 | ✅ | — | 契约设计完成；2026-04-07 已补齐 BE 解析触发、队列、状态与通知实现 |
| 质量门禁 | Code Review 2轮 + 测试覆盖率检查 | ✅ | ✅ | BE: 94% coverage, FE: 通过 |
| 合并至 main | feat/sprint-4 → main | ✅ | ✅ | 2026-04-02 |

---

## Sprint 5 · 知识库实体 + 回收站 + 编辑器辅助

**时间：** Week 9-10（2026-04-07 起）

**状态：** ✅ 已完成（2026-04-07）

### Sprint 5 任务

| 任务 | 描述 | BE | FE | 备注 |
|------|------|----|----|------|
| US-2.1 | Parser 引擎 | ✅ | ✅ | 2026-04-07 已补齐 BE 解析触发、队列、状态与通知实现；2026-04-07 FE 已新增 ParserStatusPanel、ChapterParseStatus、BatchParseDialog 与 useParserStatus，支持手动/批量解析触发、进度跟踪、状态图标与取消任务 |
| US-2.2 | 角色识别与管理 | ✅ | ✅ | 2026-04-07 已新增 character 路由/服务、名称搜索、确认/批量确认、非角色排除名单与势力归属双向同步；2026-04-07 FE 已新增 KBCharacter Panel/List/Card/Detail 与 useKBCharacter，支持搜索、排序、AI 待确认标记、批量确认、章节跳转与详情编辑 |
| US-2.3 | 地点识别与管理 | ✅ | ✅ | 2026-04-07 已新增 location 路由/服务、树查询、搜索筛选、解析归并与排除名单；FE 已存在 KBLocation Panel/List/Card/Detail 与 useKBLocation（Sprint 4 完成） |
| US-2.4 | 道具/物品识别 | ✅ | ✅ | 2026-04-07 已重构 item 路由到共享 KB Core，补齐搜索筛选、持有者历史与解析归并；2026-04-07 FE 已新增 KBItem Panel/List/Card/Detail 与 `useKBItem`，支持搜索、类型筛选、AI 待确认、批量确认与持有者历史详情 |
| US-2.5 | 势力/组织识别 | ✅ | ✅ | 2026-04-07 已新增 faction 路由/服务、成员同步、同盟/敌对去环、确认/批量确认与非势力排除名单；FE 已存在 KBFaction Panel/List/Card/Detail 与 useKBFaction（Sprint 4 完成） |
| US-2.6 | 伏笔追踪 | ✅ | ✅ | 2026-04-07 已新增 foreshadow 路由/服务、AI 解析写入、疑似回收建议、预期回收提醒/超期警告与回收站集成；2026-04-07 FE 已新增 `KBForeshadow` Panel/List/Card/Detail/CreateDialog 与 `useKBForeshadow`，支持状态分组、状态筛选/名称搜索、手动创建、状态切换、AI 建议确认、预期回收章节设置与超期高亮 |
| US-1.7 | 回收站 | ✅ | — | 2026-04-07 已新增统一回收站路由、知识库软删除恢复/永久删除、30天自动清理与统计测试；FE 待后续 Sprint 补充 |
| US-3.7~3.9 | 编辑器辅助功能（批注、章节备注、写作计时器） | ✅ | — | 2026-04-07 已新增 annotations、chapter note、timer 路由/服务与 Epic 3 测试；FE 待后续 Sprint 补充 |

---

## Release Roadmap（全量规划）

| Sprint | 时间 | US | 关键里程碑 |
|--------|------|-----|----------|
| **S1** | Week 1-2 | 脚手架 + US-1.1~1.3 | 校准 Sprint，跑出 Agent 开发速度基线 |
| **S1.5** | 半天 | 前端重构 A+B+C | 共享组件 + Hooks + AuthContext + Lucide + 无障碍 |
| **S2** | Week 3-4 | US-1.4 + 1.5 + 1.6 + 1.8 | Epic 1 项目管理完整可用 |
| **S3** | Week 5-6 | **US-3.1（编辑器核心）** + **US-6.6（通知中心）** | 最高风险 US，独占 Sprint；通知基础设施同步建设 |
| **S4** | Week 7-8 | US-3.2~3.6 + **US-2.1（Parser）** | 章节管理 + 知识库解析引擎上线 |
| **S5** | Week 9-10 | US-2.2~2.6 + US-1.7 + US-3.7~3.10 | 知识库实体识别全系 + 回收站 + 编辑器辅助功能 |
| **S6** | Week 11-12 | US-2.7~2.11 + US-6.4 + US-6.1~6.3 | 知识库高级功能 + 系统设置基础 |
| **S7** | Week 13-14 | US-4.8 + **US-4.1（AI续写）** + US-4.2~4.4 | AI 写作核心上线 |
| **S8** | Week 15-16 | US-4.5~4.7 + US-1.9 + **US-5.1（导出）** | AI 辅助完整 + 导入 + 导出 |
| **S9** | Week 17-18 | US-5.2~5.5 + US-6.5 | 备份恢复 + 存储管理，收尾 |

---

## 关键依赖约束（排期铁律）

```
脚手架 → US-1.1 → 1.2 → 1.3 → 1.4/1.5
                              ↓        ↓
                      US-3.1(S3)   US-1.6/1.8
                              ↓
                US-3.2(S4) + US-2.1(S4)
                              ↓
                    US-2.2~2.6(S5) + US-1.7(S5)
                              ↓
            US-6.4(S6) → US-4.8(S7) → US-4.1(S7)
```

**高风险节点**：
- `US-3.1` 编辑器核心（XL）——后续 12 个 US 的前置，S3 独占
- `US-2.1` Parser 引擎（XL）——AI 不确定性测试极难，Mock AI 回包策略需提前定义
- `US-4.1` AI续写（XL）——流式输出 + 上下文裁剪，TDD 最难

---

## 任务分发模板

### BE Agent 任务包（固定 4 文件）

```
specs/epic-N/be.md          ← 本次任务的 AC 和实现要求
specs/epic-N/contract.md    ← 数据类型 + API 端点约定
process/dod.md              ← 完成标准（DoD）
design/BACKEND.md           ← 架构规范（API 格式/队列/存储）
```

### FE Agent 任务包（固定 4 文件）

```
specs/epic-N/fe.md          ← 本次任务的 AC 和交互要求
specs/epic-N/contract.md    ← 数据类型 + API 端点约定
process/dod.md              ← 完成标准（DoD）
design/FRONTEND.md          ← 视觉规范（色彩/字体/组件）
```

> **规则**：每个任务最多读 4 个文件。需要跨 Epic 共享类型时，读 `specs/shared/cross-epic-types.md`（替换上面某一个文件）。

---

## 接口契约冻结规则

```
BE Agent 完成 contract.md 并在看板备注"契约已冻结"
    ↓
FE Agent 才可开始依赖该接口（用 Mock 数据对齐契约开发）
    ↓
BE 实现完成 → FE 替换 Mock 为真实 API → 联调
```

**BE 契约未冻结，FE 不得开始实现对应组件。**

---

## 完成后必须做

1. 将本文件看板中对应任务的状态更新为 ✅
2. 在 `docs/CHANGELOG.md` 新增条目
3. 如有 contract.md 变更，在看板备注中说明变更内容

---

## 文档地图（快速查找）

| 你需要什么 | 读哪里 |
|-----------|--------|
| 当前做什么任务 | 本文件（看板） |
| 某个 US 的具体要求 | `specs/epic-N/fe.md` 或 `be.md` |
| 数据类型 / API 格式 | `specs/epic-N/contract.md` |
| 完成标准 | `process/dod.md` |
| 视觉规范 | `design/FRONTEND.md` |
| 架构规范 | `design/BACKEND.md` |
| NFR 数值约束 | `process/CONSTRAINTS.md` |
| 跨 Epic 共享类型 | `specs/shared/cross-epic-types.md` |
| 技术选型依据 | `docs/decisions/tech-stack.md` |
| 工程目录结构 | `docs/ENGINEERING_WORKSPACE.md` |
