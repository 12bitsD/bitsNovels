# bitsNovels · 后端架构规范

> 分层 API 设计 + AI 任务队列 + 知识库解析管道。核心目标是支持 AI 实时辅助写作的高并发异步处理。

------

## 1. 架构概览

bitsNovels 后端采用**分层架构**，核心模块：

```
                    ┌─────────────────┐
                    │   Client (FE)   │
                    └────────┬────────┘
                             │ HTTPS / WebSocket
                    ┌────────▼────────┐
                    │   API Gateway   │  认证 · 路由 · 限流
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────┐ ┌───────▼────┐ ┌──────▼──────┐
     │  Auth Svc   │ │  Core API  │ │  AI Tasks   │
     │  (用户认证)   │ │  (业务逻辑) │ │  (AI 队列)   │
     └─────────────┘ └──────┬────┘ └──────┬──────┘
                             │              │
              ┌──────────────┼──────────────┘
              │              │
     ┌────────▼────┐ ┌───────▼────┐
     │ PostgreSQL  │ │ Vector DB  │  知识库向量检索
     │  (主数据)    │ │ (pgvector) │
     └─────────────┘ └────────────┘
                             │
                    ┌────────▼────────┐
                    │   AI Provider    │  OpenAI / Claude / 本地模型
                    └─────────────────┘
```

**关键原则**：
- 同步请求（编辑、保存、查询）走 REST API
- AI 生成任务（续写、解析、润色）走异步队列
- 向量数据库用于知识库语义检索

------

## 2. 技术栈（待 Sprint 0 确认）

| 层级 | 候选 | 状态 |
|------|------|------|
| 运行时 | Node.js / Go / Bun | 待定 |
| Web 框架 | Express / Fastify / Gin / Hono | 待定 |
| 数据库 | PostgreSQL 15+ | 确认使用 |
| 向量扩展 | pgvector / Pinecone / Milvus | 待定 |
| AI 服务 | OpenAI GPT-4 / Claude 3 / 本地模型 | 待定 |
| 任务队列 | BullMQ (Redis) / Kafka / In-memory | 待定 |
| 文件存储 | S3 / 本地文件系统 | 待定 |
| 认证 | JWT + OAuth（Google/GitHub） | 确认 |

------

## 3. 数据模型

> 完整类型定义见各 Epic 的 `context.md`。此处为跨 Epic 核心实体的字段概览。

### 3.1 用户（EPIC1/context.md）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | string | 唯一邮箱 |
| username | string | 显示名 |
| passwordHash | string | bcrypt 哈希 |
| avatarUrl | string? | 头像 |
| settings | JSON | 全局偏好（US-6.4） |
| createdAt | timestamp | - |
| updatedAt | timestamp | - |

### 3.2 项目（EPIC1/context.md）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID | 所属用户 FK |
| title | string | 项目名，≤50 字 |
| type | enum | 长篇/中篇/短篇 |
| genreTags | string[] | 题材标签，≤5 个 |
| description | string? | 简介，≤500 字 |
| status | enum | 进行中/已归档 |
| totalCharCount | number | 计算字段，实时汇总 |
| createdAt | timestamp | - |
| updatedAt | timestamp | - |
| deletedAt | timestamp? | 软删除 |

### 3.3 卷（Volume）（EPIC3/context.md）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| projectId | UUID | 所属项目 FK |
| title | string | 卷名，≤30 字 |
| description | string? | 卷简介，≤500 字 |
| order | number | 排序序号 |
| createdAt | timestamp | - |

### 3.4 章节（Chapter）（EPIC3/context.md）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| volumeId | UUID | 所属卷 FK |
| title | string | 章节标题，≤50 字 |
| content | text | 正文内容 |
| charCount | number | 字数（计算：content.length） |
| parseStatus | enum | pending/processing/completed/failed |
| lastParseAt | timestamp? | 最后解析时间 |
| lastEditedAt | timestamp | 最后编辑时间 |
| note | string? | 章节备注，≤2000 字 |
| createdAt | timestamp | - |
| deletedAt | timestamp? | 软删除 |

**字数计算规则**（EPIC3/context.md）：
- 仅计算正文内容，不含标题格式标记
- `charCount = content.replace(/\s/g, '').length`

### 3.5 快照（Snapshot）（EPIC3/context.md）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| chapterId | UUID | 所属章节 FK |
| content | text | 快照内容 |
| label | string? | 手动标签，≤100 字 |
| type | enum | manual/auto_daily/auto_save |
| charCount | number | 快照时字数 |
| createdAt | timestamp | - |

### 3.6 知识库实体（EPIC2/context.md）

| 实体 | 主要字段 |
|------|----------|
| Character | name, aliases, gender, occupation, appearanceSummary, personalityTags, factionId, appearanceChapters[], source |
| Location | name, aliases, typeTag, parentLocationId, descriptionSummary, associatedCharacterIds[] |
| Item | name, aliases, typeTag, descriptionSummary, currentHolderId, ownershipHistory[] |
| Faction | name, aliases, typeTag, descriptionSummary, memberIds[], alliedFactionIds[], opposingFactionIds[] |
| PlotThread | title, summary, plantedChapterId, status, expectedChapterId?, resolutionChapterId? |

### 3.7 AI 任务（EPIC4/context.md）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| projectId | UUID | 所属项目 FK |
| type | enum | AITaskType（见下） |
| status | enum | queued/processing/completed/failed |
| priority | number | 优先级（0=低，1=普通，2=高） |
| input | JSON | 任务输入参数 |
| result | JSON? | 任务输出结果 |
| errorMessage | string? | 失败原因 |
| startedAt | timestamp? | 开始时间 |
| completedAt | timestamp? | 完成时间 |
| createdAt | timestamp | - |

**AITaskType 枚举**（EPIC4/context.md）：

```typescript
enum AITaskType {
  Parse = 'parse',            // 章节内容解析 → 知识库实体
  ContinueWrite = 'continue_write',  // AI 续写
  Polish = 'polish',          // AI 润色
  Expand = 'expand',          // AI 扩写
  Shrink = 'shrink',          // AI 缩写
  GenerateDialogue = 'generate_dialogue',  // AI 对话生成
  SuggestOutline = 'suggest_outline',      // AI 大纲建议
  GenerateNames = 'generate_names',        // AI 名字生成
  WritingAdvice = 'writing_advice',       // AI 写作建议
  ConsistencyCheck = 'consistency_check',   // 一致性检查
}
```

### 3.8 导出任务（ExportTask）（EPIC5/context.md）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| projectId | UUID | 所属项目 FK |
| format | enum | DOCX/TXT/PDF/EPUB |
| scope | JSON | 导出范围（卷/章节列表） |
| options | JSON | 排版选项 |
| status | enum | pending/processing/completed/failed |
| fileUrl | string? | 完成后下载链接 |
| expiresAt | timestamp? | 下载链接过期时间 |
| createdAt | timestamp | - |

### 3.9 备份（Backup）（EPIC5/context.md）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| projectId | UUID | 所属项目 FK |
| type | enum | export/manual/auto |
| fileUrl | string | 备份文件存储地址 |
| sizeBytes | number | 文件大小 |
| charCountAtBackup | number | 备份时总字数 |
| createdAt | timestamp | - |

------

## 4. API 设计规范

### 4.1 通用约定

| 规则 | 说明 |
|------|------|
| 认证方式 | Bearer JWT Token |
| 错误格式 | `{ error: { code: string, message: string, details?: any } }` |
| 成功响应 | HTTP 200/201，body 为 JSON |
| 分页 | `?page=1&limit=20`，返回 `{ data: [], total, page, limit }` |
| 时间格式 | ISO 8601 UTC（`2026-03-20T08:00:00Z`） |

### 4.2 核心 API 端点（参考）

| 方法 | 路径 | 说明 | Epic |
|------|------|------|------|
| POST | `/auth/register` | 注册 | EPIC1 |
| POST | `/auth/login` | 登录 | EPIC1 |
| POST | `/auth/oauth/:provider` | OAuth 登录 | EPIC1 |
| GET | `/projects` | 项目列表 | EPIC1 |
| POST | `/projects` | 创建项目 | EPIC1 |
| GET | `/projects/:id` | 项目详情 | EPIC1 |
| PATCH | `/projects/:id` | 更新项目 | EPIC1 |
| DELETE | `/projects/:id` | 删除项目 | EPIC1 |
| GET | `/projects/:id/volumes` | 卷列表 | EPIC3 |
| POST | `/projects/:id/volumes` | 创建卷 | EPIC3 |
| PATCH | `/volumes/:id` | 更新卷 | EPIC3 |
| DELETE | `/volumes/:id` | 删除卷 | EPIC3 |
| GET | `/volumes/:id/chapters` | 章节列表 | EPIC3 |
| POST | `/volumes/:id/chapters` | 创建章节 | EPIC3 |
| GET | `/chapters/:id` | 章节内容 | EPIC3 |
| PATCH | `/chapters/:id` | 更新章节（含自动保存） | EPIC3 |
| GET | `/chapters/:id/snapshots` | 快照列表 | EPIC3 |
| POST | `/chapters/:id/snapshots` | 创建快照 | EPIC3 |
| POST | `/chapters/:id/parse` | 手动触发解析 | EPIC2 |
| GET | `/projects/:id/kb/characters` | 角色列表 | EPIC2 |
| POST | `/projects/:id/kb/parse/batch` | 批量解析 | EPIC2 |
| POST | `/ai/tasks` | 提交 AI 任务 | EPIC4 |
| GET | `/ai/tasks/:id` | 查询 AI 任务状态 | EPIC4 |
| POST | `/projects/:id/exports` | 创建导出任务 | EPIC5 |
| GET | `/exports/:id` | 导出任务状态/下载 | EPIC5 |
| GET | `/projects/:id/backups` | 备份列表 | EPIC5 |
| POST | `/projects/:id/backups/restore/:backupId` | 恢复备份 | EPIC5 |

### 4.3 WebSocket（可选，AI 流式输出）

AI 续写、润色等长时间生成任务，支持 WebSocket 流式推送：

```
WS /ws/ai/tasks/:taskId
→ server: { type: 'chunk', content: '逐字...' }
→ server: { type: 'done' }
→ server: { type: 'error', message: '...' }
```

------

## 5. AI 任务队列

### 5.1 队列架构

```
FE 请求
    ↓
API 接收 + 写入 AI_Tasks 表（status=queued）
    ↓
Queue Worker 消费 → 调用 AI Provider
    ↓
结果写入 AI_Tasks.result
    ↓
FE 轮询 / WebSocket 通知结果
```

### 5.2 优先级机制

| 优先级 | 值 | 触发场景 |
|--------|---|---------|
| 高 | 2 | 用户手动触发（"重新解析当前章节"） |
| 普通 | 1 | 切换章节时自动触发解析 |
| 低 | 0 | 后台批量解析 |

**规则**：高优先级任务可打断低优先级任务在同一 Worker 内执行。

### 5.3 Parser 管道（EPIC2）

```
章节内容变更
    ↓
60s 防抖检查（同一章节）
    ↓
AI_Tasks 表写入（type=parse, priority=0/1）
    ↓
Worker: GPT-4/Vue 解析 → 提取实体
    ↓
写入 KB_Characters / KB_Locations / KB_Items / KB_Factions / KB_PlotThreads
    ↓
更新 Chapter.parseStatus = completed / failed
    ↓
通知 FE（WebSocket 或轮询）
```

### 5.4 AI 续写管道（EPIC4）

```
用户触发 US-4.1
    ↓
构建上下文（当前章节 + 前章末 2000 字 + KB 相关条目 + 世界观设定）
    ↓
AI_Tasks 表写入（type=continue_write, priority=1）
    ↓
Worker: 流式生成 → 逐字推送 WebSocket
    ↓
FE 展示带标记的生成内容
    ↓
用户选择"采纳"→ 写入 Chapter.content
         "放弃"→ 丢弃
```

------

## 6. 存储策略

| 数据类型 | 存储方案 | 理由 |
|----------|----------|------|
| 章节正文 | PostgreSQL TEXT | 结构化查询 + 全文搜索 |
| 快照 | PostgreSQL TEXT（分离表） | 独立生命周期管理 |
| 导出文件 | S3/本地文件系统 + 7 天过期 | 大文件不适合 DB |
| 备份文件 | S3/本地文件系统 | 大文件 |
| 知识库向量 | pgvector / Pinecone | 语义相似度检索 |
| 用户头像 | S3/本地文件系统 | - |
| AI 模型输出 | AI_Tasks.result JSONB | 临时，TTL 后清理 |

------

## 7. 安全设计

| 机制 | 实现 |
|------|------|
| 认证 | JWT Bearer Token，24h/30d 过期 |
| 密码 | bcrypt，≥8位混合 |
| OAuth | Google + GitHub，token 不暴露给前端 |
| 项目隔离 | 所有查询强制 userId 鉴权 |
| AI 调用 | 后端内部，不暴露 API Key |
| 注入防护 | 参数化查询，所有输入验证 |
| 限流 | API Gateway 层，100 req/min 每用户 |

------

## 8. 部署架构（待 Sprint 0 确认）

```
生产环境候选：
┌─────────────────────────────────────────┐
│           Load Balancer                 │
└──────────┬──────────────┬────────────────┘
           │              │
  ┌────────▼──────┐  ┌───▼──────────┐
  │  FE CDN       │  │  BE Cluster   │
  │  (Vercel/CDN) │  │  (K8s/Docker) │
  └───────────────┘  └──────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
       │  PostgreSQL │ │   Redis   │ │  S3/Minio │
       │  (RDS)      │ │  (队列)   │ │ (文件存储) │
       └─────────────┘ └───────────┘ └───────────┘
```

------

## 9. 下一步

| 行动 | 负责人 | 截止时间 |
|------|--------|---------|
| 确认技术栈（运行时、Web框架、向量库、AI服务） | Tech Lead | Sprint 0 结束 |
| 设计完整 ER 图 | BE Agent | Sprint 1 开始 |
| 确定 WebSocket 方案 | BE Agent | Sprint 1 开始 |
| 确定文件存储方案（S3 vs 本地） | Tech Lead | Sprint 1 开始 |
