# Sprint 5 Implementation Plan: Export, Backup & Knowledge Base Transfer

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 User Stories (US-5.1~5.5) covering async export tasks, auto backup scheduler, export templates, KB JSON export/import, and full project ZIP backup/restore.

**Architecture:**
- **BE**: FastAPI routes in `workspace/server/routes/us51_export.py`, `us52_backup.py`, `us53_templates.py`, `us54_kb_transfer.py`, `us55_restore.py`. Fake DB stores file content as base64 (real S3 in production). Background tasks via `FastAPI BackgroundTasks` (ARQ deferred to future).
- **FE**: React components in `workspace/apps/web/src/features/epic-5/`. Modal overlays with `backdrop-blur-sm`, tab-based settings integration at `backup` tab, MSW handlers for API mocking.
- **Async Pattern**: `BackgroundTasks` for immediate async (export generation, backup creation). Tasks update status in `app.state.export_tasks` dict, progress tracked via polling endpoint.
- **Storage**: Export files stored as base64 in `app.state.export_files`. Backup files stored as base64 in `app.state.backup_files`. ZIP created in-memory using `zipfile` module.

---

## File Map

### New BE Files

| File | Responsibility |
|------|----------------|
| `workspace/server/routes/us51_export.py` | Export task CRUD, task status polling, download URL |
| `workspace/server/routes/us52_backup.py` | Auto backup scheduler logic, backup list/management |
| `workspace/server/routes/us53_templates.py` | Export template CRUD (user-level, max 20) |
| `workspace/server/routes/us54_kb_transfer.py` | KB JSON export/import with conflict detection |
| `workspace/server/routes/us55_restore.py` | Project backup ZIP creation, restore (2 modes) |
| `workspace/server/services/export_service.py` | Format generators: DOCX/TXT/PDF/Markdown (content assembly) |
| `workspace/server/services/backup_service.py` | ZIP打包逻辑, manifest生成 |
| `workspace/server/services/kb_transfer_service.py` | KB JSON schema validation, conflict detection |
| `workspace/server/tests/epic_5/conftest.py` | Epic 5 fixtures: export_tasks, backup_files, export_templates, kb_exports |
| `workspace/server/tests/epic_5/test_us51_export_red.py` | US-5.1 RED tests |
| `workspace/server/tests/epic_5/test_us52_backup_red.py` | US-5.2 RED tests |
| `workspace/server/tests/epic_5/test_us53_templates_red.py` | US-5.3 RED tests |
| `workspace/server/tests/epic_5/test_us54_kb_transfer_red.py` | US-5.4 RED tests |
| `workspace/server/tests/epic_5/test_us55_restore_red.py` | US-5.5 RED tests |

### Existing BE Files Modified

| File | Change |
|------|--------|
| `workspace/server/main.py:40-46` | Add state counters: `export_task_counter`, `backup_counter`, `template_counter`; add state dicts: `export_tasks`, `export_files`, `backups`, `backup_files`, `export_templates`, `kb_exports` |
| `workspace/server/main.py:696-704` | Register 5 new routers |

### New FE Files

| File | Responsibility |
|------|----------------|
| `workspace/apps/web/src/features/epic-5/components/ExportPanel/ExportPanel.tsx` | Export modal with format selector, scope tree, progress |
| `workspace/apps/web/src/features/epic-5/components/ExportPanel/ExportHistory.tsx` | Recent 10 exports list |
| `workspace/apps/web/src/features/epic-5/components/ExportPanel/ExportTemplateSelector.tsx` | Template dropdown + save template |
| `workspace/apps/web/src/features/epic-5/components/BackupRestorePanel/BackupList.tsx` | Auto/manual backup list |
| `workspace/apps/web/src/features/epic-5/components/BackupRestorePanel/RestoreModal.tsx` | ZIP upload + preview + mode selection |
| `workspace/apps/web/src/features/epic-5/components/KBExportImportPanel/KBExportModal.tsx` | KB export scope selector |
| `workspace/apps/web/src/features/epic-5/components/KBExportImportPanel/KBImportModal.tsx` | JSON upload + conflict resolution |
| `workspace/apps/web/src/features/epic-5/components/KBExportImportPanel/ConflictResolver.tsx` | Per-item skip/overwrite/keep_both |
| `workspace/apps/web/src/features/epic-5/hooks/useExportTask.ts` | Poll export task status |
| `workspace/apps/web/src/features/epic-5/hooks/useExportTemplates.ts` | Template CRUD operations |
| `workspace/apps/web/src/features/epic-5/hooks/useBackupList.ts` | Backup list management |
| `workspace/apps/web/src/features/epic-5/hooks/useKBCreate.ts` | Knowledge base CRUD |
| `workspace/apps/web/src/features/epic-5/__tests__/ExportPanel.test.tsx` | Export panel tests |
| `workspace/apps/web/src/features/epic-5/__tests__/BackupRestorePanel.test.tsx` | Backup panel tests |
| `workspace/apps/web/src/features/epic-5/__tests__/useExportTask.test.ts` | Hook tests |
| `workspace/apps/web/src/mocks/handlers.ts` | Add epic-5 MSW handlers |

### Existing FE Files Modified

| File | Change |
|------|--------|
| `workspace/apps/web/src/features/epic-1/components/ProjectSettingsPage.tsx` | Replace backup tab stub with `<BackupRestorePanel>` |
| `workspace/apps/web/src/features/epic-3/components/EditorWorkspace.tsx` | Add export menu item in editor toolbar |
| `workspace/apps/web/src/api/client.ts` | (No changes needed - already has POST/GET/PATCH/DELETE) |
| `workspace/apps/web/src/hooks/index.ts` | Export new hooks |

---

## Global State Additions (main.py)

```python
# Add to _FakeDb or directly to app.state:
app.state.export_tasks = {}      # dict[str, ExportTask]
app.state.export_files = {}      # dict[str, dict{fileUrl, expiresAt, format}]
app.state.backups = {}           # dict[project_id, list[BackupManifest]]
app.state.backup_files = {}      # dict[backup_id, base64_zip_string]
app.state.export_templates = {}  # dict[user_id, list[ExportTemplate]]
app.state.kb_exports = {}        # dict[str, KnowledgeBaseExportFile]

# Counters
app.state.export_task_counter = 0
app.state.backup_counter = 0
app.state.template_counter = 0
```

---

## Parallel Execution Strategy

### Phase 1: BE Infrastructure (Parallel: 3 subagents)

| Subagent | Tasks |
|----------|-------|
| BE-Agent-1 | **US-5.3 Export Templates** (simplest, no async): route + service + tests |
| BE-Agent-2 | **US-5.1 Export Core** (async task + 4 format generators): route + service + tests |
| BE-Agent-3 | **US-5.4 KB Transfer** (JSON schema + conflict): route + service + tests |

### Phase 2: BE Backup & Restore (Parallel: 2 subagents)

| Subagent | Tasks |
|----------|-------|
| BE-Agent-4 | **US-5.2 Auto Backup** (scheduler + retention): route + service + tests |
| BE-Agent-5 | **US-5.5 Restore** (ZIP create/restore, 2 modes): route + service + tests |

### Phase 3: FE (All parallel after BE contract verified)

| Subagent | Tasks |
|----------|-------|
| FE-Agent-1 | **US-5.1 Export UI** (ExportPanel, progress, history) |
| FE-Agent-2 | **US-5.2/5.5 Backup/Restore UI** (BackupRestorePanel, RestoreModal) |
| FE-Agent-3 | **US-5.3 Templates UI** (template selector, save dialog) |
| FE-Agent-4 | **US-5.4 KB Transfer UI** (KBExportModal, KBImportModal, ConflictResolver) |

### FE Start Condition
- FE can begin with **MSW mocks** immediately after contract review
- Replace mocks with real API calls after each BE route is verified

---

## Dependency Chain

```
BE: US-5.3 Templates → BE: US-5.1 Export → BE: US-5.4 KB Transfer ─┐
                                                               │
BE: US-5.2 Auto Backup ─────────────────────────────────────────┤
                                                               ├─ FE: All (after BE verified)
BE: US-5.5 Restore ──────────────────────────────────────────────┘
```

**FE note**: US-5.3 (Templates) is independent but FE US-5.1 (ExportPanel) consumes templates, so BE US-5.3 should complete before or alongside FE US-5.1.

---

## Task Breakdown

### Task 1: BE US-5.3 Export Templates

**Category**: `deep` (template CRUD with user-level isolation and 20-limit)

**Files**: `us53_templates.py`, `tests/epic_5/test_us53_templates_red.py`

**Success Criteria**:
- [ ] `POST /api/me/export-templates` creates template (validates 20 limit per user)
- [ ] `GET /api/me/export-templates` lists user's templates only
- [ ] `PATCH /api/me/export-templates/{id}` updates template name/options
- [ ] `DELETE /api/me/export-templates/{id}` removes template
- [ ] Template name max 30 chars, format validated, options schema validated
- [ ] RED test: all endpoints reject unauthenticated, return 401

**Steps**:
- [ ] Write failing RED tests for all CRUD operations
- [ ] Implement `ExportTemplate` model validation in route
- [ ] Add `export_templates` dict to app.state with user-level filtering
- [ ] Implement 20-template limit check before insert
- [ ] Run tests until green, commit

---

### Task 2: BE US-5.1 Export (Core + Async Task)

**Category**: `ultrabrain` (most complex: async task state machine + 4 format generators)

**Files**: `us51_export.py`, `services/export_service.py`, `tests/epic_5/test_us51_export_red.py`

**Success Criteria**:
- [ ] `POST /api/projects/{project_id}/exports` creates task (status=pending)
- [ ] `GET /api/projects/{project_id}/exports` returns last 10 exports
- [ ] `GET /api/projects/{project_id}/exports/{task_id}` returns task with progress
- [ ] `GET /api/projects/{project_id}/exports/{task_id}/download` returns file (checks expiry 7 days)
- [ ] Background task generates file, updates status: pending→generating→done/failed
- [ ] Notification: `export_done` or `export_failed` sent to notification center
- [ ] Progress updates: 0→30→60→90→100
- [ ] Scope resolver: all/volume/chapter, respects order
- [ ] Format generators: DOCX (font/size/spacing), TXT (encoding/separator), PDF, Markdown

**Steps**:
- [ ] Write failing RED tests for task creation and status polling
- [ ] Implement `ExportTask` state machine with BackgroundTasks
- [ ] Implement scope resolver for volume/chapter hierarchy
- [ ] Implement content assembler (正文 + optional notes/annotations)
- [ ] Implement 4 format generators (use `python-docx`, `reportlab` for PDF)
- [ ] Implement download endpoint with 7-day expiry
- [ ] Add notification creation on done/failed
- [ ] Run tests until green, commit

**Key Implementation Detail - Async Pattern**:
```python
from fastapi import BackgroundTasks

@router.post("/{project_id}/exports")
def create_export_task(
    project_id: str,
    payload: CreateExportRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(...),
):
    # Create task with status=pending
    # Immediately return task_id
    # background_tasks.add_task(generate_export, task_id, ...)
    # return {"taskId": task_id, "status": "pending"}

def generate_export(task_id: str, ...):
    # Update status to generating, progress=0
    # ... generate file ...
    # Update status to done, fileUrl=..., expiresAt=7days
    # Create notification export_done
```

---

### Task 3: BE US-5.4 Knowledge Base Transfer

**Category**: `deep` (JSON schema validation + conflict detection algorithm)

**Files**: `us54_kb_transfer.py`, `services/kb_transfer_service.py`, `tests/epic_5/test_us54_kb_transfer_red.py`

**Success Criteria**:
- [ ] `POST /api/projects/{project_id}/kb/export` creates KB JSON export file
- [ ] Export respects scope: all/types/items,连带导出 referenced relations
- [ ] `GET /api/projects/{project_id}/kb/export/{export_id}/download` returns JSON file
- [ ] `POST /api/projects/{project_id}/kb/import` validates schema version
- [ ] Conflict detection: same `type` + `name` → 3 strategies (skip/overwrite/keep_both)
- [ ] `keep_both` generates unique name: `original_name (1)`, `original_name (2)`
- [ ] Import result: counts of imported/skipped/overwritten/renamed
- [ ] Validates required fields: version, projectMeta, knowledgeBase.*

**Steps**:
- [ ] Write failing RED tests for export and import
- [ ] Implement KB scope resolver (连带 referenced relations)
- [ ] Implement `KnowledgeBaseExportFile` JSON structure with version
- [ ] Implement conflict detection with 3 strategies
- [ ] Implement import with schema validation
- [ ] Run tests until green, commit

---

### Task 4: BE US-5.2 Auto Backup

**Category**: `deep` (scheduler logic + retention policy)

**Files**: `us52_backup.py`, `services/backup_service.py`, `tests/epic_5/test_us52_backup_red.py`

**Success Criteria**:
- [ ] `POST /api/projects/{project_id}/backups/auto/trigger` creates auto backup (for testing)
- [ ] `GET /api/projects/{project_id}/backups` lists auto+manual backups
- [ ] `GET /api/projects/{project_id}/backups/{backup_id}/download` returns ZIP
- [ ] Auto backup scheduler: 24hr interval, skips archived projects
- [ ] Retention: max 7 auto backups per project, delete oldest exceeds
- [ ] Notification: `backup_done` / `backup_failed` on scheduler run
- [ ] ZIP contains: manifest.json, project/, knowledge-base/, snapshots/, annotations/, config/

**Steps**:
- [ ] Write failing RED tests for backup creation and listing
- [ ] Implement `ProjectBackupManifest` and `ProjectBackup` ZIP structure
- [ ] Implement ZIP generator reusing US-5.1 content serialization + KB serialization
- [ ] Implement retention enforcement (delete oldest when > 7)
- [ ] Implement auto backup trigger endpoint (for testing)
- [ ] Run tests until green, commit

---

### Task 5: BE US-5.5 Project Restore

**Category**: `ultrabrain` (ZIP upload + 2 restore modes + version compatibility)

**Files**: `us55_restore.py`, `tests/epic_5/test_us55_restore_red.py`

**Success Criteria**:
- [ ] `POST /api/projects/{project_id}/backups/{backup_id}/restore` - mode "create_new"
- [ ] `POST /api/projects/{project_id}/backups/{backup_id}/restore` - mode "overwrite"
- [ ] Overwrite mode requires inputting project name for confirmation
- [ ] ZIP validation: manifest.json present, version compatible, all required files exist
- [ ] Restore creates new project with new ID (create_new) or replaces all data (overwrite)
- [ ] Returns preview: projectName, totalChars, chapterCount, kbEntries, backupDate
- [ ] Invalid ZIP: returns error "备份文件无效或已损坏"

**Steps**:
- [ ] Write failing RED tests for restore with both modes
- [ ] Implement ZIP upload and schema validation
- [ ] Implement preview endpoint (parse ZIP, return summary)
- [ ] Implement create_new restore mode
- [ ] Implement overwrite restore mode (with confirmation)
- [ ] Run tests until green, commit

---

### Task 6: FE US-5.1 Export Panel

**Category**: `visual-engineering`

**Files**: `ExportPanel.tsx`, `ExportHistory.tsx`, `ExportTemplateSelector.tsx`, `useExportTask.ts`

**Success Criteria**:
- [ ] Export panel opens as modal from editor menu
- [ ] Format selector: DOCX/TXT/PDF/Markdown with format-specific options
- [ ] Scope tree: volume/chapter hierarchy with multi-select
- [ ] Template dropdown loads user templates, selection fills format options
- [ ] "存为模板" button opens naming dialog (max 30 chars, checks 20 limit)
- [ ] Export button triggers async task, shows progress bar (0-100%)
- [ ] Task done: shows download button + 7-day expiry notice
- [ ] Task failed: shows error message + retry button
- [ ] History section: last 10 exports with time/format/size/download link

**Steps**:
- [ ] Write failing tests for ExportPanel interactions
- [ ] Implement `useExportTask` hook for polling task status
- [ ] Implement ExportPanel modal with format selector and scope tree
- [ ] Implement progress bar with status text
- [ ] Implement download button with expiry display
- [ ] Implement history list component
- [ ] Run tests until green, commit

---

### Task 7: FE US-5.2/5.5 Backup & Restore Panel

**Category**: `visual-engineering`

**Files**: `BackupRestorePanel.tsx`, `BackupList.tsx`, `RestoreModal.tsx`, `useBackupList.ts`

**Success Criteria**:
- [ ] BackupRestorePanel renders in project settings "备份与恢复" tab
- [ ] Auto backup list shows time/size/download for each
- [ ] "手动备份" button triggers backup, shows progress bar
- [ ] "从备份恢复" button opens RestoreModal
- [ ] ZIP upload, shows preview: project name, chars, chapters, KB entries, date
- [ ] Mode selector: "创建为新项目" (simple confirm) vs "覆盖当前项目" (name input confirm)
- [ ] Archived project shows "自动备份已暂停" notice

**Steps**:
- [ ] Write failing tests for backup/restore interactions
- [ ] Implement BackupList component with auto/manual tabs
- [ ] Implement RestoreModal with ZIP upload and preview
- [ ] Implement mode selection and confirmation flow
- [ ] Integrate into ProjectSettingsPage backup tab
- [ ] Run tests until green, commit

---

### Task 8: FE US-5.4 KB Export/Import UI

**Category**: `visual-engineering`

**Files**: `KBExportModal.tsx`, `KBImportModal.tsx`, `ConflictResolver.tsx`, `useKBCreate.ts`

**Success Criteria**:
- [ ] KB panel "更多菜单" has "导出知识库" and "导入知识库" items
- [ ] Export modal: scope selector (all/types/items), type checkboxes, progress
- [ ] Export produces JSON download
- [ ] Import modal: JSON file upload, shows conflict count
- [ ] ConflictResolver: per-item list with skip/overwrite/keep_both buttons
- [ ] After resolution: shows toast with imported/skipped/overwritten/renamed counts

**Steps**:
- [ ] Write failing tests for KB export/import flow
- [ ] Implement KBExportModal with scope selector
- [ ] Implement KBImportModal with file upload
- [ ] Implement ConflictResolver with per-item strategy selection
- [ ] Run tests until green, commit

---

## Atomic Commit Strategy

Each task produces 1 commit (RED test commit + GREEN implementation commit = 2 commits per task minimum).

**Commit Message Format**:
```
feat(BE): us51_export add async export task with 4 format generators

feat(BE): us53_templates add user-level template CRUD with 20 limit

feat(FE): us51_export add export panel with progress tracking

feat(FE): us54_kb add KB export/import UI with conflict resolver
```

**Commit Order by Task**:
1. `feat(BE): epic-5 infrastructure add state counters and export_tasks` (main.py change)
2. `feat(BE): us53_templates add template CRUD`
3. `feat(BE): us51_export add async export with format generators`
4. `feat(BE): us54_kb_transfer add KB JSON export/import with conflict detection`
5. `feat(BE): us52_backup add auto backup scheduler with 7-day retention`
6. `feat(BE): us55_restore add project backup ZIP restore with 2 modes`
7. `feat(FE): epic-5 add epic-5 feature hooks`
8. `feat(FE): us51_export add export panel UI`
9. `feat(FE): us52_backup add backup/restore panel UI`
10. `feat(FE): us54_kb add KB export/import UI`
11. `chore: epic-5 add MSW handlers for epic-5 API mocking`

---

## Test Approach (TDD Mandatory)

### BE Tests (Python/pytest + TestClient)

**RED Pattern**: Write failing test first, implement minimal code to pass.

```
workspace/server/tests/epic_5/
├── conftest.py              # Seeds: export_tasks, export_templates, backups, kb_exports
├── test_us51_export_red.py  # 8-10 test cases
├── test_us52_backup_red.py # 6-8 test cases
├── test_us53_templates_red.py # 8 test cases
├── test_us54_kb_transfer_red.py # 10-12 test cases
└── test_us55_restore_red.py # 8-10 test cases
```

**Key test scenarios**:
- Unauthenticated requests → 401
- Project not found → 404
- Permission denied (not owner) → 403
- Invalid format/options → 422
- Task status transitions: pending→generating→done
- Export file expiry: valid for 7 days, expired → 410
- Template 20-limit: 21st template → 409
- KB import conflict: skip/overwrite/keep_both strategies
- Restore: create_new vs overwrite mode
- Restore: invalid ZIP → error message

### FE Tests (Vitest + Testing Library + MSW)

**Pattern**: `src/features/epic-5/__tests__/ComponentName.test.tsx`

**MSW Handlers** added to `src/mocks/handlers.ts`:
```typescript
http.post('/api/projects/:projectId/exports', ...),
http.get('/api/projects/:projectId/exports/:taskId', ...),
http.get('/api/projects/:projectId/exports/:taskId/download', ...),
http.post('/api/me/export-templates', ...),
http.get('/api/me/export-templates', ...),
// etc.
```

---

## Coverage Target

| Layer | Target |
|-------|--------|
| BE | ≥ 73% line coverage (likely 85%+ given thorough happy-path + error cases) |
| FE | All component tests pass, hooks tested individually |

---

## Key Files Reference

| Purpose | Path |
|---------|------|
| BE auth pattern | `workspace/server/main.py:208-212` (`_require_user_id`) |
| BE error pattern | `workspace/server/main.py:143-158` (`_error`) |
| BE route registration | `workspace/server/main.py:696-704` |
| BE async context | `workspace/server/main.py:48-52` (`lifespan`) |
| BE notification category | `workspace/server/routes/us66_notifications.py:8-19` |
| FE modal pattern | `workspace/apps/web/src/features/epic-1/components/CreateProjectModal.tsx:86-91` |
| FE settings tabs | `workspace/apps/web/src/features/epic-1/components/ProjectSettingsPage.tsx:163-168` |
| FE API client | `workspace/apps/web/src/api/client.ts` |
| FE useApi hook | `workspace/apps/web/src/hooks/useApi.ts` |
| BE test conftest | `workspace/server/tests/conftest.py` |
| FE test setup | `workspace/apps/web/src/test/setup.ts` |
| Contract types | `specs/epic-5/contract.md` |
| NFR constraints | `process/CONSTRAINTS.md:37-40` |
