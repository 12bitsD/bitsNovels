# bitsNovels

> AI 辅助长篇小说创作平台 · 面向长篇小说作者的写作工作室与知识库系统

---

## 是什么

`bitsNovels` 是一个围绕“长篇小说创作”设计的全栈工程：作者在同一工作台里管理项目、卷章、正文、知识库、AI 写作与导出备份。

项目的核心思路不是把 AI 做成单次问答工具，而是把它放进创作流程里：

- 写正文时维护章节与快照
- 解析正文时沉淀角色、地点、道具、势力、伏笔与世界观设定
- 在工作台内完成 AI 续写、润色、扩写/缩写、对话生成与 Copilot 辅助
- 在项目层完成导出、备份、恢复与通知闭环

**目标用户**：高频写作、长期连载、需要管理大量角色关系与跨章节伏笔的长篇作者。

---

## 当前落地范围

| Epic | 已落地能力 | 当前状态 |
|------|------------|---------|
| Epic 1 | 认证、项目管理、卷章目录、写作目标、归档、回收站 | ✅ 主链路完成 |
| Epic 2 | Parser 基础链路、角色/地点/道具/势力/伏笔管理、世界观设定面板 | ✅ 核心已落地，图谱/一致性检查/统一搜索待补 |
| Epic 3 | 编辑器、自动保存、章节树、统计、主题、专注模式、快照、批注、章节备注、计时器 | ✅ 主链路完成 |
| Epic 4 | 项目级 AI 配置、续写、润色、扩写/缩写、对话生成、Story Copilot Session/Turn、AI 起名、建议入口 | 🟡 核心已落地，Copilot 深化能力持续推进 |
| Epic 5 | 导出、备份、模板、知识库传输、恢复面板与接口 | 🟡 基础实现已在仓库中，仍需统一体验收口 |
| Epic 6 | 通知中心与通知列表 | 🟡 通知已落地，资料/偏好/快捷键/通知配置待补 |

---

## 当前项目状态

- ✅ Sprint 1 ~ Sprint 5：基础平台、知识库核心、编辑器主链路全部完成
- ✅ Sprint 7 核心范围：AI 平台收敛、US-4.1 ~ US-4.4、US-4.8 已落地
- 🟡 Sprint 8 当前推进中：Story Copilot Session/Turn、世界观设定、AI 起名与写作建议入口已接入
- ⏸️ Sprint 6 路线仍保留在规划文档中，但相关能力未作为最近一轮独立交付批次完成
- 所有工程代码统一放在 `workspace/`

更多进度见 `docs/SPRINT_LOG.md`，重大变化见 `docs/CHANGELOG.md`。

---

## 仓库结构

```text
bitsNovels/
├── AGENTS.md                  # Agent/协作入口
├── docs/                      # 项目文档、Sprint、决策记录
├── design/                    # 架构与设计规范
├── process/                   # DoD / NFR / 约束
├── specs/                     # 各 Epic FE / BE / Contract
└── workspace/                 # 所有工程代码
    ├── apps/web/              # React 前端
    ├── server/                # FastAPI 后端
    ├── packages/api-types/    # OpenAPI 生成共享类型
    ├── e2e/                   # Playwright 端到端测试
    └── scripts/               # 工程脚本
```

工程细分说明见 `docs/ENGINEERING_WORKSPACE.md`。

---

## 快速开始

### 1. 安装依赖

```bash
cd workspace
npm install
python3.11 -m venv .venv
. .venv/bin/activate
pip install .[dev]
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
npm run generate:api-types
```

### 2. 启动后端

前端开发默认把 `/api` 代理到 `127.0.0.1:8001`：

```bash
cd workspace
npm run ensure:python
node scripts/run_python.mjs -m uvicorn server.main:app --host 127.0.0.1 --port 8001
```

### 3. 启动前端

```bash
cd workspace/apps/web
npm run dev
```

### 4. 常用校验命令

```bash
cd workspace
npm run generate:api-types
npm run lint
npm run typecheck
npm run test:web
npm run test:backend
npm run verify:generated
```

说明：`workspace/apps/web/vite.config.ts` 默认代理到 `8001`；`Playwright` E2E 使用独立的 `8000 + 5173` 组合启动，不与日常前端联调端口混用。

---

## 本地环境变量

后端 `.env` 重点字段：

- `LLM_PROVIDER`：`moonshot` 或 `mimo`
- `MOONSHOT_API_KEY` / `MOONSHOT_BASE_URL`
- `MIMO_API_KEY` / `MIMO_BASE_URL`
- `AI_DEFAULT_MODEL`
- `AI_DEFAULT_TEMPERATURE`
- `AI_DEFAULT_MAX_LENGTH`
- `AI_DEFAULT_PARSE_DEPTH`

前端 `.env.local`：

- `VITE_ENABLE_MOCK=false`：默认走真实后端

---

## 文档入口

- 开发流程与协作约束：`AGENTS.md`
- 工程目录与入口：`docs/ENGINEERING_WORKSPACE.md`
- 当前 Sprint 与路线图：`docs/SPRINT_LOG.md`
- 技术选型与现状说明：`docs/decisions/tech-stack.md`
- 需求与契约：`specs/epic-N/fe.md`、`specs/epic-N/be.md`、`specs/epic-N/contract.md`

## 如果你是 Agent

先读 `AGENTS.md`。

## 如果你是开发者

先读 `docs/ENGINEERING_WORKSPACE.md`，再按要改动的 Epic 进入对应 `specs/epic-N/`。
