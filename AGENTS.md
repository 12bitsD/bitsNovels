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
- 测试覆盖率 < 80% = 任务不合格，不得标记完成
- 完整 DoD 见 `process/dod.md`

---

## 当前任务看板（Sprint 1.5 · 前端架构重构）

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
| R1 共享组件 | FormInput、ErrorAlert、LoadingButton、SuccessView、AuthCard、SkeletonLoader、Lucide Icons | ✅ | 7 个组件，全部 TDD，79 测试通过 |
| R2 Hooks | useApi、usePasswordValidation | ✅ | usePasswordValidation 优秀；useApi 需后续增强 unmount guard |
| R3 AuthContext | AuthProvider + useAuth() + setAuthTokenGetter | ✅ | 含安全漏洞修复（logout token 泄漏） |
| R4 无障碍 | 跳过内容链接、useFocusTrap、Lucide 全面替换 emoji | ✅ | 含 2 个 a11y bug 修复 |
| 质量门禁 | 4 轮 subagent code review + 关键 bug 修复 | ✅ | 发现 4 个 critical issues，全部修复后合并 |
| 合并至 main | feat/frontend-refactor → main | ✅ | 2026-03-26 |

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
