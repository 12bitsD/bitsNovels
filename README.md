# bitsNovels

> AI 辅助长篇小说创作平台 · 融合 AI 知识管理的专业写作工作室

---

## 是什么

专为长篇小说作者打造的智能写作工具。核心差异：**AI 自动识别正文中的人物、地点、道具、势力、伏笔**，构建可追踪的知识库。作者写作时，AI 在旁边管理世界观——设定冲突自动提醒，伏笔未回收自动追踪。

**目标用户**：每天写作 8 小时以上、需要管理 50+ 角色和跨卷伏笔的职业作者。

---

## 功能模块

| Epic | 功能 |
|------|------|
| Epic 1 | 登录注册、项目管理、卷章目录、写作目标 |
| Epic 2 | AI 知识库（角色/地点/道具/势力/伏笔识别、关系图谱、一致性检查） |
| Epic 3 | 写作工作台（富文本编辑器、版本快照、专注模式） |
| Epic 4 | AI 辅助写作（续写、润色、扩写、对话生成） |
| Epic 5 | 导出备份（DOCX/TXT/PDF/Markdown） |
| Epic 6 | 系统设置 |

---

## 技术栈

**前端**：React + TypeScript + TipTap + Tailwind CSS  
**后端**：Python 3.11 + FastAPI + ARQ + PostgreSQL + pgvector  
**AI**：OpenAI / Claude（可配置）

---

## 当前工程状态

- 已完成 Sprint 1 脚手架：monorepo、FastAPI 健康检查、React 应用壳、OpenAPI → TypeScript 类型生成、CI
- 所有工程代码统一收敛到：`workspace/`
- 当前前端目录：`workspace/apps/web/`
- 当前后端目录：`workspace/server/`
- 当前共享类型包：`workspace/packages/api-types/`
- 工作区说明见 `docs/ENGINEERING_WORKSPACE.md`

---

## 快速开始

```bash
cd workspace
npm install
python3 -m venv .venv
. .venv/bin/activate
pip install .[dev]
npm run generate:api-types
npm run check
```

---

## 如果你是 Agent

→ 先读 **`AGENTS.md`**，里面有当前任务看板和文件读取规则。

## 如果你是开发者

→ 先读 **`docs/ENGINEERING_WORKSPACE.md`** 了解目录分工，再读 **`docs/decisions/tech-stack.md`** 和对应 Epic 的 `specs/epic-N/` 目录。
