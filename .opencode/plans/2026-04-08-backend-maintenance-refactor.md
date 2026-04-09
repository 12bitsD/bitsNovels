# Backend Maintenance Refactor Plan (Reduce Coupling, Improve Clarity)

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Branch:** `chore/backend-maintenance` (already created & pushed to origin)

**Goal (Outcome-Focused):**
- Make backend code easier to navigate and change by reducing implicit global dependencies, shrinking “God modules”, and strengthening module boundaries.
- Keep runtime behavior stable (pure refactor) with characterization tests guarding critical flows.
- Add lightweight inline docs/docstrings where they meaningfully reduce onboarding cost for future agents.

**Non-Goals (to prevent scope creep):**
- [ ] No API contract changes (request/response shapes stay the same) unless explicitly approved.
- [ ] No persistence redesign (FakeDB stays for now).
- [ ] No performance optimization unless it is a byproduct of removing duplication.

---

## Guiding Principles

- **Prefer explicit dependencies** over importing `server.main` inside services/routes.
- **Routes stay thin**: validation + calling service layer + response shaping only.
- **Side effects are isolated**: notifications/queue updates live behind dedicated helpers.
- **Refactor via TDD**: add characterization tests first; keep them green while refactoring.

---

## Phase 0: Baseline & Safety Nets

- [ ] Map current backend entrypoints and shared helpers (where routes import `server.main`, where services read `app.state`).
- [ ] Add characterization tests for the highest-risk surfaces:
  - [ ] Outline endpoints (US-1.5): get/create/patch/move/reorder.
  - [ ] Parser endpoints (US-2.1): enqueue/manual/batch/cancel/status.
  - [ ] Trash restore endpoints (US-1.7): restore/permanent delete/list.
- [ ] Confirm tests are stable and cover refactor-critical behaviors (status transitions, error codes, response keys).

**Success Criteria:**
- Tests fail when behavior changes unintentionally and pass otherwise.

---

## Phase 1: Untangle `server.main` (App Factory + State Init)

**Problems addressed:**
- `main.py` is a God module and uses implicit global state mutations (lifespan uses `fapp` but writes `app.state`).
- Dynamic router registration hides dependencies and makes refactors risky.

**Plan:**
- [ ] Introduce `server/app_factory.py` with `create_app()` returning a FastAPI instance.
- [ ] Introduce `server/state.py` with a single `init_state(state)` function that populates required `state.*` keys.
- [ ] Update lifespan to call `init_state(fapp.state)` only (no global `app` writes).
- [ ] Keep router registration behavior identical at first (no functional changes), but move assembly into a dedicated module:
  - [ ] `server/routes/registry.py` exports `register_routers(app)` or returns a list of routers.
- [ ] Add docstrings explaining:
  - [ ] What lives in `state` and why.
  - [ ] How new routes should be registered.

**Success Criteria:**
- `workspace/server/main.py` becomes a small entrypoint (imports `create_app`, defines `app = create_app()`).
- No route behavior changes; tests remain green.

---

## Phase 2: Remove Cross-Route / Cross-Layer Imports (Introduce “Deps”)

**Problems addressed:**
- Routes/services import private helpers from `server.main` or from other routes.
- This creates horizontal coupling and encourages “just import app/state anywhere”.

**Plan:**
- [ ] Create `server/routes/deps.py` (or `server/http/deps.py`) to host shared HTTP-level helpers:
  - [ ] `require_user_id(authorization)`
  - [ ] `error_response(...)`
  - [ ] `require_project_access(...)` (authz + archived checks)
- [ ] Migrate routes to use deps module instead of importing from `server.main`.
- [ ] Keep naming close to existing helpers to avoid churn.
- [ ] Add short docstrings on each helper describing intended usage and invariants (what it checks, what it returns).

**Success Criteria:**
- Routes no longer import `server.main` for shared helpers (or usage becomes minimal and transitional).
- Shared authz/error patterns become uniform across routes.

---

## Phase 3: Service Extraction for the Worst Offenders

### 3.1 Outline (US-1.5) — split route vs domain operations

**Problems addressed:**
- `us15_outline.py` mixes validation, data mutation, and response construction.

**Plan:**
- [ ] Create `server/services/outline_service.py`:
  - [ ] volume CRUD operations (create/patch/reorder)
  - [ ] chapter operations (create/patch/move/reorder/bulk)
- [ ] Keep response shaping in route layer or a dedicated `presenter` module if it becomes large.
- [ ] Add docstrings for “order semantics” and “move semantics” (the rules future changes must respect).

**Success Criteria:**
- Route functions become short and mostly orchestrate input → service → output.
- Characterization tests stay green.

### 3.2 Parser (US-2.1) — separate queue/state machine/detectors/materialization

**Problems addressed:**
- `parser_service.py` is over-concentrated and depends on `server.main.app.state`.

**Plan:**
- [ ] Define internal models for task/state/job (TypedDict or Pydantic BaseModel used internally; no API change).
- [ ] Split implementation modules (initially thin wrappers calling existing logic):
  - [ ] `server/services/parser_queue.py` (queue ordering, dequeue, cancel)
  - [ ] `server/services/parser_state_machine.py` (status transitions)
  - [ ] `server/services/parser_detectors.py` (regex detection)
  - [ ] `server/services/parser_notifications.py` (notification creation)
- [ ] Replace `_main_module()` / `_AppProxy` pattern with explicit inputs:
  - [ ] Functions accept `state` and `clock` (or accept a small `AppContext` object).

**Success Criteria:**
- Parser logic no longer needs to import `server.main` at runtime.
- Status transitions remain identical (tests prove it).

### 3.3 Trash restore (US-1.7) — make restore transactional-by-design (even without DB tx)

**Problems addressed:**
- Restore operations update multiple collections with implicit assumptions and long functions.

**Plan:**
- [ ] Extract “restore plan” computation (pure function) from “apply restore plan” (side effects).
- [ ] Add tests that assert restore invariants (chapter ends in correct volume/order, contents restored, counters consistent).

**Success Criteria:**
- Restore path becomes readable and safer to modify (clear steps, fewer hidden writes).

---

## Phase 4: Documentation & Onboarding Aids (Minimal but High-Leverage)

- [ ] Add `workspace/server/ARCHITECTURE.md`:
  - [ ] App creation flow (entrypoint → app_factory → state init → router registry)
  - [ ] Where to put shared deps/helpers
  - [ ] “Route thin / Service thick” guideline with one concrete example
- [ ] Add short module-level docstrings in the new core modules only (avoid noisy comments).

**Success Criteria:**
- A new contributor can locate: app creation, state keys, where to add a route, and how to write a service without reading `main.py` top-to-bottom.

---

## Verification Checklist (Every Phase)

- [ ] Run backend unit tests; ensure refactor does not reduce coverage below the repo threshold.
- [ ] Ensure no public API response shape changes (golden tests or snapshot assertions where appropriate).
- [ ] Grep for remaining `from server.main import app` usage and track it down to an explicit allowlist (temporary) or eliminate it.

