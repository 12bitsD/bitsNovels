# Subagent Prompt Chain 文档

在重构和优化前端架构时，我们系统性地使用了 Subagents (如 `ui-zen-master`, `general_purpose_task`, `precise-backend-engineer`) 进行评估与改造。以下记录每次交互的 Prompt 链与决策。

## 阶段 1: 依赖分析与架构透视

### 1. 架构与热点分析 (UI Zen Master)
* **Goal**: 识别不符合视觉一致性 (Token 断层) 与认知负担 (状态深渊) 的组件。
* **Prompt**: "分析 `workspace/apps/web/src` 的组件结构，生成可视化架构图（Markdown/Mermaid格式），标注由于不一致的 token 或复杂状态导致需要优先重构的 hot spots。"
* **Result**: 生成了基于 8 像素网格、理科美学的热点报告。找出了 `ExportPanel` (状态爆炸)、`ProjectSettingsPage` (逻辑缠绕)、`WritingStatsPanel` (视觉异端) 等 6 个核心痛点。

### 2. 依赖与兼容性检查 (General Purpose Task)
* **Goal**: 检查 React 19 / Tailwind 4 等现代生态的潜在版本冲突，分析依赖关系。
* **Prompt**: "分析当前组件树的依赖关系，识别需要优先重构的核心模块，并进行 package.json 版本兼容性检查。请返回详细的依赖关系树和重构优先级建议。"
* **Result**: 提供了四级重构优先级：API 层封装 (React Query) -> Shared UI 扩展 -> 胖组件解耦 -> 路由懒加载。

## 阶段 2: 组件级重构 (Phase 2 Component Refactoring)

在执行具体的组件重构时，将使用如下 Prompt 模板与特定的 Subagent 进行交互：

### 3. 组件重构评估 (Precise Backend Engineer / UI Zen Master)
* **Goal**: 在重构前确保契约不被破坏。
* **Template**: "评估 `${组件名}` 的重构方案，确保不破坏现有测试契约。提取出 `useState` 逻辑至独立的自定义 Hook。要求覆盖率在修改后保持不低于 73%。"

### 4. 视觉与排版统一 (UI Zen Master)
* **Goal**: 替换硬编码颜色为语义化 Token，优化排版。
* **Template**: "将 `${组件名}` 中的所有硬编码色值 (如 `#HEX` / `rgb()`) 和散乱的 Tailwind 颜色类 (如 `bg-gray-100`)，替换为 `bg-parchment` / `text-ink` 等。确保符合 `design/FRONTEND.md` 中的对比度标准和 8 像素网格规范。"

## 阶段 3: 测试与验证闭环

### 5. 测试保障验证 (Search / General Purpose)
* **Goal**: 验证重构后测试是否正常执行。
* **Template**: "先运行与 `${组件路径}` 直接相关的 Vitest 用例，再补跑 `npm run test:web` 做全量前端回归；如果需要检查门禁，再运行 `npm run -w @bitsnovels/web lint` 与 `npm run -w @bitsnovels/web typecheck`。若补跑 `workspace` 根级 `npm run check`，确认脚本已自动自举 `.venv` 并完成根级 `ruff` 校验；如需继续清理后端基线，再单独运行 `npm run test:backend` 与 `npm run typecheck:backend`。"
