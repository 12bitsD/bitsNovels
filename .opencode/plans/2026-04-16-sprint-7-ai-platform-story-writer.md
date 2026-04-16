# Sprint 7 Execution Plan: AI Platform Convergence + Story Writer Core

> **For agentic workers:** Follow this plan as the execution navigation layer. Do not treat it as the contract truth source. Use checkbox (`- [ ]`) syntax to track steps. Read the canonical docs before every task. Follow TDD from `process/dod.md` without exception.

**Goal:**
- Complete the Sprint 7 AI platform convergence refactor.
- Land the minimal stable AI foundation for `Story Writer`.
- Prepare `Story Copilot` so Sprint 8 can build on a stable session model instead of expanding top-level task types.

**Primary Outcome:**
- Stable `AITaskType`
- Discriminated `AIResult`
- Persistent `StoryCopilotSession`
- Lightweight `StoryPlan`
- Working Story Writer core flows for US-4.1 ~ US-4.4 and project config US-4.8

---

## Canonical Docs

### Truth Sources By Concern

| Concern | Canonical Doc |
|--------|---------------|
| Sprint scope / sequencing | `docs/SPRINT_LOG.md` |
| Backend AC | `specs/epic-4/be.md` |
| Frontend AC | `specs/epic-4/fe.md` |
| Types / API contract | `specs/epic-4/contract.md` |
| AI architecture / boundaries | `design/AI_SYSTEM.md` |
| Backend conventions | `design/BACKEND.md` |
| Frontend conventions | `design/frontend.md` |
| Definition of done / TDD / contract freeze | `process/dod.md` |

### Required Reading Order

**BE tasks**
1. `specs/epic-4/be.md`
2. `specs/epic-4/contract.md`
3. `design/AI_SYSTEM.md`
4. `design/BACKEND.md`
5. `process/dod.md`

**FE tasks**
1. `specs/epic-4/fe.md`
2. `specs/epic-4/contract.md`
3. `design/AI_SYSTEM.md`
4. `design/frontend.md`
5. `process/dod.md`

---

## Non-Negotiables

- [ ] Do not re-introduce `worldbuild` or `plot_derive` as top-level `AITaskType`.
- [ ] Do not add task-specific horizontal fields back onto `AIResult`.
- [ ] Treat `Story Copilot` as a session model, not a one-shot task.
- [ ] Use `StoryPlan` for V1 orchestration; do not implement heavy `WritingGraph` persistence in Sprint 7.
- [ ] Memory is cache only; session truth must be persisted.
- [ ] FE must not start implementing real contract-dependent surfaces before BE contract freeze.
- [ ] Every implementation task follows TDD: Red -> Green -> Refactor.

---

## Workstreams

### WS1. Contract Convergence
- Freeze the Sprint 7 contract around stable task types and discriminated result payloads.

### WS2. Backend Platform Foundation
- Implement core models and orchestration support for `AIResult`, `StoryPlan`, and `StoryCopilotSession`.

### WS3. Story Writer Delivery
- Implement US-4.1 ~ US-4.4 on top of the converged platform model.

### WS4. Frontend Consumption Model
- Align FE state machine and result rendering to discriminated payloads and future Copilot compatibility.

### WS5. Verification & Documentation
- Keep changelog, AC coverage, and test evidence in sync.

---

## Dependency Chain

```text
WS1 Contract Convergence
  -> WS2 Backend Platform Foundation
    -> WS3 Story Writer Delivery
      -> WS4 Frontend Consumption Model
        -> WS5 Verification & Documentation
```

**Important:** FE may prepare mocks early, but must not assume any pre-refactor `AIResult` or top-level task expansion model.

---

## Ordered Tasks

### Task S7-01: Freeze The Contract

**Goal**
- Confirm Sprint 7 uses the converged model already defined in the docs.

**Must Read**
- `specs/epic-4/contract.md`
- `design/AI_SYSTEM.md`
- `process/dod.md`

**Checks**
- [ ] `AITaskType` remains the stable 9-type set
- [ ] `AIResult` uses `payloadType + payload`
- [ ] `StoryCopilotSession` / `StoryCopilotMode` types exist and are coherent
- [ ] `StoryPlan` is the V1 plan model

**Done When**
- [ ] Contract is internally consistent
- [ ] FE/BE can implement against it without guessing

---

### Task S7-02: AC -> Test Mapping Before Code

**Goal**
- Create AC mapping tables for all Sprint 7 backend and frontend stories before implementation.

**Must Read**
- `process/dod.md`
- `specs/epic-4/be.md`
- `specs/epic-4/fe.md`

**Stories**
- [ ] US-4.8 Project AI Config
- [ ] US-4.1 Continue
- [ ] US-4.2 Polish
- [ ] US-4.3 Expand / Summarize
- [ ] US-4.4 Dialogue

**Done When**
- [ ] Every AC has at least one mapped test case
- [ ] Edge / error / empty cases are identified

---

### Task S7-03: Backend Platform Models

**Goal**
- Land backend domain shapes that all Sprint 7 AI features depend on.

**Must Read**
- `specs/epic-4/contract.md`
- `specs/epic-4/be.md`
- `design/AI_SYSTEM.md`

**Target Areas**
- [ ] `AIResult` discriminated payload support
- [ ] `StoryPlan` minimal persistence / runtime model
- [ ] `StoryCopilotSession` base persistence model
- [ ] task status support for `draft` / `awaiting_confirmation` where applicable

**Guardrails**
- [ ] No hidden dependence on ephemeral in-memory session-only state
- [ ] No Story Copilot feature delivery here beyond base session plumbing

**Done When**
- [ ] Models are usable by Story Writer
- [ ] Sprint 8 Copilot can build on them without contract redesign

---

### Task S7-04: Backend US-4.8 Project AI Config

**Goal**
- Deliver project-level AI config with the converged inheritance model.

**Must Read**
- `specs/epic-4/be.md`
- `specs/epic-4/contract.md`
- `design/AI_SYSTEM.md`
- `process/dod.md`

**Done When**
- [ ] field-level inheritance works
- [ ] saved config is immediately used by new tasks
- [ ] running tasks keep snapshot semantics
- [ ] tests cover inheritance / override / default fallback

---

### Task S7-05: Backend Story Writer Core

**Goal**
- Implement Story Writer flows on top of the new platform model.

**Stories**
- [ ] US-4.1 Continue
- [ ] US-4.2 Polish
- [ ] US-4.3 Expand / Summarize
- [ ] US-4.4 Dialogue

**Must Read**
- `specs/epic-4/be.md`
- `specs/epic-4/contract.md`
- `design/AI_SYSTEM.md`
- `design/BACKEND.md`

**Guardrails**
- [ ] Continue / dialogue produce `text` payloads
- [ ] Polish / expand / summarize produce `diff` payloads
- [ ] Streaming semantics follow SSE protocol from backend design
- [ ] Context assembler follows documented priority order

**Done When**
- [ ] Each story has RED tests first
- [ ] Status transitions are observable and stable
- [ ] Result payloads match contract exactly

---

### Task S7-06: Frontend Model Alignment

**Goal**
- Make FE consume the converged task and result model before feature UI polish.

**Must Read**
- `specs/epic-4/fe.md`
- `specs/epic-4/contract.md`
- `design/AI_SYSTEM.md`
- `process/dod.md`

**Focus**
- [ ] unified task state machine
- [ ] discriminated `AIResult.payloadType` rendering
- [ ] Story Writer flows consume the new payload model
- [ ] leave extension points for future `Story Copilot`

**Guardrails**
- [ ] Do not create UI paths that assume `worldbuild` / `plot_derive` are task types
- [ ] Do not duplicate a second state machine for Copilot-like behavior

**Done When**
- [ ] Writer flows work with real contract-aligned mock data
- [ ] payload rendering is type-driven, not stringly patched per feature

---

### Task S7-07: Frontend Story Writer UI

**Goal**
- Deliver UI for Sprint 7 stories without leaking Sprint 8 scope.

**Stories**
- [ ] US-4.1 Continue
- [ ] US-4.2 Polish
- [ ] US-4.3 Expand / Summarize
- [ ] US-4.4 Dialogue
- [ ] US-4.8 Project AI Config

**Must Read**
- `specs/epic-4/fe.md`
- `specs/epic-4/contract.md`
- `design/frontend.md`

**Guardrails**
- [ ] Reuse existing editor interaction patterns
- [ ] Keep result UIs within the documented three presentation classes
- [ ] Avoid adding Sprint 8 Copilot panel work here except minimal hooks / shell preparation

**Done When**
- [ ] UX matches FE AC
- [ ] Undo / discard / regenerate semantics are correct
- [ ] Mock-driven tests exist before UI implementation

---

### Task S7-08: Verification, Freeze, And Handoff

**Goal**
- Finish Sprint 7 in a way that Sprint 8 can safely start.

**Must Read**
- `process/dod.md`
- `docs/CHANGELOG.md`
- `docs/SPRINT_LOG.md`

**Checklist**
- [ ] all Sprint 7 AC mapped to tests
- [ ] new code coverage >= 73%
- [ ] FE diagnostics clean
- [ ] BE tests green
- [ ] changelog updated
- [ ] contract freeze status explicit for FE handoff
- [ ] Sprint 8 blockers listed if any

---

## Stop / Ask Conditions

Stop and ask before proceeding if any of the following happens:

- [ ] A task seems to require a new top-level `AITaskType`
- [ ] A feature seems to require adding business-specific fields directly back onto `AIResult`
- [ ] FE needs to depend on a contract that BE has not frozen
- [ ] The only way forward seems to require implementing `WritingGraph` instead of `StoryPlan`
- [ ] Session persistence cannot be introduced and the design would fall back to memory as truth
- [ ] A Sprint 8 capability is about to be quietly pulled into Sprint 7

---

## Parallelization Guidance

### Safe To Parallelize
- [ ] AC -> test mapping for FE and BE
- [ ] FE mock modeling after contract freeze
- [ ] Backend US-4.8 and backend Writer feature RED tests
- [ ] FE UI tests for Writer flows after contract freeze

### Must Stay Sequential
- [ ] Contract freeze before real FE dependency
- [ ] Platform model convergence before full Writer implementation
- [ ] State machine definition before payload rendering strategy

---

## Suggested File Targets

> Use these as a starting map only. Real implementation should follow the current workspace structure.

### Likely Backend Targets
- `workspace/server/routes/` AI-related routes
- `workspace/server/services/` AI orchestration / result shaping
- `workspace/server/tests/epic_4/` Sprint 7 RED/GREEN tests

### Likely Frontend Targets
- `workspace/apps/web/src/features/epic-4/`
- `workspace/apps/web/src/mocks/handlers.ts`
- `workspace/apps/web/src/api/`

---

## Sprint 7 Exit Criteria

- [ ] Story Writer core is shippable for Sprint 7 scope
- [ ] The platform model no longer reflects the abandoned task-expansion approach
- [ ] Sprint 8 can add `Story Copilot` without contract redesign
- [ ] Sprint 9 can add `Story Reasoning Service` without undoing Sprint 7 code

---

## Anti-Patterns To Reject

- [ ] "Just add one more task type for now"
- [ ] "Put this result on `AIResult` as another optional field"
- [ ] "Use session memory first, persist later"
- [ ] "Implement graph orchestration now in case we need it later"
- [ ] "Do FE first and clean the contract up afterwards"

