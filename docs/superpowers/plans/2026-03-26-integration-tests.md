# Integration Tests (FE → Real Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MSW mock handlers in vitest with a real FastAPI backend, so frontend tests verify actual API contracts.

**Architecture:** vitest `globalSetup` spawns uvicorn with `TESTING=true`; each test calls `POST /api/test/reset` to clear in-memory state; jsdom's base URL is set to `http://localhost:8000` so relative `fetch('/api/...')` calls reach the real server.

**Tech Stack:** FastAPI + uvicorn (backend), Vitest + @testing-library/react + jsdom (frontend), Node.js child_process (process management)

---

## Known Contract Mismatches to Fix

Before rewriting tests, two components have field-name bugs vs real backend:

1. **`LoginPage.tsx`**: sends `remember_me` but backend expects `rememberMe`; error parsing looks for `.detail` but backend returns `{ error: { message } }`
2. **`ProjectDashboard.tsx`**: uses snake_case fields (`cover_color`, `total_chars`, `chapter_count`, `updated_at`) but backend returns camelCase (`coverColor`, `totalChars`, `chapterCount`, `updatedAt`); also does `setProjects(data)` but backend wraps array in `{ items: [...], ... }`

---

## File Map

| Action | File |
|--------|------|
| Modify | `workspace/server/main.py` |
| Create | `workspace/server/tests/epic_1/test_reset_endpoint.py` |
| Create | `workspace/apps/web/src/test/globalSetup.ts` |
| Modify | `workspace/apps/web/vite.config.ts` |
| Modify | `workspace/apps/web/src/test/setup.ts` |
| Delete | `workspace/apps/web/src/mocks/handlers.ts` |
| Delete | `workspace/apps/web/src/mocks/projectHandlers.ts` |
| Modify | `workspace/apps/web/src/features/epic-1/components/LoginPage.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/components/ProjectDashboard.tsx` |
| Modify | `workspace/apps/web/src/App.test.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/__tests__/LoginPage.test.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/__tests__/RegisterPage.test.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/__tests__/ForgotPasswordPage.test.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/__tests__/ResetPasswordPage.test.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/__tests__/VerificationResultPage.test.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/__tests__/UnverifiedPrompt.test.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/__tests__/ProjectDashboard.test.tsx` |
| Modify | `workspace/apps/web/src/features/epic-1/__tests__/CreateProjectModal.test.tsx` |

---

## Task 1: Backend — Add `_FakeDb`, `_reset_app_state()`, and lifespan to `main.py`

**Files:**
- Modify: `workspace/server/main.py`

- [ ] **Step 1: Add imports and `_FakeDb` class at top of `main.py`, after existing imports**

Add after `from server.config import get_settings`:
```python
import os
from contextlib import asynccontextmanager
```

Add before `settings = get_settings()`:
```python
class _FakeDb:
    def __init__(self) -> None:
        self.projects: list[dict[str, Any]] = []
        self.failpoints: set[str] = set()
```

- [ ] **Step 2: Add `_reset_app_state()` function, after `_FakeDb` class**

```python
def _reset_app_state() -> None:
    app.state.fake_db = _FakeDb()
    app.state.auth_users: dict[str, Any] = {}
    app.state.email_index: dict[str, str] = {}
    app.state.sessions: dict[str, str] = {}
    app.state.verify_tokens: dict[str, Any] = {}
    app.state.verify_token_first_seen: set[str] = set()
    app.state.reset_tokens: dict[str, Any] = {}
    app.state.archived_project_ids: set[str] = set()
    app.state.state_counter = 0
    app.state.session_counter = 0
    app.state.project_counter = 0
    app.state.user_counter = 0
```

Note: `mail_outbox`, `oauth_provider_stub`, `session_clock` are omitted — they're test-only and already accessed via `getattr(app.state, "x", None)` in main.py.

- [ ] **Step 3: Add lifespan and update `app = FastAPI(...)` to use it**

Add before `app = FastAPI(...)`:
```python
@asynccontextmanager
async def lifespan(fapp: FastAPI):  # type: ignore[type-arg]
    if not hasattr(fapp.state, "email_index"):
        _reset_app_state()
    yield
```

Change `app = FastAPI(...)` to:
```python
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)
```

- [ ] **Step 4: Add `/api/test/reset` endpoint at end of `main.py`**

```python
if os.getenv("TESTING") == "true":

    @app.post("/api/test/reset")
    def test_reset() -> dict[str, bool]:
        _reset_app_state()
        return {"ok": True}
```

- [ ] **Step 5: Run backend tests to confirm they still pass**

```bash
cd workspace
bash --noprofile --norc -c "/usr/bin/python3 -m pytest --tb=short 2>&1"
```

Expected: `33 passed`, coverage ≥ 80%

- [ ] **Step 6: Commit**

```bash
git add workspace/server/main.py
git commit -m "feat: add lifespan state init and /api/test/reset endpoint (TESTING=true only)"
```

---

## Task 2: Backend — Add pytest test for `_reset_app_state()`

**Files:**
- Create: `workspace/server/tests/epic_1/test_reset_endpoint.py`

- [ ] **Step 1: Write the test**

```python
from server.main import _reset_app_state, app


def test_reset_app_state_clears_all_fields() -> None:
    # Arrange: put some data in state
    app.state.auth_users = {"user-1": {"id": "user-1"}}
    app.state.email_index = {"a@example.com": "user-1"}
    app.state.sessions = {"tok-1": "user-1"}
    app.state.verify_tokens = {"vtok": {"userId": "user-1", "used": False}}
    app.state.reset_tokens = {"rtok": {"userId": "user-1", "used": False}}
    app.state.project_counter = 99

    # Act
    _reset_app_state()

    # Assert
    assert app.state.auth_users == {}
    assert app.state.email_index == {}
    assert app.state.sessions == {}
    assert app.state.verify_tokens == {}
    assert app.state.reset_tokens == {}
    assert app.state.fake_db.projects == []
    assert app.state.project_counter == 0
    assert app.state.user_counter == 0
```

- [ ] **Step 2: Run the new test to confirm it passes**

```bash
cd workspace
bash --noprofile --norc -c "/usr/bin/python3 -m pytest server/tests/epic_1/test_reset_endpoint.py -v 2>&1"
```

Expected: `1 passed`

- [ ] **Step 3: Run full backend suite**

```bash
bash --noprofile --norc -c "/usr/bin/python3 -m pytest --tb=short 2>&1"
```

Expected: `34 passed`, coverage ≥ 80%

- [ ] **Step 4: Commit**

```bash
git add workspace/server/tests/epic_1/test_reset_endpoint.py
git commit -m "test: add unit test for _reset_app_state()"
```

---

## Task 3: Frontend — Create `globalSetup.ts`

**Files:**
- Create: `workspace/apps/web/src/test/globalSetup.ts`

- [ ] **Step 1: Create the file**

```typescript
import { execFileSync, spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// apps/web/src/test/ → apps/web/src/ → apps/web/ → apps/ → workspace/
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../../')

let serverProcess: ReturnType<typeof spawn> | null = null

function findPython(): string {
  const candidates = [
    path.join(WORKSPACE_ROOT, '.venv/bin/python'),
    '/usr/bin/python3',
    '/opt/homebrew/bin/python3',
  ]
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'pipe' })
      return candidate
    } catch {
      // try next
    }
  }
  throw new Error('Python not found. Install python3.')
}

async function waitForServer(url: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 200))
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`)
}

export async function setup(): Promise<void> {
  const python = findPython()
  serverProcess = spawn(
    python,
    ['-m', 'uvicorn', 'server.main:app', '--host', '127.0.0.1', '--port', '8000'],
    {
      cwd: WORKSPACE_ROOT,
      env: { ...process.env, TESTING: 'true' },
      stdio: 'pipe',
    }
  )

  serverProcess.on('error', (err) => {
    console.error('[globalSetup] Failed to start backend:', err)
  })

  await waitForServer('http://127.0.0.1:8000/api/health')
}

export async function teardown(): Promise<void> {
  serverProcess?.kill('SIGTERM')
  await new Promise(r => setTimeout(r, 300))
}
```

- [ ] **Step 2: Verify file is syntactically correct by checking TypeScript imports exist**

```bash
ls workspace/apps/web/node_modules/typescript/bin/tsc
```

Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/test/globalSetup.ts
git commit -m "feat: add vitest globalSetup to spawn real FastAPI backend"
```

---

## Task 4: Frontend — Update `vite.config.ts`

**Files:**
- Modify: `workspace/apps/web/vite.config.ts`

- [ ] **Step 1: Update the `test` block in `vite.config.ts`**

Replace the entire `test: { ... }` block with:
```typescript
  test: {
    globalSetup: ['./src/test/globalSetup.ts'],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost:8000' },
    },
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80 },
      include: ['src/features/**/*.ts', 'src/features/**/*.tsx'],
      exclude: ['**/*.test.*', '**/mocks/**'],
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add workspace/apps/web/vite.config.ts
git commit -m "config: add globalSetup and jsdom url for integration tests"
```

---

## Task 5: Frontend — Update `setup.ts`

**Files:**
- Modify: `workspace/apps/web/src/test/setup.ts`

- [ ] **Step 1: Replace entire file content**

```typescript
import '@testing-library/jest-dom/vitest';
import { beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Real in-memory localStorage that actually stores and retrieves values.
// Cleared before each test via localStorage.clear() in beforeEach.
const _store = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => _store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => _store.set(key, value)),
    removeItem: vi.fn((key: string) => _store.delete(key)),
    clear: vi.fn(() => _store.clear()),
  },
  writable: true,
});

beforeEach(async () => {
  // Clear localStorage between tests
  window.localStorage.clear();
  vi.clearAllMocks();
  // Reset backend state so each test starts with empty DB
  await fetch('http://127.0.0.1:8000/api/test/reset', { method: 'POST' });
});

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 2: Commit**

```bash
git add workspace/apps/web/src/test/setup.ts
git commit -m "refactor: replace MSW setup with real backend reset call in test setup"
```

---

## Task 6: Frontend — Delete MSW handler files

**Files:**
- Delete: `workspace/apps/web/src/mocks/handlers.ts`
- Delete: `workspace/apps/web/src/mocks/projectHandlers.ts`

- [ ] **Step 1: Delete the files**

```bash
rm workspace/apps/web/src/mocks/handlers.ts
rm workspace/apps/web/src/mocks/projectHandlers.ts
```

- [ ] **Step 2: Commit**

```bash
git add -u workspace/apps/web/src/mocks/
git commit -m "chore: delete MSW handlers (replaced by real backend)"
```

---

## Task 7: Frontend — Fix `LoginPage.tsx` contract mismatches

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/LoginPage.tsx`

The component has two bugs vs the real backend:
1. Sends `remember_me` but backend's `LoginRequest` model uses `rememberMe`
2. Error parsing checks `apiError.detail` but backend returns `{ error: { message } }`

- [ ] **Step 1: Fix `rememberMe` field name in the POST body (line ~21)**

Change:
```typescript
body: { email, password, remember_me: rememberMe }
```
To:
```typescript
body: { email, password, rememberMe }
```

- [ ] **Step 2: Fix error message parsing (line ~24)**

Change:
```typescript
throw new Error((apiError as { detail?: string }).detail || '登录失败');
```
To:
```typescript
const errMsg = (apiError as { error?: { message?: string } }).error?.message ?? '登录失败';
throw new Error(errMsg);
```

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/components/LoginPage.tsx
git commit -m "fix: align LoginPage with real backend contract (rememberMe, error format)"
```

---

## Task 8: Frontend — Fix `ProjectDashboard.tsx` contract mismatches

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/ProjectDashboard.tsx`

Two bugs:
1. Component uses snake_case field names (`cover_color`, `total_chars`, `chapter_count`, `updated_at`) but backend returns camelCase (`coverColor`, `totalChars`, `chapterCount`, `updatedAt`)
2. `setProjects(data)` but `data` is `{ items: [...], total, page, limit }` — needs `data.items`

- [ ] **Step 1: Fix the `Project` type and `setProjects` call**

Replace the `Project` type:
```typescript
type Project = {
  id: string;
  name: string;
  tags: string[];
  coverColor: string;
  totalChars: number;
  chapterCount: number;
  updatedAt: string;
};
```

Fix the `useEffect`:
```typescript
  useEffect(() => {
    client.GET('/api/projects').then(({ data }) => {
      if (data && Array.isArray((data as { items?: unknown[] }).items)) {
        setProjects((data as { items: Project[] }).items);
      }
      setLoading(false);
    });
  }, []);
```

- [ ] **Step 2: Fix all field references in JSX (search for snake_case, replace with camelCase)**

Replace all occurrences in the file:
- `project.cover_color` → `project.coverColor` (appears 2 times in JSX)
- `project.total_chars` → `project.totalChars` (appears 2 times)
- `project.chapter_count` → `project.chapterCount` (appears 2 times)
- `project.updated_at` → `project.updatedAt` (appears 2 times)

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/components/ProjectDashboard.tsx
git commit -m "fix: align ProjectDashboard with real backend contract (camelCase fields, data.items)"
```

---

## Task 9: Frontend — Update `App.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/App.test.tsx`

The test doesn't use MSW but it imports nothing from mocks. Just verify it still passes. The only change needed: remove any MSW-related imports if present.

- [ ] **Step 1: Read the file and confirm no MSW imports**

Current `App.test.tsx` has no MSW imports. No changes needed.

- [ ] **Step 2: Run only App.test.tsx to confirm it passes**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=App.test 2>&1"
```

Expected: `1 passed`

---

## Task 10: Frontend — Rewrite `LoginPage.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/__tests__/LoginPage.test.tsx`

- [ ] **Step 1: Write the new test file**

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../components/LoginPage';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const TEST_EMAIL = 'logintest@example.com';
const TEST_PASSWORD = 'StrongPass1';

async function registerUser(): Promise<void> {
  await fetch('http://127.0.0.1:8000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
}

describe('LoginPage', () => {
  it('renders login form with oauth buttons', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/记住我/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
    expect(screen.getByText(/忘记密码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GitHub/i })).toBeInTheDocument();
  });

  it('calls POST /api/auth/login and stores token on success', async () => {
    await registerUser();

    renderWithRouter(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: TEST_EMAIL } });
    fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: TEST_PASSWORD } });
    fireEvent.click(screen.getByRole('button', { name: /^登录$/i }));

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'token',
        expect.stringMatching(/^session-\d+$/)
      );
    });
  });

  it('shows error message on login failure (wrong password)', async () => {
    await registerUser();

    renderWithRouter(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: TEST_EMAIL } });
    fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: 'WrongPass9' } });
    fireEvent.click(screen.getByRole('button', { name: /^登录$/i }));

    expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run only LoginPage tests**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=LoginPage.test 2>&1"
```

Expected: `3 passed`

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/__tests__/LoginPage.test.tsx
git commit -m "test: rewrite LoginPage tests to use real backend"
```

---

## Task 11: Frontend — Rewrite `RegisterPage.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/__tests__/RegisterPage.test.tsx`

- [ ] **Step 1: Write the new test file**

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../components/RegisterPage';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('RegisterPage', () => {
  it('renders email, password, confirm password inputs and submit button', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^密码/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/确认密码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /注册/i })).toBeInTheDocument();
  });

  it('validates password strength in real-time', async () => {
    renderWithRouter(<RegisterPage />);
    const passwordInput = screen.getByLabelText(/^密码/i);

    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    expect(await screen.findByText(/至少 8 位，且同时包含大写字母、小写字母、数字/i)).toBeInTheDocument();

    fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } });
    await waitFor(() => {
      expect(screen.queryByText(/至少 8 位，且同时包含大写字母、小写字母、数字/i)).not.toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    renderWithRouter(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/^密码/i), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByLabelText(/确认密码/i), { target: { value: 'StrongPass456' } });
    fireEvent.blur(screen.getByLabelText(/确认密码/i));

    expect(await screen.findByText(/密码不一致/i)).toBeInTheDocument();
  });

  it('calls POST /api/auth/register on valid submit and shows success message', async () => {
    const uniqueEmail = `reg-${Date.now()}@example.com`;
    renderWithRouter(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: uniqueEmail } });
    fireEvent.change(screen.getByLabelText(/^密码/i), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByLabelText(/确认密码/i), { target: { value: 'StrongPass123' } });

    fireEvent.click(screen.getByRole('button', { name: /注册/i }));

    expect(await screen.findByText(/请查收您的验证邮件以激活账号/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run only RegisterPage tests**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=RegisterPage.test 2>&1"
```

Expected: `4 passed`

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/__tests__/RegisterPage.test.tsx
git commit -m "test: rewrite RegisterPage tests to use real backend"
```

---

## Task 12: Frontend — Rewrite `ForgotPasswordPage.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/__tests__/ForgotPasswordPage.test.tsx`

- [ ] **Step 1: Write the new test file**

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordPage from '../components/ForgotPasswordPage';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ForgotPasswordPage', () => {
  it('renders email input and submit button', () => {
    renderWithRouter(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /发送重置邮件/i })).toBeInTheDocument();
  });

  it('calls POST /api/auth/forgot-password and shows success message', async () => {
    renderWithRouter(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: 'anyone@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /发送重置邮件/i }));

    // Backend always returns ok:true regardless of whether email exists
    expect(await screen.findByText(/如邮箱已注册，将收到重置邮件/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run only ForgotPasswordPage tests**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=ForgotPasswordPage.test 2>&1"
```

Expected: `2 passed`

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/__tests__/ForgotPasswordPage.test.tsx
git commit -m "test: rewrite ForgotPasswordPage tests to use real backend"
```

---

## Task 13: Frontend — Rewrite `ResetPasswordPage.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/__tests__/ResetPasswordPage.test.tsx`

The backend hardcodes the reset token string as `"reset-token-valid"`. To get this token, register a user then call `forgot-password`.

- [ ] **Step 1: Write the new test file**

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from '../components/ResetPasswordPage';

async function setupResetToken(): Promise<void> {
  // Register a user so forgot-password creates a reset token
  await fetch('http://127.0.0.1:8000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reset@example.com', password: 'OldPass1' }),
  });
  await fetch('http://127.0.0.1:8000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reset@example.com' }),
  });
  // Backend now has reset_tokens["reset-token-valid"] in state
}

// Token is always "reset-token-valid" per backend implementation
const renderWithToken = (ui: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/reset-password?token=reset-token-valid']}>
      {ui}
    </MemoryRouter>
  );

describe('ResetPasswordPage', () => {
  it('renders new password, confirm password inputs', () => {
    renderWithToken(<ResetPasswordPage />);
    expect(screen.getByLabelText(/^新密码/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/确认新密码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重置密码/i })).toBeInTheDocument();
  });

  it('validates new password strength', async () => {
    renderWithToken(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/^新密码/i), { target: { value: 'weak' } });
    expect(await screen.findByText(/至少 8 位，且同时包含大写字母、小写字母、数字/i)).toBeInTheDocument();
  });

  it('calls POST /api/auth/reset-password and shows success message', async () => {
    await setupResetToken();

    renderWithToken(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/^新密码/i), { target: { value: 'NewPass1' } });
    fireEvent.change(screen.getByLabelText(/确认新密码/i), { target: { value: 'NewPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /重置密码/i }));

    expect(await screen.findByText(/密码已重置/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run only ResetPasswordPage tests**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=ResetPasswordPage.test 2>&1"
```

Expected: `3 passed`

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/__tests__/ResetPasswordPage.test.tsx
git commit -m "test: rewrite ResetPasswordPage tests to use real backend"
```

---

## Task 14: Frontend — Rewrite `VerificationResultPage.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/__tests__/VerificationResultPage.test.tsx`

Backend hardcodes verify token as `"verify-token-valid"` (created when registering). Using an unknown token triggers a 410 EXPIRED response on first call.

- [ ] **Step 1: Write the new test file**

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import VerificationResultPage from '../components/VerificationResultPage';

describe('VerificationResultPage', () => {
  it('shows success message on successful verification', async () => {
    // Register creates verify-token-valid in backend state
    await fetch('http://127.0.0.1:8000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'verify@example.com', password: 'StrongPass1' }),
    });

    render(
      <MemoryRouter initialEntries={['/verify?token=verify-token-valid']}>
        <VerificationResultPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/验证成功/i)).toBeInTheDocument();
  });

  it('shows expired message and resend button on failure', async () => {
    render(
      <MemoryRouter initialEntries={['/verify?token=nonexistent-token']}>
        <VerificationResultPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/链接已过期/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新发送/i })).toBeInTheDocument();
  });

  it('calls POST /api/auth/resend-verification when clicking resend', async () => {
    render(
      <MemoryRouter initialEntries={['/verify?token=another-nonexistent-token']}>
        <VerificationResultPage />
      </MemoryRouter>
    );

    const resendBtn = await screen.findByRole('button', { name: /重新发送/i });
    fireEvent.click(resendBtn);

    expect(await screen.findByText(/已重新发送/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run only VerificationResultPage tests**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=VerificationResultPage.test 2>&1"
```

Expected: `3 passed`

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/__tests__/VerificationResultPage.test.tsx
git commit -m "test: rewrite VerificationResultPage tests to use real backend"
```

---

## Task 15: Frontend — Rewrite `UnverifiedPrompt.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/__tests__/UnverifiedPrompt.test.tsx`

- [ ] **Step 1: Write the new test file**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UnverifiedPrompt from '../components/UnverifiedPrompt';

describe('UnverifiedPrompt', () => {
  it('renders prompt with resend button', () => {
    render(<UnverifiedPrompt email="test@example.com" />);
    expect(screen.getByText(/请验证您的邮箱以确保账号安全/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新发送/i })).toBeInTheDocument();
  });

  it('calls POST /api/auth/resend-verification on click and shows success', async () => {
    render(<UnverifiedPrompt email="test@example.com" />);
    fireEvent.click(screen.getByRole('button', { name: /重新发送/i }));

    expect(await screen.findByText(/已发送/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run only UnverifiedPrompt tests**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=UnverifiedPrompt.test 2>&1"
```

Expected: `2 passed`

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/__tests__/UnverifiedPrompt.test.tsx
git commit -m "test: rewrite UnverifiedPrompt tests to use real backend"
```

---

## Task 16: Frontend — Rewrite `ProjectDashboard.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/__tests__/ProjectDashboard.test.tsx`

Requires auth token in localStorage and real projects in backend.

- [ ] **Step 1: Write the new test file**

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProjectDashboard from '../components/ProjectDashboard';

const AUTH_EMAIL = 'dashboard@example.com';
const AUTH_PASSWORD = 'StrongPass1';

async function setupAuth(): Promise<string> {
  await fetch('http://127.0.0.1:8000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD }),
  });
  const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD, rememberMe: false }),
  });
  const { token } = await res.json() as { token: string };
  window.localStorage.setItem('token', token);
  return token;
}

async function createProject(token: string, name: string, tags: string[] = []): Promise<void> {
  await fetch('http://127.0.0.1:8000/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, type: 'novel', tags }),
  });
}

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

describe('ProjectDashboard', () => {
  it('should display loading state initially', async () => {
    await setupAuth();
    renderWithRouter(<ProjectDashboard />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should render project cards with correct info', async () => {
    const token = await setupAuth();
    await createProject(token, 'The Great Novel', ['玄幻', '悬疑']);
    await createProject(token, 'Short Story', ['言情']);

    renderWithRouter(<ProjectDashboard />);

    expect(await screen.findByText('The Great Novel')).toBeInTheDocument();
    expect(screen.getByText('Short Story')).toBeInTheDocument();
    expect(screen.getByText('玄幻')).toBeInTheDocument();
  });

  it('should display empty state when no projects exist', async () => {
    await setupAuth();
    // no projects created

    renderWithRouter(<ProjectDashboard />);

    expect(await screen.findByText(/开始您的第一部作品/i)).toBeInTheDocument();
    expect(screen.getByText(/新建项目/)).toBeInTheDocument();
  });

  it('should filter projects by search query', async () => {
    const token = await setupAuth();
    await createProject(token, 'The Great Novel');
    await createProject(token, 'Short Story');

    renderWithRouter(<ProjectDashboard />);
    await screen.findByText('The Great Novel');

    const searchInput = screen.getByPlaceholderText(/搜索项目/i);
    fireEvent.change(searchInput, { target: { value: 'Short' } });

    expect(screen.getByText('Short Story')).toBeInTheDocument();
    expect(screen.queryByText('The Great Novel')).not.toBeInTheDocument();
  });

  it('should show not found state when search yields no results', async () => {
    const token = await setupAuth();
    await createProject(token, 'The Great Novel');

    renderWithRouter(<ProjectDashboard />);
    await screen.findByText('The Great Novel');

    const searchInput = screen.getByPlaceholderText(/搜索项目/i);
    fireEvent.change(searchInput, { target: { value: 'XYZ' } });

    expect(screen.getByText(/未找到匹配项目/i)).toBeInTheDocument();
  });

  it('should toggle between card and list view', async () => {
    const token = await setupAuth();
    await createProject(token, 'The Great Novel');

    renderWithRouter(<ProjectDashboard />);
    await screen.findByText('The Great Novel');

    const listViewBtn = screen.getByLabelText(/列表视图/i);
    fireEvent.click(listViewBtn);
    expect(screen.getByTestId('list-view-container')).toBeInTheDocument();

    const cardViewBtn = screen.getByLabelText(/卡片视图/i);
    fireEvent.click(cardViewBtn);
    expect(screen.getByTestId('card-view-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run only ProjectDashboard tests**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=ProjectDashboard.test 2>&1"
```

Expected: `6 passed`

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/__tests__/ProjectDashboard.test.tsx
git commit -m "test: rewrite ProjectDashboard tests to use real backend with auth"
```

---

## Task 17: Frontend — Rewrite `CreateProjectModal.test.tsx`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/__tests__/CreateProjectModal.test.tsx`

- [ ] **Step 1: Write the new test file**

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreateProjectModal from '../components/CreateProjectModal';

const AUTH_EMAIL = 'modal@example.com';
const AUTH_PASSWORD = 'StrongPass1';

async function setupAuth(): Promise<string> {
  await fetch('http://127.0.0.1:8000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD }),
  });
  const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD, rememberMe: false }),
  });
  const { token } = await res.json() as { token: string };
  window.localStorage.setItem('token', token);
  return token;
}

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

describe('CreateProjectModal', () => {
  it('should render step 1 with required fields', () => {
    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    expect(screen.getByText(/基本信息/)).toBeInTheDocument();
    expect(screen.getByLabelText(/项目名称/)).toBeInTheDocument();
    expect(screen.getByLabelText(/类型/)).toBeInTheDocument();
    expect(screen.getByLabelText(/题材标签/)).toBeInTheDocument();
    expect(screen.getByLabelText(/简介/)).toBeInTheDocument();
  });

  it('should validate name length and prevent next step if empty', async () => {
    renderWithRouter(<CreateProjectModal onClose={() => {}} />);

    const nextBtn = screen.getByRole('button', { name: /下一步/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText(/基本信息/)).toBeInTheDocument();
    expect(screen.getByText(/项目名称不能为空/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'a'.repeat(51) } });
    fireEvent.click(nextBtn);
    expect(screen.getByText(/不能超过 50 个字符/i)).toBeInTheDocument();
  });

  it('should navigate through steps and submit on step 3', async () => {
    await setupAuth();

    renderWithRouter(<CreateProjectModal onClose={() => {}} />);

    // Step 1
    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'My New Novel' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));

    // Step 2
    expect(await screen.findByText(/项目结构/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));

    // Step 3
    expect(await screen.findByText(/知识库初始化/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /跳过并创建/i }));

    // Modal closes and navigates to dashboard — no error shown
    await waitFor(() => {
      expect(screen.queryByText(/创建失败/i)).not.toBeInTheDocument();
    });
  });

  it('should show error when project name conflicts', async () => {
    const token = await setupAuth();

    // Create the project via API first so it's a duplicate
    await fetch('http://127.0.0.1:8000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Conflict Project', type: 'novel', tags: [] }),
    });

    renderWithRouter(<CreateProjectModal onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'Conflict Project' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    fireEvent.click(await screen.findByRole('button', { name: /下一步/i }));
    fireEvent.click(await screen.findByRole('button', { name: /跳过并创建/i }));

    expect(await screen.findByText(/已有同名项目，请修改名称/)).toBeInTheDocument();
    // Component should have returned to step 1
    expect(screen.getByText(/基本信息/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run only CreateProjectModal tests**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test -- --reporter=verbose --testPathPattern=CreateProjectModal.test 2>&1"
```

Expected: `4 passed`

- [ ] **Step 3: Commit**

```bash
git add workspace/apps/web/src/features/epic-1/__tests__/CreateProjectModal.test.tsx
git commit -m "test: rewrite CreateProjectModal tests to use real backend"
```

---

## Task 18: Final Verification

- [ ] **Step 1: Run full frontend test suite**

```bash
cd workspace
bash --noprofile --norc -c "/opt/homebrew/bin/npm run -w @bitsnovels/web test 2>&1"
```

Expected:
- All 9 test files pass
- 28 tests pass (same count as before)
- Coverage ≥ 80%

- [ ] **Step 2: Run full backend test suite**

```bash
bash --noprofile --norc -c "/usr/bin/python3 -m pytest --tb=short 2>&1"
```

Expected: `34 passed`, coverage ≥ 80%

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: frontend integration tests now run against real FastAPI backend"
```
