# bitsNovels · 数字羊皮纸

> AI 辅助长篇小说创作平台

[![Project Stage](https://img.shields.io/badge/stage-planning-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

------

## 这是什么

bitsNovels 是一个**长篇小说写作工具**，专为每天花 8 小时以上创作的人设计。

它的核心差异是**帮你记住**：AI 从正文中自动识别角色、地点、道具、势力、伏笔，构建可追踪、可视化的知识库。

| | 传统写作工具 | bitsNovels |
|---|---|---|
| 写小说 | ✅ 能写 | ✅ 能写 |
| 管理角色设定 | ❌ 手写笔记 | ✅ AI 自动识别 + 关系图谱 |
| 伏笔追踪 | ❌ 靠脑子记 | ✅ AI 帮你记，到期提醒 |
| 设定一致性检查 | ❌ 人工校稿 | ✅ AI 自动检测前后矛盾 |
| 导出 | TXT 为主 | DOCX / TXT / PDF / EPUB 全覆盖 |

**视觉风格**：复古理科与数字羊皮纸。低对比度暖色调，三栏沉浸布局，编辑区永远是视觉中心。

## 开发方法论

**TDD + 敏捷迭代**：所有功能先写测试再实现，2 周一个 Sprint，小步交付不停迭代。

详细开发流程见 [`process/PROCESS_TDD.md`](./process/PROCESS_TDD.md)。

## 迭代节奏

| 活动 | 频率 | 内容 |
|---|---|---|
| **Sprint** | 2 周 | 一个或多个 US 从"规划"到"完成" |
| **Sync** | 每周 | 进度 review + 下周计划 |
| **Retro** | 每 Sprint 末 | 哪里可以改进 |

当前状态：Sprint 0 进行中（规划阶段）。见 [`docs/SPRINT_LOG.md`](./docs/SPRINT_LOG.md)。

## 项目进度

```
Epic 1 — 项目管理        ░░░░░░░░░░░░░░░░░░░  规划中
Epic 2 — 知识库与 Parser  ░░░░░░░░░░░░░░░░░░░  规划中
Epic 3 — 写作工作台      ░░░░░░░░░░░░░░░░░░░  规划中
Epic 4 — AI 辅助写作     ░░░░░░░░░░░░░░░░░░░  规划中
Epic 5 — 导出与备份      ░░░░░░░░░░░░░░░░░░░  规划中
Epic 6 — 系统与设置      ░░░░░░░░░░░░░░░░░░░  规划中
                            0%
```

下一步：Phase 0 · 基建（项目骨架 + 登录注册 + 项目列表）

## V1 Scope（明确不做什么）

以下功能**不在 V1 范围内**，V2 规划中：

- ❌ 跨项目全局搜索
- ❌ 多人协作 / 项目共享 / 权限管理
- ❌ 移动端适配（仅支持桌面端浏览器，1280px+）

## 文档导航

**先读 [`INDEX.md`](./INDEX.md)** — 它会告诉你每个文件夹里有什么、什么时候读。

文件夹结构：

```
docs/       ← 给任何人看的文档（项目入口 / 上下文 / Sprint 日志 / 变更记录）
specs/      ← 需求与测试规范（Agent 读：做什么）
design/     ← 设计文档（Agent 读：做成什么样）
process/    ← 流程与规范（Agent 开工必读：怎么做、做到什么程度）
```

## 快速入口

| 你想做什么 | 读这个 |
|---|---|
| 快速了解项目 | [`docs/CONTEXT.md`](./docs/CONTEXT.md) |
| 了解需求细节 | [`specs/USER_STORIES.md`](./specs/USER_STORIES.md) |
| 了解视觉规范 | [`design/DESIGN_SYSTEM.md`](./design/DESIGN_SYSTEM.md) |
| 开始写代码 | [`INDEX.md`](./INDEX.md) → Agent 开工清单 |
| 提 Issue 或反馈 | [GitHub Issues](https://github.com/12bitsD/bitsNovels/issues) |

------

*项目Owner：12bitsD | 最后更新：2026-03-20*
