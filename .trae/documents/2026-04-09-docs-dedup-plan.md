# 文档全面审查与去重整合执行计划（保持现有结构）

## Summary

目标：对仓库最新版本的项目文档进行系统审查，识别并消除重复/过时/冲突内容；在不改变现有目录框架（`docs/`、`design/`、`process/`、`specs/`、`workspace/docs/`、各子项目 README 等）的前提下，确保文档精炼、单一真相源明确、内容无重复。

约束与偏好（来自你的选择）：

- 审查范围不包含：`.trae/documents/`、`.opencode/plans/` 等工具/过程产物目录
- 对确认重复/过时文档：优先合并后直接删除冗余文件（不额外归档）
- `docs/CHANGELOG.md` 与 `workspace/docs/CHANGELOG.md` 两者保留，但分工明确、互相引用、避免重复段落

---

## Current State Analysis（基于仓库现状勘察）

### 1) 文档分布（主要维护区）

- 根目录：`README.md`、`AGENTS.md`
- 项目文档：`docs/`（含 `CHANGELOG.md`、`SPRINT_LOG.md`、`ENGINEERING_WORKSPACE.md`、`decisions/`、`archive/`、以及若干按日期的审计报告）
- 规范文档：`design/`（`FRONTEND.md`、`BACKEND.md`）、`process/`（`dod.md`、`CONSTRAINTS.md`）
- 需求/契约：`specs/epic-1~6/{fe,be,contract}.md`
- 工作区文档：`workspace/docs/`（包含 `CHANGELOG.md` 与 `refactor/` 目录）
- 子项目说明：`workspace/apps/web/README.md`

### 2) 已发现的主要问题类型（示例）

- **事实冲突（同一主题给出不同结论）**
  - `process/CONSTRAINTS.md` 中 “导出格式”包含 EPUB，但 `docs/decisions/tech-stack.md`、`docs/SPRINT_LOG.md`、`specs/epic-5/*` 明确 V1 去除 EPUB、加入 Markdown。
- **同主题多份文档且内容重叠**
  - 前端质量/覆盖/审计：`docs/FRONTEND_AUDIT_2026-04-09.md`、`docs/FRONTEND_AC_MATRIX_2026-04-09.md` 与 `workspace/docs/refactor/test-matrix.md` 存在范围、结论与描述重复。
  - refactor 过程文档：`workspace/docs/refactor/impact-analysis.md`、`tech-debt-board.md`、`prompt-chain.md` 中存在彼此重复、以及与当前实现状态（如已引入 React Query）不一致的表述。
- **无用/噪音文件**
  - `workspace/test_output*.txt`、`workspace/test_final.txt` 等为一次性测试日志产物，不属于长期维护文档，且可能干扰“文档入口清晰”的目标。

---

## Proposed Changes（分步骤执行 + 验证标准）

> 注：每一步完成后都执行该步的“验证标准”，通过后再进入下一步。所有变更完成后，必须补齐 `docs/CHANGELOG.md` 条目（AGENTS.md 规则）。

### Step 1 — 建立文档清单与主题归类（Inventory → Taxonomy）

执行内容：

- 汇总“纳入审查范围”的文档清单（按目录分组）：根目录、`docs/`、`design/`、`process/`、`specs/`、`workspace/docs/`、各应用 README。
- 为每份文档标记：
  - 主题（例如：工程入口、质量门禁、视觉规范、NFR 约束、Epic 需求、审计报告等）
  - 维护性质：权威规范 / 过程记录 / 临时报告 / 历史归档
  - 依赖关系：哪些文档会被其他文档引用（潜在“删了会断链”的风险点）

验证标准：

- 清单覆盖范围内所有 `.md` 文档（以及 README）均被列出并分类，无遗漏目录。
- 每份文档至少有 1 个明确主题标签，且能指出“应该保留为权威来源”或“应被合并/删除”的初步倾向。

### Step 2 — 确立“单一真相源”与分工边界（Authority Map）

执行内容：

- 为核心主题明确权威文档：
  - 工程入口与目录：`docs/ENGINEERING_WORKSPACE.md` 为主，README 仅保留最短入口提示
  - 视觉规范：`design/FRONTEND.md`
  - 后端架构规范：`design/BACKEND.md`
  - DoD：`process/dod.md`
  - NFR 数值约束：`process/CONSTRAINTS.md`
  - 技术栈决策：`docs/decisions/tech-stack.md`
  - 需求/契约：`specs/epic-N/*`（保持 per-epic 结构不动）
  - 版本级更新日志：`docs/CHANGELOG.md`
  - 工程/工作区级更新日志：`workspace/docs/CHANGELOG.md`
- 针对已存在的“同主题多份”文档，决定最终保留者与合并策略：
  - “审计/矩阵”类：建议保留 `docs/FRONTEND_AUDIT_2026-04-09.md` 作为单份审计报告；把 `FRONTEND_AC_MATRIX_2026-04-09.md` 的内容合并为审计报告的附录/章节，随后删除矩阵文件（避免两份报告不同步）。
  - `workspace/docs/refactor/`：保留“长期可复用”的手册/Checklist（如 `component-refactor-manual.md`、`component-checklist.md`），删除一次性或含强耦合上下文/明显过时的内容（如 `prompt-chain.md`、与现状冲突的 `tech-debt-board.md`、可被审计报告吸收的 `impact-analysis.md` 等）。
- 明确两个 CHANGELOG 的边界与互相引用方式：
  - `docs/CHANGELOG.md`：版本号 + 里程碑级总结 + 文档结构重大变更
  - `workspace/docs/CHANGELOG.md`：工程脚本/工作区门禁/开发流程细节（不重复版本级大段描述）

验证标准：

- “权威来源表”覆盖所有核心主题，且每个主题只有一个权威文档。
- 所有计划删除的文档均有“去向”（合并到哪个文档的哪个章节）与“不丢信息”的清单化说明。
- CHANGELOG 分工规则写入两份 changelog 的顶部说明（互相链接），且不出现重复段落的维护负担。

### Step 3 — 执行内容合并与冲突修正（Merge → Normalize）

执行内容（按优先级）：

1. 修正事实冲突：以 `docs/decisions/tech-stack.md` + `docs/SPRINT_LOG.md` + `specs/epic-5/*` 为依据，更新 `process/CONSTRAINTS.md` 中导出格式等冲突条目（EPUB → Markdown）。
2. 合并前端“审计/矩阵/测试矩阵”重复内容：
   - 把 `docs/FRONTEND_AC_MATRIX_2026-04-09.md` 合并进 `docs/FRONTEND_AUDIT_2026-04-09.md`（作为附录或章节）
   - 评估 `workspace/docs/refactor/test-matrix.md` 的内容是否仍需单独保留：若仅复述审计/覆盖率阈值/风险项，则将其精简为指向审计报告与执行命令的短文档，或直接并入审计报告后删除
3. 清理 `workspace/docs/refactor/` 中的过时/重复内容：
   - 删除包含工具/子代理 prompt 记录、或与当前状态明显冲突且不可验证的过程文档
   - 保留可复用模板/手册，但统一引用权威文档（DoD、设计规范、门禁命令以 `workspace/package.json` 为准）
4. 对 README 做“入口化”瘦身：
   - 根 README 保留产品概述 + 文档入口 + 最短 Quick Start（避免与 `docs/ENGINEERING_WORKSPACE.md`、`workspace/apps/web/README.md` 重复）
   - Web README 保留前端本地开发与脚本；其余指向权威文档

验证标准：

- 全仓库搜索 `EPUB`：仅允许出现在“历史记录/说明 V1 不支持 EPUB”的语境中；`process/CONSTRAINTS.md` 不再把 EPUB 当作 V1 约束。
- 全仓库搜索关键入口命令（`npm run check/test:web/generate:api-types/ensure:python`）：文档描述与 `workspace/package.json` 一致，无过期命令。
- 被合并后的目标文档结构清晰：同主题内容只出现一次；其他地方均改为引用/链接，而不是复制粘贴。

### Step 4 — 删除冗余与无用文件（Prune）

执行内容：

- 删除已完成合并的冗余文档文件（依据 Step 2 的“去向清单”）。
- 删除明显的一次性日志/产物文件（例如 `workspace/test_output*.txt`、`workspace/test_final.txt`），若它们不再被任何文档引用。

验证标准：

- 搜索仓库中对被删除文件路径的引用：结果为 0（避免断链）。
- `docs/`、`workspace/docs/`、`design/`、`process/`、`specs/` 目录结构未改变（只发生文件内容调整与删除冗余文件）。

### Step 5 — 补齐变更记录与最终一致性检查（Changelog + Consistency）

执行内容：

- 在 `docs/CHANGELOG.md` 增加一条“文档去重/结构优化”的记录（描述：哪些主题被合并、哪些过时文档被删除、关键冲突修正点）。
- 在 `workspace/docs/CHANGELOG.md` 增加与其职责匹配的简要条目（如：门禁命令口径/文档入口更新），并链接到 `docs/CHANGELOG.md` 对应版本条目。
- 进行最终一致性巡检：检查各文档顶部的“入口/索引”是否互相指向正确、无重复入口描述。

验证标准：

- `docs/CHANGELOG.md` 与 `workspace/docs/CHANGELOG.md` 均有新增条目，且分工边界清晰、互不复制大段内容。
- 关键入口文档（根 README、`docs/ENGINEERING_WORKSPACE.md`、`process/dod.md`、`process/CONSTRAINTS.md`、`docs/decisions/tech-stack.md`）之间的引用闭环成立：从任意一个入口都能定位到其他权威规范。

---

## Assumptions & Decisions（已锁定）

- 不把 `.trae/documents/`、`.opencode/plans/` 纳入清理（避免影响工具记录）
- 对确认冗余的文档：合并后直接删除
- CHANGELOG 双文件保留：`docs/` 负责版本级，`workspace/docs/` 负责工程级，并通过互链避免重复

