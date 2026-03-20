# bitsNovels · 数字羊皮纸

> AI 辅助长篇小说创作平台

[![Project Stage](https://img.shields.io/badge/stage-planning-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

------

## 开发方法论

**TDD + 敏捷迭代**：所有功能必须先写测试再写实现，每个 Epic 分小步交付，不做 big bang。详见 [`PROCESS_TDD.md`](./PROCESS_TDD.md)。

## 这是什么

bitsNovels 是一个**长篇小说写作工具**，专为每天花 8 小时以上创作的人设计。

它的核心差异是**帮你记住**：AI 从正文中自动识别角色、地点、道具、势力、伏笔，构建可追踪、可视化的知识库。你不再需要用笔记本记"第 3 章埋的这个伏笔后来怎么回收的"。

| | 传统写作工具 | bitsNovels |
|---|---|---|
| 写小说 | ✅ 能写 | ✅ 能写 |
| 管理角色设定 | ❌ 手写笔记 | ✅ AI 自动识别 + 关系图谱 |
| 伏笔追踪 | ❌ 靠脑子记 | ✅ AI 帮你记，到期提醒 |
| 设定一致性检查 | ❌ 人工校稿 | ✅ AI 自动检测前后矛盾 |
| 导出 | TXT 为主 | DOCX / TXT / PDF / EPUB 全覆盖 |

**视觉风格**：复古理科与数字羊皮纸。低对比度暖色调，三栏沉浸布局，编辑区永远是视觉中心。

详细设计规范见 [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)。

------

## 文档导航

**先读哪个？按你的角色对号入座：**

| 你是谁 | 读这些 | 顺序 |
|---|---|---|
| 想快速了解项目 | **本文档** | → CONTEXT |
| 想了解需求细节 | `USER_STORIES.md` | 按 Epic 查阅 |
| 要开始写代码 | `CONTEXT.md` → `CONSTRAINTS.md` → 对应 US | 按顺序 |
| 遇到架构疑问 | `DECISIONS.md` | 按编号 |
| 接手别人的模块 | `DOC_ORGANIZATION.md` | 先读这个 |

**所有文档一览**：

```
README.md              ← 你在这里
CONTEXT.md             ← 项目是什么、现在什么阶段、下一步
DECISIONS.md           ← 重要设计决策的 Why
CONSTRAINTS.md         ← 非功能约束（性能/安全/兼容性）
DESIGN_SYSTEM.md       ← 视觉与交互规范
USER_STORIES.md        ← 完整需求（6 Epic / 34 User Story）
DOC_ORGANIZATION.md    ← 文档体系使用指南
PROCESS_TDD.md         ← TDD 开发流程
CHANGELOG.md           ← 变更记录
```

------

## 项目进度

**2026-03-20 | 规划阶段（0% 代码产出）**

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

完整开发顺序见 [`PROCESS_TDD.md`](./PROCESS_TDD.md)。

------

## 快速上手

### 想参与开发

1. 读 [`CONTEXT.md`](./CONTEXT.md) 了解项目现状
2. 读 [`DOC_ORGANIZATION.md`](./DOC_ORGANIZATION.md) 了解文档体系
3. 等 Phase 0 完成后会有 contribution guide

### 想提需求或反馈

→ 提 [Issue](https://github.com/12bitsD/bitsNovels/issues) 或 [Discussion](https://github.com/12bitsD/bitsNovels/discussions)

### 想自己部署使用

V1 尚未完成，暂无可部署版本。

------

## 迭代节奏

| 活动 | 频率 | 内容 |
|---|---|---|
| **Sprint** | 2 周 | 一个或多个 US 从"规划"到"完成" |
| **Sync** | 每周 | 进度 review + 下周计划 |
| **Retro** | 每 Sprint 末 | 哪里可以改进 |

当前状态：第一个 Sprint 尚未开始，等待 Phase 0 基建完成。

## V1 Scope（明确不做什么）

以下功能**不在 V1 范围内**，V2 规划中：

- ❌ 跨项目全局搜索
- ❌ 多人协作 / 项目共享 / 权限管理
- ❌ 移动端适配（仅支持桌面端浏览器，1280px+）

见 [`CONSTRAINTS.md`](./CONSTRAINTS.md) 的 COMPAT-04。

------

*项目Owner：12bitsD | 最后更新：2026-03-20*
