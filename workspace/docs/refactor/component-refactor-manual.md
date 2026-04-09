# 组件重构手册 (Component Refactoring Manual)

> 本手册记录了关键热点组件的设计决策和重构过程，以防后续维护时知识流失。

## 1. ExportPanel 重构手册

### 痛点与背景
`ExportPanel` 原本承担了所有的状态逻辑（格式选择、进度条追踪、后端 API 轮询），内部有超过 24 个 Hook 调用，是一个典型的“胖组件”，且严重违背单一职责原则。

### 设计决策 (Design Decisions)
- **解耦视图与业务**：提取 `useExportTaskManager` Hook，由其接管轮询、状态和 API 调用。`ExportPanel` 仅负责接收状态 `state` 和派发事件 `onStartExport`, `onCancel`。
- **状态收敛**：原本的 `isExporting`, `progress`, `downloadUrl`, `error` 多个状态被合并为单个复合状态对象 `{ status: 'idle' | 'processing' | 'success' | 'error', progress: number, url?: string, error?: string }`。

---

## 2. ProjectSettingsPage 重构手册

### 痛点与背景
存在 18 个零散的 `useState` 调用，表单的局部状态与提交时的全局状态极易出现不一致，特别是在错误恢复和数据回填时。

### 设计决策 (Design Decisions)
- **Reducer 模式**：采用 `useReducer` 管理表单数据和验证状态，将所有的修改动作抽象为 `dispatch({ type: 'UPDATE_FIELD', payload })`。
- **防抖验证**：将异步校验逻辑（如重名检测）通过自定义 Hook 分离，避免每次输入导致全页面重绘。

---

## 3. WritingStatsPanel & EditorTheme 视觉重构

### 痛点与背景
充满大量的 `#F5F0E8` 和 `bg-gray-100` 等硬编码，无法响应 Dark Mode，也不符合神匠的“温暖色板”理念。

### 设计决策 (Design Decisions)
- **语义化 Token**：禁用原始的 Tailwind 颜色体系，所有表面背景使用 `bg-parchment` (羊皮纸色)，文本使用 `text-ink` (墨水色)。
- **8px 呼吸网格**：将间距（Margin/Padding）强制对齐至 Tailwind 的 `p-2` (8px), `p-4` (16px)，移除任何如 `p-[10px]` 的散乱定义。
