# Sprint 7 AC -> Test Mapping Template

> **Purpose:** Use this file before implementation starts. It operationalizes the TDD and traceability rules from `process/dod.md` for Sprint 7.

**Canonical Docs**
- `process/dod.md`
- `specs/epic-4/be.md`
- `specs/epic-4/fe.md`
- `specs/epic-4/contract.md`

---

## How To Use

1. Copy one section per user story.
2. Add AC IDs from the corresponding `be.md` or `fe.md`.
3. Map every AC to at least one test case.
4. Mark status through `Planned -> Red -> Green -> Refactor`.
5. Do not begin implementation until the mapping exists.

---

## Global Rules

- [ ] Every AC has at least one test case
- [ ] Every story has positive tests
- [ ] Every story has error / empty / negative coverage where relevant
- [ ] Boundary values are explicitly tested where relevant
- [ ] FE and BE test layers are both declared where needed
- [ ] Expected results are measurable
- [ ] Evidence is recorded with file paths

---

## Story Template

### Story
- `US-4.x`
- Surface: `BE` / `FE` / `BE+FE`
- Canonical spec:
  - `specs/epic-4/be.md`
  - `specs/epic-4/fe.md`
  - `specs/epic-4/contract.md`

### Story-Level Risks
- [ ] contract ambiguity
- [ ] state machine complexity
- [ ] streaming behavior
- [ ] diff generation
- [ ] inheritance / override logic
- [ ] selection / cursor edge cases

### AC Mapping Table

| US | AC-ID | AC 描述 | 测试层级 | 用例 ID | Given / When / Then（摘要） | 类型 | Mock / Fixture | 预期结果 | 状态 | 证据 |
|----|------|---------|---------|--------|-----------------------------|------|----------------|----------|------|------|
| US-4.x | AC-1 | ... | Unit / Integration / E2E | TC-US4.x-001 | Given... When... Then... | 正向 / 反向 / 边界 | ... | 状态码 / 字段 / 文案 / 计数 | Planned | path/to/test |

### Completion Checklist
- [ ] all AC rows created
- [ ] all RED tests written first
- [ ] all GREEN evidence captured
- [ ] refactor phase completed without contract drift

---

## Sprint 7 Starter Sheets

### US-4.8 Project AI Config

**Key things to test**
- [ ] project > user > system inheritance
- [ ] field-level override instead of whole-object overwrite
- [ ] new tasks read latest saved config
- [ ] running tasks keep snapshot semantics
- [ ] invalid values rejected

| US | AC-ID | AC 描述 | 测试层级 | 用例 ID | Given / When / Then（摘要） | 类型 | Mock / Fixture | 预期结果 | 状态 | 证据 |
|----|------|---------|---------|--------|-----------------------------|------|----------------|----------|------|------|
| US-4.8 | AC-1 | 项目级配置读取 | Integration | TC-US4.8-001 | Given user default and system default, when fetch project config, then merged values are returned | 正向 | seeded config fixtures | 返回 200 且字段带来源信息 | Planned | |
| US-4.8 | AC-2 | 字段级继承 | Integration | TC-US4.8-002 | Given only `model` is overridden, when fetch effective config, then other fields inherit unchanged | 边界 | partial override fixture | 未覆盖字段保持继承值 | Planned | |
| US-4.8 | AC-3 | 运行中任务快照稳定 | Integration | TC-US4.8-003 | Given task already started, when config changes, then task keeps original snapshot | 反向 | started task fixture | 任务结果使用旧快照 | Planned | |

---

### US-4.1 Continue

**Key things to test**
- [ ] create task
- [ ] start stream
- [ ] receive started / delta / completed
- [ ] stop task
- [ ] empty context and upstream failure

| US | AC-ID | AC 描述 | 测试层级 | 用例 ID | Given / When / Then（摘要） | 类型 | Mock / Fixture | 预期结果 | 状态 | 证据 |
|----|------|---------|---------|--------|-----------------------------|------|----------------|----------|------|------|
| US-4.1 | AC-1 | 创建续写任务 | Integration | TC-US4.1-001 | Given valid chapter context, when create continue task, then task is accepted | 正向 | chapter fixture | 返回 200/202 且 taskId 存在 | Planned | |
| US-4.1 | AC-2 | SSE 流式输出 | Integration | TC-US4.1-002 | Given running task, when subscribe stream, then started/delta/completed arrive in order | 正向 | mocked provider stream | 事件顺序正确 | Planned | |
| US-4.1 | AC-3 | 手动停止 | Integration | TC-US4.1-003 | Given generating task, when stop is requested, then task becomes stopped and partial result is kept | 反向 | partial content fixture | 状态为 stopped | Planned | |

---

### US-4.2 Polish

**Key things to test**
- [ ] selection required
- [ ] diff output shape
- [ ] accept / discard assumptions
- [ ] invalid selection and provider failure

| US | AC-ID | AC 描述 | 测试层级 | 用例 ID | Given / When / Then（摘要） | 类型 | Mock / Fixture | 预期结果 | 状态 | 证据 |
|----|------|---------|---------|--------|-----------------------------|------|----------------|----------|------|------|
| US-4.2 | AC-1 | 润色返回 Diff | Unit / Integration | TC-US4.2-001 | Given selected text, when polish completes, then result payload is diff | 正向 | selection fixture | payloadType=`diff` | Planned | |
| US-4.2 | AC-2 | 无选区不可执行 | Unit / FE | TC-US4.2-002 | Given no selection, when user triggers polish, then action is blocked with feedback | 反向 | editor mock | 按钮禁用或提示明确 | Planned | |

---

### US-4.3 Expand / Summarize

**Key things to test**
- [ ] multiplier / compression controls
- [ ] diff output
- [ ] boundary values
- [ ] empty selection handling

| US | AC-ID | AC 描述 | 测试层级 | 用例 ID | Given / When / Then（摘要） | 类型 | Mock / Fixture | 预期结果 | 状态 | 证据 |
|----|------|---------|---------|--------|-----------------------------|------|----------------|----------|------|------|
| US-4.3 | AC-1 | 扩写结果为 Diff | Integration | TC-US4.3-001 | Given selection and expand ratio, when task completes, then diff payload is returned | 正向 | selection fixture | payloadType=`diff` | Planned | |
| US-4.3 | AC-2 | 缩写边界值 | Unit | TC-US4.3-002 | Given min/max compression ratio, when validate request, then accepted or rejected correctly | 边界 | validation-only fixture | 边界行为正确 | Planned | |

---

### US-4.4 Dialogue

**Key things to test**
- [ ] cursor-based trigger
- [ ] role-aware generation
- [ ] streaming output
- [ ] stop behavior

| US | AC-ID | AC 描述 | 测试层级 | 用例 ID | Given / When / Then（摘要） | 类型 | Mock / Fixture | 预期结果 | 状态 | 证据 |
|----|------|---------|---------|--------|-----------------------------|------|----------------|----------|------|------|
| US-4.4 | AC-1 | 对话生成输出文本 | Integration | TC-US4.4-001 | Given cursor context and roles, when dialogue task completes, then text payload is returned | 正向 | role context fixture | payloadType=`text` | Planned | |
| US-4.4 | AC-2 | 流式停止 | Integration | TC-US4.4-002 | Given dialogue is streaming, when stop is requested, then generation halts and status is stopped | 反向 | mocked provider stream | 状态为 stopped | Planned | |

---

## Evidence Pointers

### Suggested Backend Test Locations
- `workspace/server/tests/epic_4/test_us48_ai_config_red.py`
- `workspace/server/tests/epic_4/test_us41_continue_red.py`
- `workspace/server/tests/epic_4/test_us42_polish_red.py`
- `workspace/server/tests/epic_4/test_us43_expand_summarize_red.py`
- `workspace/server/tests/epic_4/test_us44_dialogue_red.py`

### Suggested Frontend Test Locations
- `workspace/apps/web/src/features/epic-4/__tests__/ProjectAIConfig.test.tsx`
- `workspace/apps/web/src/features/epic-4/__tests__/ContinueFlow.test.tsx`
- `workspace/apps/web/src/features/epic-4/__tests__/PolishFlow.test.tsx`
- `workspace/apps/web/src/features/epic-4/__tests__/ExpandSummarizeFlow.test.tsx`
- `workspace/apps/web/src/features/epic-4/__tests__/DialogueFlow.test.tsx`

