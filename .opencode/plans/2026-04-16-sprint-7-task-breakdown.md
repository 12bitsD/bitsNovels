# Sprint 7 Task Breakdown: AI Platform Convergence + Story Writer Core

> **For agentic workers:** This file is the task-card companion to `2026-04-16-sprint-7-ai-platform-story-writer.md`. Use it for day-to-day execution. Do not replace the canonical docs with this file.

**Parent Plan**
- `.opencode/plans/2026-04-16-sprint-7-ai-platform-story-writer.md`

**Canonical Docs**
- `specs/epic-4/be.md`
- `specs/epic-4/fe.md`
- `specs/epic-4/contract.md`
- `design/AI_SYSTEM.md`
- `process/dod.md`

---

## Execution Order

1. `S7-A` Contract freeze
2. `S7-B` AC -> test mapping
3. `S7-C` Backend platform foundation
4. `S7-D` Backend story delivery
5. `S7-E` Frontend model alignment
6. `S7-F` Frontend story delivery
7. `S7-G` Verification and handoff

---

## S7-A Contract Freeze

**Goal**
- Lock Sprint 7 to the converged AI platform model.

**Inputs**
- `specs/epic-4/contract.md`
- `design/AI_SYSTEM.md`

**Checklist**
- [ ] `AITaskType` remains the stable 9-type set
- [ ] `AIResult` uses `payloadType + payload`
- [ ] `StoryCopilotSession` exists as a session model
- [ ] `StoryPlan` is the V1 orchestration model
- [ ] no task-specific optional result fields are reintroduced

**Deliverables**
- [ ] frozen contract
- [ ] noted assumptions for FE handoff

**Blockers**
- [ ] unresolved mismatch between contract and AI system design

---

## S7-B AC -> Test Mapping

**Goal**
- Build test mapping before implementation starts.

**Stories**
- [ ] US-4.8
- [ ] US-4.1
- [ ] US-4.2
- [ ] US-4.3
- [ ] US-4.4

**Checklist**
- [ ] every AC mapped to at least one test
- [ ] positive cases covered
- [ ] negative cases covered
- [ ] boundary cases covered where relevant
- [ ] FE / BE layer for each case declared

**Deliverables**
- [ ] completed mapping sheet using the Sprint 7 template

---

## S7-C Backend Platform Foundation

**Goal**
- Implement shared backend platform pieces needed by all Sprint 7 AI work.

**Subtasks**

### S7-C1 `AIResult`
- [ ] add discriminated result model support
- [ ] support `draft`, `generating`, `awaiting_confirmation`, `done`, `stopped`, `failed`
- [ ] add serialization / response shaping tests

### S7-C2 `StoryPlan`
- [ ] define minimal model
- [ ] support ordered multi-step execution
- [ ] avoid graph orchestration complexity

### S7-C3 `StoryCopilotSession`
- [ ] add persistent session base model
- [ ] define message persistence boundary
- [ ] ensure memory is not the only truth source

### S7-C4 Shared Status / Routing Support
- [ ] align task status handling with new result model
- [ ] confirm SSE payload compatibility with backend protocol

**Done When**
- [ ] Story Writer features can depend on these models without redesign

---

## S7-D Backend Story Delivery

**Goal**
- Deliver backend functionality for Sprint 7 user stories.

### S7-D1 US-4.8 Project AI Config
- [ ] RED tests for inheritance and snapshot semantics
- [ ] implement project > user > system field-level resolution
- [ ] implement save + immediate effect on new tasks
- [ ] keep running task snapshot stable

### S7-D2 US-4.1 Continue
- [ ] RED tests for task create / stream / stop
- [ ] implement text payload generation
- [ ] confirm SSE state transitions

### S7-D3 US-4.2 Polish
- [ ] RED tests for rewrite + diff output
- [ ] implement diff shaping on server
- [ ] verify undo-safe output assumptions for FE

### S7-D4 US-4.3 Expand / Summarize
- [ ] RED tests for multiplier / compression boundaries
- [ ] implement diff payload generation
- [ ] validate edge cases and empty selection behavior

### S7-D5 US-4.4 Dialogue
- [ ] RED tests for role-aware dialogue generation
- [ ] implement text payload generation
- [ ] verify stream / stop behavior

**Done When**
- [ ] all Sprint 7 BE stories green
- [ ] payloads match contract

---

## S7-E Frontend Model Alignment

**Goal**
- Align FE state and rendering model before final UI delivery.

**Subtasks**
- [ ] define unified task state machine
- [ ] render by `payloadType`
- [ ] align mocks with frozen contract
- [ ] leave extension seams for Sprint 8 Copilot

**Anti-Patterns**
- [ ] hardcoding result parsing per story
- [ ] assuming Copilot is a task type

---

## S7-F Frontend Story Delivery

**Goal**
- Deliver Sprint 7 UI using the converged model.

### S7-F1 US-4.8 Project AI Config
- [ ] config form
- [ ] inherited source display
- [ ] save / reset behavior

### S7-F2 US-4.1 Continue
- [ ] entry point
- [ ] stream UI
- [ ] stop / regenerate / accept / discard

### S7-F3 US-4.2 Polish
- [ ] selection entry
- [ ] diff presentation
- [ ] accept / discard / regenerate

### S7-F4 US-4.3 Expand / Summarize
- [ ] controls for ratio / multiplier
- [ ] diff presentation
- [ ] empty / invalid selection feedback

### S7-F5 US-4.4 Dialogue
- [ ] cursor-based entry
- [ ] stream presentation
- [ ] accept / discard / regenerate

**Done When**
- [ ] FE AC satisfied
- [ ] tests written before implementation
- [ ] contract-aligned mocks replaced where real API is ready

---

## S7-G Verification And Handoff

**Checklist**
- [ ] all AC mappings complete
- [ ] RED -> GREEN -> Refactor evidence exists
- [ ] new code coverage >= 73%
- [ ] diagnostics clean
- [ ] changelog updated
- [ ] Sprint 8 Copilot prerequisites noted

**Handoff Notes Must Include**
- [ ] what is frozen
- [ ] what is deferred to Sprint 8
- [ ] what is deferred to Sprint 9

---

## Parallelization Matrix

| Work Item | Can Parallelize? | Notes |
|----------|------------------|-------|
| S7-A Contract freeze | No | single truth source first |
| S7-B AC mapping FE / BE | Yes | after scope is known |
| S7-C platform subtasks | Partial | coordinate model boundaries first |
| S7-D BE story tasks | Partial | US-4.8 can run alongside RED tests for writer tasks |
| S7-E FE model alignment | No | depends on frozen contract |
| S7-F FE story tasks | Yes | after FE model alignment is stable |
| S7-G verification | No | final gate |

---

## Reject These Shortcuts

- [ ] "We'll add one more optional field to `AIResult` just for this story"
- [ ] "We'll fake session persistence for now and store it only in memory"
- [ ] "We'll implement `WritingGraph` now so we don't revisit it later"
- [ ] "We'll let FE start from a guessed contract and sync later"

