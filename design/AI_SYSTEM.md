# bitsNovels · AI 系统架构设计

> 本文档定义 bitsNovels 的 AI 系统整体架构，覆盖 Multi-Agent 编排、Multi-Provider 基建、Memory 分层、以及 4 个阶段的实施路径。供 BE/FE Agent 实现时对齐。

---

## 当前落地状态（2026-04-16）

- 阶段 1 已有最小可用实现：项目级 AI 配置、统一 AI 任务入口、SSE 流式通道、任务停止、Provider 适配层均已落地到 `workspace/server/services/ai_service.py`。
- 当前不是完整的 `Multi-Provider Registry + Model Router` 成熟形态，而是先实现了 `LLM_PROVIDER` 驱动的双 provider 适配：`moonshot` 与 `mimo`。
- MiMo 已作为本地回归主 Provider 接入，支持 `continue / dialogue / parse` 文本任务、`polish / expand / summarize` Diff 任务、`outline / advice / name_gen` 结构化结果任务。
- `StoryCopilotSession`、`StoryPlan`、Memory 分层、消息总线与 ARQ/Redis 级任务队列仍属于下一阶段能力；当前前端只有 `Story Copilot` 统一入口脚手架，未完成会话真相源。

---

## 1. 设计目标与核心意图

### 1.1 术语约定

本文档中：
- **Agent**：自主执行单元，可以接收任务、调用 LLM、产出结果。如 Parser Orchestrator Agent、Composer Agent。
- **Service**：被动能力提供者，为 Agent 或其他 Service 提供能力，自身不做决策。如 KB Writer Service、Memory Service。
- **Orchestrator**：编排者，把任务分发给 Agent 或 Service 并控制执行顺序。可以是 Agent（如 Composer Agent），也可以是纯代码逻辑。

### 1.2 核心意图

**意图 1：Multi-Agent 系统**
不是简单的"调 LLM API + 解析 JSON"，而是多个 Agent 协作完成任务。不同 AI 任务（解析、续写、润色、一致性检查等）由不同的 Agent 承担，Agent 之间通过消息队列通信和编排。

**意图 2：Multi-Provider 基建**
AI Provider 层不绑死单一模型，而是做成一个统一的 Provider 池。每个 API Key 作为一个可选资源，下游的 Agent/Service 可以自由选择用哪个 Provider + Model 来完成任务。

### 1.2 与已有契约的关系

| 契约来源 | 约束内容 |
|---------|---------|
| `specs/epic-2/contract.md` | `AIParseRequest/AIParseResponse` — 解析输入输出结构（FROZEN） |
| `specs/epic-4/contract.md` | `AITaskType`（9 种稳定任务类型）、`AIProjectConfig`（项目级配置）、`AIResult`（判别式结果容器）、上下文注入优先级（FROZEN） |
| `specs/epic-6/contract.md` | `UserSettings.aiGlobal` — 用户级 AI 默认值（FROZEN） |
| `design/BACKEND.md` | SSE 流式协议（started/delta/completed/failed/stopped）、ARQ 任务队列优先级、并发上限、超时重试规范 |

---

## 2. 阶段总览

| 阶段 | 核心交付 | 前置依赖 |
|------|---------|---------|
| **阶段 1** | AI 基础设施层（Provider 池 + Agent Runtime + Memory + 流式通道） | ARQ/Redis 基建完成 |
| **阶段 2** | Parser Agent 系统（解析引擎 + Consistency Agent + Fallback） | 阶段 1 完成 |
| **阶段 3** | Story Writer + Story Copilot（统一入口 + 会话层 + 轻量计划执行） | 阶段 1 完成 |
| **阶段 4** | 高级 AI 能力（Story Reasoning Service + 向量检索 + 长上下文摘要） | 阶段 2+3 完成 |

---

## 3. 阶段 1：AI 基础设施层

### 3.1 Multi-Provider Registry

```mermaid
graph TB
    subgraph Registry["Provider Registry"]
        subgraph OpenAI["OpenAI Provider"]
            oai_key1["key-1"]
            oai_key2["key-2"]
            oai_models["Models: gpt-4o, gpt-4o-mini"]
        end
        subgraph Claude["Claude Provider"]
            claude_key1["key-1"]
            claude_models["Models: opus, sonnet, haiku"]
        end
        subgraph DeepSeek["DeepSeek / ..."]
            ds_key1["key-1"]
            ds_models["Models: deepseek-v3"]
        end
    end
```

> 这张图展示了 Provider Registry 的结构：每个 Provider（如 OpenAI/Claude/DeepSeek）可以注册多个 API Key，每个 Key 下挂载该 Provider 可用的 Model 列表。

**职责**：注册和管理所有可用的 AI Provider 及其 API Key。

**V1 系统级配置**：管理员在后台注册 Provider + Key + 可用 Model 列表。

**V2 BYOK 流程**：用户在设置页填入 API Key → 系统校验 Key 有效性 → 注册到 Provider Registry，标记为用户专属 → Model Router 在匹配时优先使用系统 Key，用户 Key 作为备选或直接覆盖。

**同 Provider 多 Key**：支持轮转负载均衡和限速分摊。当某个 Key 触发 rate limit 时，自动切换到下一个可用 Key。

### 3.2 Model Router

```mermaid
graph LR
    subgraph Inputs["输入"]
        caps["declarative: streaming, json_mode, context_window"]
        model["explicit: model id override"]
        cost["optional: cost_tier"]
    end

    subgraph Router["Model Router"]
        step1["1. explicit override优先"]
        step2["2. declarative match"]
        step3["3. load balance across Keys"]
        step4["4. fallback to backup Provider"]
    end

    caps --> step1
    model --> step1
    step1 --> step2 --> step3 --> step4
```

> 这张图说明了 Model Router 的匹配流程：先看是否有显式 model 覆盖 → 再按声明式能力标签匹配 → 然后在同 Model 的多 Key 之间轮转 → 最后如果 Provider 不可用则 fallback 到备选。

**输入参数定义**：
- `streaming` — 是否需要流式输出（`true` = 续写/对话场景，`false` = 大纲/起名场景）
- `json_mode` — 是否要求结构化 JSON 输出（如 AIParseResponse 的 7 维度 JSON）
- `context_window` — 所需的上下文窗口大小（如 `>= 128k` 适合长章节解析）
- `model` — 显式指定 model id（如 `gpt-4o`、`claude-sonnet`），覆盖声明式匹配
- `cost_tier` — 可选，成本档位：`economy` / `standard` / `premium`

**匹配规则**：
- 默认走声明式能力匹配（Agent 声明需要 streaming/json_mode/context_window，Router 自动匹配最优 Model）
- 允许显式覆盖（用户/项目配置直接指定 model id，如 `AIProjectConfig.model`）
- 与已有契约 `AIProjectConfig.model?: string` 天然兼容

### 3.3 AI Config Service

**三级覆盖解析器**：系统默认 → 用户级 → 项目级

```mermaid
graph TD
    proj["项目级覆盖<br>US-4.8 AIProjectConfig"]
    user["用户级默认值<br>US-6.4 UserSettings.aiGlobal"]
    sys["系统默认值"]

    proj -- 项目未设置时继承 --> user
    user -- 用户未设置时继承 --> sys
```

> 这张图展示了三级配置覆盖的继承关系：项目级未设置的字段，继承用户的全局偏好；用户未设置的字段，继承系统默认值。

**规则**：
- `model`、`temperature`、`maxLength`、`parseDepth` 按**字段级继承**，不整对象覆盖
- 保存配置后，新任务立即读取新配置
- 运行中任务继续使用创建时快照（保证执行期间配置稳定）
- `parseDepth` 同时服务于 Parser（Epic 2）和写作（Epic 4），需要跨 Epic 共享

### 3.4 SSE Stream Manager

统一流式通道，支持所有需要流式输出的 AI 任务。

**事件协议**（对齐 `design/BACKEND.md` 规范）：

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend / AI Tasks

    FE->>BE: GET /api/ai/tasks/:taskId/stream
    BE-->>FE: task.started
    loop stream
        BE-->>FE: task.delta (content chunk)
    end
    BE-->>FE: task.completed (result)
    Note over FE,BE: user can send task.stopped at any time
```

> 这张序列图说明了 SSE 流式输出的事件生命周期：前端订阅 → 后端 `started` → 逐字 `delta` 推送 → `completed` 结束。用户可随时发送 `stopped` 中止任务。

**职责**：
- 每个任务独立 SSE 订阅通道
- 支持任务级别的流式中断（用户按 Esc）
- 保证单次断连后能通过 `task.completed/failed/stopped` 事件优雅结束

### 3.5 Agent Runtime

**Agent 定义**：
- **Pipeline Agent**：任务步骤固定，由 Orchestrator 按固定顺序编排。大部分任务属于此类。
- **Autonomous Agent**：可以自主规划下一步行动，调用工具，请求其他 Agent 协作。少数复杂任务（如跨章节推理）使用。

**混合模式**：
- 解析、续写、润色等 → Pipeline Agent
- 一致性检查的深层推理 → Autonomous Agent（阶段 4 引入）

### 3.6 Message Bus

Agent 间通信基建，基于 Redis pub/sub 实现。

**两种模式**：
- **Point-to-Point**：一个 Agent 给另一个 Agent 发消息（如 Parser 完成后通知 Consistency Agent）
- **Broadcast**：一个 Agent 发布事件，多个 Agent 订阅（如"章节内容变更"事件）

**与已有 Task Queue 的关系**：
- Task Queue（ARQ）：负责**异步任务调度**，有优先级、并发控制、超时重试
- Message Bus：负责**Agent 间实时消息**，无持久化，轻量级
- 两者协作：Task Queue 负责"什么时候执行"，Message Bus 负责"执行过程中谁和谁通信"

### 3.7 Memory Service

```mermaid
mindmap
  root((Memory Interface))
    read key
    write key value scope ttl
    query filter
    clear scope
    Scope分层
      task — 单次任务生命周期 阶段1实现
      session — 用户会话级 阶段3实现
      project — 项目级持久化 已有 KB
      global — 用户级持久化 已有 UserSettings
```

> 这张思维导图展示了 Memory 接口的 4 个操作方法和 4 个 Scope 层级。阶段 1 只实现 task scope（Working Memory），其余 scope 按需延后。

**设计决策**：
- 阶段 1 只实现 **TaskScopedMemory**（基于 Redis TTL KV，任务完成后自动清理）
- 其他 scope 的实现留给后续阶段按需加
- Memory 接口定义好，让上层 Agent 面向接口编程

### 3.8 Task Queue

基于 ARQ + Redis 的异步任务队列。

| 参数 | 值 |
|------|---|
| 优先级 | 手动触发=10, 自动触发=5, 批量触发=1 |
| Parser 并发 | 最多 5 个并行 |
| AI 续写/润色 | 最多 3 个并行 |
| 文件导出 | 最多 2 个并行 |
| 单任务超时 | 60 秒 |
| 超时重试 | 自动重试 1 次 |
| 再失败 | 标记 failed，写入错误原因，通知前端 |

---

## 4. 阶段 2：Parser Agent 系统

### 4.1 架构概览

```mermaid
graph TB
    trigger["章节内容变更"]
    parser["Parser Orchestrator Agent<br>Pipeline Agent"]
    llm["LLM Call via Stage 1<br>输入: existingKB + excludeWords + 章节内容<br>输出: AIParseResponse 7维度+confidence"]
    writer["KB Writer Service<br>去重归并 → 写入实体表 → 更新章节引用<br>Fallback: 规则引擎"]
    consistency["Consistency Agent<br>异步触发"]
    notify["通知中心<br>parse_done/parse_failed"]

    trigger --> parser
    parser --> llm
    llm --> writer
    writer --> consistency
    writer --> notify
```

> 这张图说明了 Parser 的完整数据流：章节变更触发 → Orchestrator 组装请求 → 单次 LLM 大调用 → KB Writer 去重归并写入 → 完成后同时通知 Consistency Agent（异步检查）和通知中心。

**设计决策**：
- **单次大调用**：1 次 LLM 调用输出全部 7 维度（characters / locations / items / factions / foreshadows / relations / consistencyIssues）。成本最低，与冻结契约 `AIParseResponse` 天然对齐。
- **单 Agent 降级**：任何环节失败时，该环节走确定性规则 fallback，其他环节继续。结果标记 `fallback.used = true`。

### 4.2 Parser Orchestrator Agent

**输出维度**（`AIParseResponse` 的 7 个维度，定义在 `specs/epic-2/contract.md`）：
1. `characters` — 角色（名称/别名/性别/职业/外貌/性格标签/所属势力）
2. `locations` — 地点（名称/别名/类型/描述/上级地点）
3. `items` — 道具（名称/别名/类型/描述/持有者）
4. `factions` — 势力（名称/别名/类型/描述/成员/同盟/敌对）
5. `foreshadows` — 伏笔（名称/摘要/原文引用）
6. `relations` — 关系（来源角色/目标角色/关系类型/描述）
7. `consistencyIssues` — 一致性问题（类型/描述/置信度/关联实体）

**输入**（对齐 `AIParseRequest`）：
- `chapterId` + `projectId` + 章节内容
- `existingKB`：已有知识库条目（角色/地点/道具/势力/伏笔），用于去重归并
- `excludeWords`：排除词列表（用户标记"非角色"的词自动加入）

**流程**：
1. 从 Context Assembler 读取已有的 KB 条目
2. 构造 Prompt：章节内容 + existingKB + excludeWords + 输出格式约束（JSON Schema）
3. 调用 LLM（通过 Model Router 选配最优 Model）
4. 解析 `AIParseResponse`
5. 分发到各 KB Service 写入
6. 发送 `parse_done` 事件到 Message Bus → 触发 Consistency Agent

### 4.3 Consistency Agent

**独立于 Parser Pipeline**，通过异步事件触发。

**触发模式**：
- **异步自动触发**：Parser 完成后，通过 Message Bus 发送 `parse_done` 事件，Consistency Agent 订阅并执行
- **手动全量触发**：用户在知识库面板点击"检查一致性"，直接调用 Consistency Agent 对全书做检查

**内部架构 — 子检查可复用**：

```mermaid
graph TB
    agent["Consistency Agent<br>Orchestrator"]
    subgraph SubChecks["子检查"]
        s1["外貌冲突检查<br>规则"]
        s2["称谓关系检查<br>规则"]
        s3["地点冲突检查<br>规则"]
        s4["道具持有者检查<br>规则"]
        s5["时间线矛盾检查<br>LLM"]
        s6["死亡角色复活检查<br>规则+LLM"]
    end
    output["输出: ConsistencyIssue[]<br>confidence + 实体引用"]

    agent --> s1
    agent --> s2
    agent --> s3
    agent --> s4
    agent --> s5
    agent --> s6
    s1 --> output
    s2 --> output
    s3 --> output
    s4 --> output
    s5 --> output
    s6 --> output
```

> 这张图展示了 Consistency Agent 的内部架构：Orchestrator 分发 6 个独立子检查并行执行，每个检查独立失败不阻塞其他，最终汇总为 ConsistencyIssue 列表。

**子检查类型**（对齐 `ConsistencyIssueType`）：

| 子检查 | 检查内容 | 实现方式 | 可复用场景 |
|--------|---------|---------|-----------|
| `appearance_conflict` | 同一角色外貌描述前后矛盾 | 规则 + LLM 对比 | 角色详情页"对比设置" |
| `relation_conflict` | 称谓/关系前后不一致 | 规则 + LLM 对比 | 关系图谱编辑时校验 |
| `location_conflict` | 地点描述前后矛盾 | 规则 + LLM 对比 | 设定编辑时校验 |
| `item_owner_conflict` | 道具持有者逻辑冲突 | **纯规则** | 道具转手时实时校验 |
| `timeline_conflict` | 时间线矛盾 | LLM 推理 | 大纲生成时校验 |
| `dead_character_reappear` | 死亡/退场角色再出现 | **纯规则 + LLM** | Parser 识别角色出场时校验 |

**对齐契约**：
- 每条问题带 `confidence: high | medium | low`
- 状态流转：`open → fixed / ignored / intentional`
- 高置信度问题推送到通知中心（受 US-6.4 通知配置控制）

### 4.4 Fallback 机制

当 LLM 不可用或调用失败时：
1. **Parser fallback**：降级为确定性规则引擎（当前已有的规则解析），输出结构对齐 `AIParseResponse`，`confidence` 设为低
2. **Consistency fallback**：纯规则子检查正常执行，LLM 子检查跳过并标记 `fallback`
3. 结果中通过 `FallbackMeta` 标记：
   - `used: true`
   - `strategy: 'rule_based'`
   - `reason: 'upstream_unavailable' | 'upstream_timeout' | 'degraded_mode'`

---

## 5. 阶段 3：Story Writer + Story Copilot 系统

### 5.1 三核架构

阶段 3 不再把 AI 能力理解成一堆分散按钮，而是收敛成 3 个稳定能力核：

1. **Story Extractor**：把正文变成知识和证据。对应 Parser、伏笔、一致性检查。
2. **Story Writer**：直接作用在正文上。对应续写、对话、润色、扩写、缩写、起名。
3. **Story Copilot**：作为统一创作入口，负责世界构建、剧情推演、写作建议与大纲辅助。

```mermaid
graph TB
    user["用户"]
    entry["Story Copilot / Writer 统一入口"]

    user --> entry

    subgraph Core["三核能力"]
        extractor["Story Extractor<br>抽取 / 校验 / 证据"]
        writer["Story Writer<br>生成 / 改写 / 命名"]
        copilot["Story Copilot<br>对谈 / 推演 / 建议"]
    end

    entry --> writer
    entry --> copilot
    extractor --> copilot
    extractor --> writer
```

> 关键变化：`worldbuild` 和 `plot_derive` 不再作为新的顶层任务类型，而是收敛为 `Story Copilot` 下的会话模式。

### 5.2 稳定任务模型

`AITaskType` 只保留稳定、可长期复用的任务类型：

| AITaskType | 归属能力核 | 说明 |
|-----------|-----------|------|
| `continue` | Story Writer | 正文续写 |
| `dialogue` | Story Writer | 对话生成 |
| `polish` | Story Writer | 润色改写 |
| `expand` | Story Writer | 扩写 |
| `summarize` | Story Writer | 缩写 |
| `outline` | Story Copilot | 方向卡片 / 章节规划 |
| `name_gen` | Story Writer | 起名 |
| `advice` | Story Copilot | 写作建议 |
| `parse` | Story Extractor | 章节解析 |

**设计原则**：
- 顶层任务类型描述**稳定能力**，而不是某个具体产品玩法
- 新产品形态优先落在 `Story Copilot mode`，避免 `AITaskType` 持续膨胀
- `Story Copilot` 负责组合 `chat / reason / extract / suggest`，但不要求每种组合都新增 task type

### 5.3 Story Copilot 会话层

`Story Copilot` 是产品入口，不是单次 task。它是一个**可持续对话、可沉淀结果、可多次采纳**的会话层。

**V1 支持的模式**：
- `worldbuild`：对话式世界构建
- `plot_derive_lite`：轻量剧情推演
- `story_diagnose`：复用写作建议 / 一致性能力，给出卡点分析（预留）

```typescript
interface StoryCopilotSession {
  id: string
  projectId: string
  mode: 'worldbuild' | 'plot_derive_lite' | 'story_diagnose'
  title?: string
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}
```

**为什么改成会话层**：
- 世界构建本质是连续对谈，不适合当一次性 task
- 剧情推演往往需要多轮追问和改写，也不适合塞进一个孤立结果对象
- 会话应该入库，Memory 只做缓存，不做真相源

### 5.3.1 Worldbuild Mode — 对话式世界构建

**定位**：不是“AI 自动填一张设定表”，而是“作者与 Copilot 对谈，逐步把模糊设定打磨成结构化规则”。

**交互**：
- 用户给出粗略设定
- Copilot 主动追问缺失维度
- 系统从对话中提取 `WorldbuildEntry draft`
- 用户逐条确认，写入 `KBSetting`

**数据落点**：
- 会话消息：`StoryCopilotSession`
- 草稿设定：`WorldbuildEntryDraft`
- 最终真相源：`KBSetting`

### 5.3.2 Plot Derive Lite Mode — 轻量剧情推演

**定位**：V1 不做“全书级强推理”，而是做“基于显式 KB 关系的轻量推演”。

**输入**：
- 用户输入剧情节点
- 显式可用的 KB：角色关系、势力关系、未回收伏笔、世界观约束

**输出**：
- 影响角色 / 势力列表
- 潜在冲突提示
- 2-3 个后续分支方向

**设计边界**：
- V1 不承诺跨全书深推理
- 不依赖摘要链、向量检索、超长上下文
- 深度版本放到阶段 4 的 `Story Reasoning Service`

### 5.4 Story Plan — 轻量计划执行模型

阶段 3 不强上 `WritingGraph`。V1 改为更直接的 `StoryPlan`：

```typescript
interface StoryPlanStep {
  id: string
  kind: 'generate' | 'rewrite' | 'suggest' | 'reason'
  title: string
  inputSummary: string
  status: 'pending' | 'running' | 'done' | 'skipped'
  output?: string
}

interface StoryPlan {
  id: string
  taskId: string
  chapterId?: string
  steps: StoryPlanStep[]
  status: 'draft' | 'running' | 'completed'
}
```

**原则**：
- 先满足 80% 顺序执行场景
- 真出现复杂分支 / 循环 / 重规划，再升级成图结构
- 降低持久化、回放、调试成本

### 5.5 Context Assembler

组装每次 LLM 调用的上下文，执行 Token 裁剪。

**位置**：V1 内嵌在 Writer / Copilot Orchestrator 中；阶段 4 接入向量检索与摘要链后，再升级为更强的上下文服务。

**Token 裁剪优先级**（对齐 `specs/epic-4/contract.md`）：
1. 系统指令 + 任务指令 + 项目级生效配置（永远保留）
2. 当前章节全文（最后裁剪，优先保留光标附近原文）
3. 知识库条目 + 世界观设定（按相关度排序）
4. 前一章末尾 2000 字（最低优先级）

**裁剪算法**：
1. 收集上下文块，标记 `source`、`priority`、`estimatedTokens`、`required`
2. 先加入所有 `required` 块
3. 加入当前章节全文
4. 按相关度依次加入知识库 / 世界观
5. 最后尝试加入前一章尾段
6. 超限时优先保留光标附近原文，远处内容交给阶段 4 摘要链

### 5.6 AI Result — 判别式结果容器

统一结果容器保留，但改成**判别式 payload**，而不是不断横向加字段。

```typescript
interface AIResult {
  taskId: string
  type: AITaskType
  status: 'draft' | 'generating' | 'awaiting_confirmation' | 'done' | 'stopped' | 'failed'
  payloadType: 'text' | 'diff' | 'suggestions' | 'names' | 'copilot_worldbuild' | 'copilot_plot'
  payload: unknown
  error?: string
  createdAt: string
}
```

**状态语义**：
- `draft`：结果尚未稳定，可继续补充
- `generating`：正在生成
- `awaiting_confirmation`：需要用户逐条确认或采纳
- `done`：结果可被采纳或已完成
- `stopped`：用户主动中止
- `failed`：任务失败

### 5.7 与已有契约的映射

| 契约字段 | 定义位置 | 在阶段 3 中的作用 |
|---------|---------|------------------|
| `AITaskType` | `specs/epic-4/contract.md` | 稳定能力任务路由 |
| `AIProjectConfig` | `specs/epic-4/contract.md` | Writer / Copilot 配置输入 |
| `AIResult` | `specs/epic-4/contract.md` | 判别式结果容器 |
| `AIResult.payloadType` | `specs/epic-4/contract.md` | 前后端统一结果渲染依据 |
| `StoryCopilotSession` | 上文 5.3 | 世界构建 / 剧情推演的会话真相源 |
| `StoryPlan` | 上文 5.4 | 长续写 / 复杂对话 / 大纲的轻量执行计划 |

---

## 6. 阶段 4：高级 AI 能力

### 6.1 KB Vector Service

**职责**：知识库实体向量化 + 按相关度检索

**输入**：当前章节内容 + KB 实体
**输出**：按相关度排序的 KB 条目列表（供 Context Assembler 注入）

**实现**：
- pgvector（PostgreSQL 扩展，同库同实例）
- HNSW 索引，V1 百万级向量足够
- 替代当前"按章节已关联实体"的静态关联方式

**依赖**：阶段 2 KB 实体数据已就绪

### 6.2 Story Reasoning Service

阶段 4 不再继续堆新的推演 Agent，而是抽象出统一的 `Story Reasoning Service`，服务于：
- 深度一致性检查
- 剧情推演升级版（`plot_derive_v2`）
- 伏笔回收判断
- 关系变化和时间线验证

**核心场景**：
- `timeline_check`：多章时间线是否矛盾
- `death_exit_check`：角色是否真的死亡 / 退场
- `plot_derive_v2`：超出显式 KB 的剧情连锁推演

**挑战**：不能把全书塞入上下文窗口。解决方案：
- 先用摘要链（章节 → 卷级摘要 → 全书摘要）压缩上下文
- 再把可疑章节原文作为证据注入
- 统一输出证据、结论和置信度，避免 Copilot 推演与一致性检查各做一套

### 6.3 Foreshadow Recovery Agent

伏笔疑似回收内容的语义匹配。

**当前状态**：阶段 2 的 Parser 可以识别新伏笔，但"疑似回收"匹配需要跨章节语义理解。

**实现方向**：
- 向量化已识别的伏笔（埋设章节 + 原文引用）
- 每次新章节解析时，向量化当前章节并检索最相似的未回收伏笔
- LLM 判断"这段内容是否呼应了伏笔"
- 输出为 `KBForeshadowSuggestion`，等待用户确认

### 6.4 Long Context Summarizer

当章节全文超出 Token 预算时，保留光标附近原文，远处段落摘要化压缩。

**应用场景**：Context Assembler 裁剪第 6 步的补充手段。

**实现方向**：
- 短文本（< 3000 字）→ 不压缩
- 中等文本（3000-8000 字）→ 光标附近 2000 字保留原文 + 远处段落做 2 句摘要
- 长文本（> 8000 字）→ 光标附近 1500 字 + 光标前/后各 500 字 + 其余摘要化

---

## 7. 已确认的设计决策汇总

| # | 决策项 | 结论 | 讨论来源 |
|---|--------|------|---------|
| 1 | Key 管理模式 | 两者都支持（V1 系统级，后续加 BYOK） | 阶段 1 |
| 2 | Model 选择策略 | 声明式能力匹配 + 显式覆盖结合 | 阶段 1 |
| 3 | 多 Key 用途 | 同 Provider 多 Key 做负载均衡/限速分摊 | 阶段 1 |
| 4 | Agent 粒度 | 混合模式（大部分 Pipeline + 少数自主 Agent） | 阶段 1 |
| 5 | Agent 通信 | 消息传递（基于 Redis 消息队列） | 阶段 1 |
| 6 | Memory 分层 | 阶段 1 做接口定义 + TaskScopedMemory；其他 scope 延后 | 阶段 1 |
| 7 | Parser LLM 调用拓扑 | 单次大调用出全部 7 维度 | 阶段 2 |
| 8 | Agent 失败策略 | 单 Agent 降级到确定性规则 fallback，不阻塞全局 | 阶段 2 |
| 9 | 一致性检查归属 | 独立 Consistency Agent，异步自动触发 + 手动全量触发双模式 | 阶段 2 |
| 10 | 一致性子检查 | 6 个独立子检查（规则/LLM 混合），可独立复用 | 阶段 2 |
| 11 | 写作执行模型 | V1 先用 `StoryPlan`，不提前上重型图编排 | 阶段 3 |
| 12 | Context Assembler 定位 | V1 内嵌在 Writer / Copilot Orchestrator 中，后续按需独立 | 阶段 3 |
| 13 | 产品入口 | 使用统一 `Story Copilot` 入口，而不是继续堆散落按钮 | 阶段 3 |
| 14 | 任务模型 | 顶层只保留稳定 `AITaskType`，世界构建 / 推演下沉为 Copilot mode | 阶段 3 |
| 15 | 结果模型 | `AIResult` 改为判别式 payload，避免横向加字段 | 阶段 3 |
| 16 | 推理能力归属 | 一致性检查与剧情推演共享 `Story Reasoning Service` | 阶段 4 |

---

## 8. 与已有系统的集成点

| 现有系统 | AI 系统如何集成 | 负责阶段 |
|---------|---------------|---------|
| Parser Service (`server/services/parser_service.py`) | 阶段 2 用 AI Parser 替换当前确定性规则，保留为 Fallback | 阶段 2 |
| KB Services（character/location/item/faction/foreshadow） | Parser Agent 写入各 KB 实体表 | 阶段 2 |
| Notification Service（US-6.6） | 解析完成/失败/一致性问题自动推送到通知中心 | 阶段 2 |
| Editor（US-3.1） | Story Writer 在编辑器内触发，SSE 流式输出 | 阶段 3 |
| KB Setting（US-2.10） | Story Copilot `worldbuild` mode 逐条确认并写入 KBSetting | 阶段 3 |
| KB Graph + Factions + Foreshadows | Story Copilot `plot_derive_lite` mode 读取显式 KB 做轻量推演 | 阶段 3 |
| Consistency Service（US-2.8） | 阶段 4 与剧情推演共享 `Story Reasoning Service` | 阶段 4 |
| Project Settings（US-4.8） | AI 配置面板（项目级 model/temperature/maxLength/parseDepth） | 阶段 3 |
| User Settings（US-6.4） | AI 全局默认值配置 | 阶段 1 |
| ARQ Task Queue | 所有 AI 任务的异步调度和优先级管理 | 阶段 1 |

---

## 9. 下一步

### 立即可做（阶段 1 启动前）

- [ ] 设计 Provider Registry 的数据模型（Provider / APIKey / Model 表结构）
- [ ] 确定 V1 先支持哪些 Provider（OpenAI / Claude / DeepSeek / 国产模型）
- [ ] 定义 Agent 的注册协议（Agent 接口规范：`execute(task) → AgentResult`）
- [ ] 设计 Message Bus 的 Redis Channel 命名规范

### 阶段 1 → 阶段 2 的桥梁

- [ ] 实现 Parser Orchestrator 的 Prompt 模板（基于 AIParseRequest/AIParseResponse）
- [ ] 设计 Consistency Agent 的子检查注册机制
- [ ] 为现有 Parser 服务编写 Fallback 模式测试

### 阶段 2 → 阶段 3 的桥梁

- [ ] 设计 `StoryPlan` 的持久化方案（替代 V1 的重型图编排）
- [ ] 定义 Story Writer 的 Prompt 模板（续写 / 对话 / 改写）
- [ ] 设计 Writer / Copilot 与 Context Assembler 的协作协议
- [ ] 设计 `StoryCopilotSession` 的数据模型和消息存储
- [ ] 设计 `worldbuild` mode 的追问模板与草稿提取规则
- [ ] 设计 `plot_derive_lite` mode 的轻量推演模板与结果卡片结构

### 阶段 3 → 阶段 4 的桥梁

- [ ] 设计 `Story Reasoning Service` 的统一输入 / 输出结构
- [ ] pgvector 接入 KB 实体表的 schema 设计
- [ ] Embedding model 的选型（OpenAI text-embedding-3 / 本地模型）
- [ ] Long Context Summarizer 的分段策略和质量评估标准
- [ ] 定义 `plot_derive_v2` 与深度一致性检查的共享证据模型

---

## 10. 附录

### 10.1 US 速查表

| US | 名称 | 一句话说明 |
|-----|------|-----------|
| US-2.1 | Parser 解析触发 | 章节内容 → LLM 解析 → 提取结构化知识（7 维度） |
| US-2.2 | 角色识别与管理 | NER 识别角色 + 去重归并 + 批量确认 |
| US-2.3 | 地点识别与管理 | NER 识别地点 + 树形层级 + 父子关系 |
| US-2.4 | 道具/物品识别 | NER 识别道具 + 持有者变更历史追踪 |
| US-2.5 | 势力/组织识别 | NER 识别势力 + 成员归属 + 同盟/敌对 |
| US-2.6 | 伏笔追踪 | 伏笔识别 + 疑似回收匹配 + 提醒机制 |
| US-2.7 | 关系图谱 | 角色间关系识别 + 图谱节点/边生成 |
| US-2.8 | 一致性检查 | 跨章节矛盾检测 + 置信度 + 处理状态 |
| US-2.10 | 世界观设定 + Copilot 世界构建 | 设定 CRUD + Story Copilot `worldbuild` mode |
| US-4.1 | AI 续写 | 流式生成 + 上下文注入 + Esc 停止 |
| US-4.2 | AI 润色 | 选区改写 + Diff 输出 + 可撤销 |
| US-4.3 | AI 扩写/缩写 | 选区倍数控制 + Diff 输出 |
| US-4.4 | AI 对话生成 | 角色画像注入 + 流式对话输出 |
| US-4.5 | AI 大纲建议 + 轻量剧情推演 | 结构化方向卡片（2-3 个建议）+ Copilot `plot_derive_lite` |
| US-4.6 | AI 起名 | 10 个候选名字 + 文化/性别约束 |
| US-4.7 | AI 写作建议 | 四维度（节奏/人物/描写/情节）建议 |
| US-4.8 | 项目 AI 配置 | 三级覆盖（项目 > 用户 > 系统）配置管理 |
| US-6.4 | 通知配置 | 用户级 AI 默认值 + 通知渠道开关 |

### 10.2 术语表

| 术语 | 含义 |
|------|------|
| **Agent** | 自主执行单元，可接收任务、调用 LLM、产出结果 |
| **Service** | 被动能力提供者，为 Agent 提供能力，不做决策 |
| **Orchestrator** | 编排者，控制任务分发和执行顺序 |
| **KB / Knowledge Base** | 知识库，存储角色/地点/道具/势力/伏笔/世界观等结构化知识 |
| **Worldview / 世界观设定** | 修炼体系、货币体系等世界的底层规则 |
| **Parser** | 解析引擎，将章节正文转为结构化知识库数据 |
| **StoryPlan** | 阶段 3 的轻量计划执行结构，用于组织多步生成与建议 |
| **Context Assembler** | 上下文组装器，负责 Token 预算管理和裁剪 |
| **SSE** | Server-Sent Events，服务端推送流式数据的协议 |
| **ARQ** | Python 异步任务队列，基于 Redis |
| **BYOK** | Bring Your Own Key，用户自带 API Key |
| **FROZEN** | 契约冻结标记，表示该定义不可随意变更 |
| **parseDepth** | 解析深度，可选值 `fast` / `standard` / `deep`，同时服务 Parser 和写作 |
| **Fallback** | 降级策略，当 AI 不可用时退回到确定性规则引擎 |
| **AIParseRequest** | Parser 的 LLM 输入结构，包含章节内容 + existingKB + excludeWords |
| **AIParseResponse** | Parser 的 LLM 输出结构，包含 7 个维度 + confidence |
| **AITaskType** | AI 顶层稳定任务类型枚举（9 种），只描述可长期复用的能力 |
| **AIProjectConfig** | 项目级 AI 配置，字段级覆盖系统/用户默认值 |
| **AIResult** | 统一 AI 结果容器，采用判别式 payload 而不是横向加字段 |
| **ConsistencyIssue** | 一致性检查结果，包含类型/描述/置信度/处理状态 |
| **KBForeshadowSuggestion** | 伏笔疑似回收建议，由 AI 生成等待用户确认 |
| **Story Copilot** | 统一创作入口，承载世界构建、剧情推演、写作建议等会话式能力 |
| **StoryCopilotSession** | Story Copilot 的会话真相源，保存消息、模式、状态与可采纳结果 |
| **Story Reasoning Service** | 阶段 4 的统一推理服务，复用给一致性检查、剧情推演、伏笔回收等场景 |
| **WorldbuildEntryDraft** | 从 Copilot 对话中提取的设定草稿，用户确认后写入 KBSetting |
