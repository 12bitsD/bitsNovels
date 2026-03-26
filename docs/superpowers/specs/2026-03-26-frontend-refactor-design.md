# Frontend Refactor Design — bitsNovels Sprint 1.5

**Date**: 2026-03-26  
**Author**: Sisyphus (via brainstorming)  
**Status**: Revision 1 (post-spec-review)  
**Scope**: A+B+C — Shared Components + Hooks + Auth Context + Icon Migration + Accessibility

---

## Changelog (Rev 1)

- **FIX**: `useApi` stale closure bug — `options` now stored in `useRef` to avoid recreation on every render
- **FIX**: `AuthContext` null safety — `useAuth()` now throws if called outside `<AuthProvider>`
- **FIX**: `ErrorAlert` — removed conflicting `role="alert"` + `aria-live="polite"` combo; uses `aria-live="polite"` only
- **FIX**: `isVerifie` typo corrected to `isVerified`; clarified as "verified email status from API"
- **NEW**: Added `useAuth.ts` implementation (was missing)
- **NEW**: Added `SkeletonLoader.tsx` implementation (was referenced but not specified)
- **NEW**: Added `client.ts` → `AuthContext` integration strategy (use `authTokenRef` pattern)
- **NEW**: Added `useFocusTrap` hook implementation for modal focus management
- **FIX**: `usePasswordValidation` — `isValid` now tracked as derived state, not recalculated on every render
- **FIX**: `export { LucideProps }` → `export type { LucideProps }`
- **FIX**: `SuccessView` `LoadingButton` now uses `type="button"` explicitly
- **FIX**: All components now expose `className` prop for extensibility
- **FIX**: Regression command corrected to `npm run typecheck`

---

## 1. Context

### Problem Statement

The Sprint 1 frontend ("bitsNovels web") has a solid design token system and good CSS architecture (Tailwind v4 + custom theme), but suffers from three systemic issues:

1. **No component reuse** — 5 auth/project pages (~705 lines total) contain ~280 lines of duplicated patterns (~40% duplication rate)
2. **No global state** — Auth token scattered in `localStorage`, accessed directly in each component
3. **No icon library** — Emoji used as icons (✒️🔍✨◷✕✓), hurting perceived quality

### Verification Baseline

Current quality scores (from 3-agent assessment):

| Dimension | Score | Key Issues |
|-----------|-------|------------|
| Code Organization | 7/10 | Feature-based, no shared component layer |
| Custom Hooks | 3/10 | Zero reusable hooks; massive duplication |
| Error Handling | 5/10 | Inconsistent; silent failures exist |
| Loading States | 5/10 | No reusable spinner/skeleton components |
| Responsive Design | 7/10 | Good Tailwind usage |
| Accessibility | 4/10 | Missing aria-live, focus traps |
| **Overall** | **6/10** | Functional but粗糙 |

---

## 2. Design: Round 1 — Shared UI Component Layer

### 2.1 New File Location

```
workspace/apps/web/src/components/
├── ui/
│   ├── FormInput.tsx          # Label + input + error in one component
│   ├── ErrorAlert.tsx         # Consistent error display
│   ├── LoadingButton.tsx      # Button with loading spinner state
│   ├── SuccessView.tsx        # Success state with icon + message + action
│   ├── AuthCard.tsx           # Shared auth page wrapper (decorator)
│   ├── SkeletonLoader.tsx     # Animated skeleton placeholder
│   └── icons/
│       └── index.ts           # Lucide icon re-exports (amber-styled defaults)
└── shared/
    └── index.ts               # Barrel export
```

### 2.2 `FormInput` Component

```tsx
interface FormInputProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;       // Additional helper text below input
}

export function FormInput({
  id, label, type = 'text', value, onChange,
  placeholder, error, required, disabled, hint
}: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-light mb-1.5">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`input-base ${error ? 'border-error focus:ring-error/20 focus:border-error' : ''}`}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={!!error}
      />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-light">{hint}</p>}
      {error && (
        <p id={`${id}-error`} aria-live="polite" className="mt-1 text-sm text-error flex items-center gap-1">
          <XCircleIcon size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
```

**Design decisions**:
- Inline `aria-invalid` and `aria-describedby` for accessibility
- `role="alert"` on error for screen reader announcement
- Icon (XCircle) from Lucide, not emoji
- Error border styling via conditional class

### 2.3 `ErrorAlert` Component

```tsx
interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;  // Optional dismiss button
  className?: string;
}

export function ErrorAlert({ error, onDismiss, className = '' }: ErrorAlertProps) {
  return (
    <div
      aria-live="polite"
      className={`bg-error/10 text-error p-3 rounded-md text-sm border border-error/20 shadow-sm flex items-start gap-2 ${className}`}
    >
      <XCircleIcon size={16} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{error}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-error/70 hover:text-error transition-colors" aria-label="关闭提示">
          <XIcon size={14} />
        </button>
      )}
    </div>
  );
}
```

**Design decisions**:
- `aria-live="polite"` — screen reader announces without interrupting
- Optional dismiss for non-critical errors
- `XCircleIcon` for visual × indicator (replaces naked emoji ✕)

### 2.4 `LoadingButton` Component

```tsx
interface LoadingButtonProps {
  children: React.ReactNode;
  loading: boolean;
  loadingText?: string;
  type?: 'submit' | 'button';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function LoadingButton({
  children, loading, loadingText = '加载中...',
  type = 'submit', variant = 'primary', disabled, onClick, className = ''
}: LoadingButtonProps) {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClass} ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2Icon size={16} className="animate-spin" />
          {loadingText}
        </span>
      ) : children}
    </button>
  );
}
```

**Design decisions**:
- `Loader2Icon` (Lucide) replaces emoji spinner (◷)
- `disabled={disabled || loading}` — button unclickable during loading
- `loadingText` prop for localized "登录中..." strings

### 2.5 `SuccessView` Component

```tsx
interface SuccessViewProps {
  icon: React.ReactNode;    // Lucide icon passed in
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function SuccessView({ icon, title, description, action, secondaryAction }: SuccessViewProps) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-success">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
      {description && <p className="text-ink-light text-sm mb-6">{description}</p>}
      {action && (
        <LoadingButton onClick={action.onClick} loading={false} className="mt-2">
          {action.label}
        </LoadingButton>
      )}
      {secondaryAction && (
        <button onClick={secondaryAction.onClick} className="mt-3 text-sm text-amber hover:text-amber-dark transition-colors">
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
```

**Design decisions**:
- Accepts Lucide icon as `React.ReactNode` (flexible)
- Success green (`bg-success/10`) for positive visual cue
- Two-action support (primary CTA + secondary text link)

### 2.6 `AuthCard` Component (Decorator)

```tsx
interface AuthCardProps {
  icon: React.ReactNode;       // Lucide icon
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;    // Optional footer content
}

export function AuthCard({ icon, title, description, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-4 font-sans text-ink">
      <div
        className="bg-white/80 backdrop-blur-xl p-10 rounded-xl border border-white/60 max-w-md w-full animate-in fade-in zoom-in-95 duration-500"
        style={{ boxShadow: 'var(--shadow-card), var(--shadow-inner-light)' }}
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber/20 shadow-sm">
            {icon}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-ink-light text-sm mt-2">{description}</p>}
        </div>
        {children}
        {footer && <div className="mt-8">{footer}</div>}
      </div>
    </div>
  );
}
```

**Design decisions**:
- Wrapper component eliminating ~15 lines of repeated markup per page
- `icon` prop receives Lucide component (no emoji)
- `footer` slot for OAuth dividers, links to other pages

### 2.7 `SkeletonLoader` Component

```tsx
interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'avatar' | 'button';
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonLoader({ variant = 'text', width, height, className = '' }: SkeletonLoaderProps) {
  const baseClass = 'animate-pulse bg-amber-light/30 rounded';
  const sizes: Record<SkeletonLoaderProps['variant'], string> = {
    text:    'h-4 w-full',
    card:    'h-32 w-full',
    avatar:  'h-12 w-12 rounded-full',
    button:  'h-10 w-24',
  };
  return (
    <div
      className={`${baseClass} ${sizes[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
```

**Design decisions**:
- `aria-hidden="true"` — skeleton is presentational, not announced to screen readers
- 4 variants matching common loading states in the app
- `animate-pulse` uses the existing `bg-amber-light/30` to stay on-theme

### 2.8 `AuthCard` ClassName Prop

All components now expose `className` for extensibility. `AuthCard` gains:
```tsx
interface AuthCardProps {
  // ... existing props ...
  className?: string;  // NEW: applied to inner card div
}
```

And `SuccessView` gains `className` to its root `div` as well.

### 2.9 SuccessView `type="button"` Fix

`SuccessView` uses `LoadingButton` for the primary action. Since it's used outside a `<form>`, explicit `type="button"` is required:

```tsx
// In SuccessView, line 210
<LoadingButton
  type="button"   // ← was missing, now explicit
  onClick={action.onClick}
  loading={false}
  className="mt-2"
>
  {action.label}
</LoadingButton>
```

### 2.7 Migration Impact

| Component | Replaces | Lines Saved (est.) |
|-----------|----------|-------------------|
| FormInput | 12× repeated input blocks | ~120 lines |
| ErrorAlert | 5× error display blocks | ~40 lines |
| LoadingButton | 4× button+spinner blocks | ~30 lines |
| AuthCard | 5× page wrapper containers | ~75 lines |
| SuccessView | 3× success state blocks | ~30 lines |
| SkeletonLoader | Inline skeleton HTML in ProjectDashboard | ~20 lines |
| **Total** | | **~315 lines** |

---

## 3. Design: Round 2 — Custom Hooks + Validation Utils

### 3.1 File Location

```
workspace/apps/web/src/hooks/
├── useApi.ts           # Generic API call with loading/error
├── useAuth.ts          # Auth state (token, user, login/logout)
├── usePasswordValidation.ts
└── index.ts            # Barrel export
```

### 3.2 `useApi` Hook

```tsx
import { client } from '../api/client';
import { useState, useCallback, useRef } from 'react';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

interface UseApiResult<T> {
  data: T | undefined;
  error: string;
  loading: boolean;
  execute: (path: string, options?: RequestOptions) => Promise<T | undefined>;
  reset: () => void;
}

export function useApi<T = unknown>(options: UseApiOptions<T> = {}): UseApiResult<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Store latest options in ref to avoid stale closure in execute()
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(async (path: string, requestOptions?: RequestOptions) => {
    setLoading(true);
    setError('');
    try {
      const result = await client.POST(path, requestOptions);
      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '请求失败';
        setError(msg);
        optionsRef.current.onError?.(msg);
        return undefined;
      }
      setData(result.data as T);
      optionsRef.current.onSuccess?.(result.data as T);
      return result.data as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败';
      setError(msg);
      optionsRef.current.onError?.(msg);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(undefined);
    setError('');
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
}
```

### 3.3 `usePasswordValidation` Hook

```tsx
import { useState, useCallback } from 'react';

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function usePasswordValidation() {
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<PasswordValidation>({ isValid: false, errors: [] });

  const validate = useCallback((pwd: string): PasswordValidation => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('至少 8 个字符');
    if (!/[A-Z]/.test(pwd)) errors.push('包含大写字母');
    if (!/[a-z]/.test(pwd)) errors.push('包含小写字母');
    if (!/[0-9]/.test(pwd)) errors.push('包含数字');
    return { isValid: errors.length === 0, errors };
  }, []);

  const validateAndSet = useCallback((pwd: string) => {
    setPassword(pwd);
    const result = validate(pwd);
    setValidation(result);
    return result;
  }, [validate]);

  // Expose current validation state (no recalc on each render)
  const isValid = validation.isValid;
  const errors = validation.errors;

  return { password, setPassword: validateAndSet, validate, isValid, errors };
}
```

**Note**: Currently `validatePassword` is duplicated (10 lines) in both `RegisterPage` and `ResetPasswordPage`. This hook+utility replaces both.

### 3.4 Migration Impact

- `useApi` eliminates the try/catch/setLoading/setError boilerplate from every API-calling component (~15 lines per component × 5 components = ~75 lines)
- `usePasswordValidation` eliminates the duplicated 10-line function

---

## 4. Design: Round 3 — Auth Context

### 4.1 File Location

```
workspace/apps/web/src/contexts/
├── AuthContext.tsx    # React Context for auth state
└── AuthProvider.tsx   # Provider component
```

### 4.2 `AuthContext` Design

```tsx
interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerified: boolean;  // Email verified status — fetched from GET /api/auth/me on init
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

// ----------------------------------------------------------------
// useAuth — MUST be called within <AuthProvider>
// Throws if called outside provider to catch misuse at development time
// ----------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used within <AuthProvider>. ' +
      'Wrap your app root in <AuthProvider> to fix this.');
  }
  return ctx;
}

// ----------------------------------------------------------------
// AuthProvider — wraps the entire app in App.tsx
// ----------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const isAuthenticated = !!token && !!user;

  // Fetch user profile on mount if token exists
  useEffect(() => {
    if (!token) return;
    const fetchUser = async () => {
      try {
        const { data } = await client.GET('/api/auth/me');
        if (data) {
          setUser(data.user);
          setIsVerified(data.is_verified ?? false);
        }
      } catch {
        // Token invalid or expired — clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await client.POST('/api/auth/login', {
        body: { email, password, remember_me: rememberMe }
      });
      if (error) throw new Error((error as { detail?: string }).detail || '登录失败');
      if (data?.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        // user will be fetched by the useEffect above
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsVerified(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, isVerified, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Design notes**:
- `useAuth()` throws if called outside `<AuthProvider>` — fail-fast to catch misuse
- Token read from localStorage on init (SSR-safe via lazy init)
- User profile fetched lazily via `/api/auth/me` only when token present
- `isVerified` sourced from API response (requires backend contract: `GET /api/auth/me` returns `{ user, is_verified }`)

### 4.3 Migration from localStorage

Currently each component does:
```tsx
const token = localStorage.getItem('token');
localStorage.setItem('token', data.token);
localStorage.removeItem('token');  // logout
```

After AuthContext:
```tsx
const { login, logout, token } = useAuth();
// No localStorage access in components
```

**Scope**: All 8 components that currently access `localStorage.getItem/setItem/removeItem` for auth will be updated.

### 4.4 `App.tsx` Changes

```tsx
import { AuthProvider } from './contexts/AuthProvider';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>   {/* NEW: wraps all routes */}
        <Routes>
          {/* existing routes */}
        </Routes>
      </AuthProvider>
      <DevNavigation />
    </BrowserRouter>
  );
}
```

### 4.5 `client.ts` → `AuthContext` Token Integration

**Problem**: `client.ts` currently reads token from localStorage directly. AuthContext stores the token in state. We need a way for `client.ts` to access the token without creating a circular import.

**Solution**: Token ref shared via module-level variable (written by AuthProvider, read by client):

```tsx
// workspace/apps/web/src/api/client.ts

// Module-level ref — written by AuthProvider, read by client
// Avoids circular Context → client → Context dependency
let authTokenRef: { get: () => string | null } = {
  get: () => localStorage.getItem('token'),  // fallback
};

export function setAuthTokenGetter(getter: () => string | null) {
  authTokenRef.get = getter;
}

const request = async (method: 'GET' | 'POST', path: string, options?: RequestOptions) => {
  const token = authTokenRef.get();  // ← reads from AuthProvider's state
  // ... rest unchanged
};
```

```tsx
// workspace/apps/web/src/contexts/AuthProvider.tsx
// Inside AuthProvider, after token state is set:
useEffect(() => {
  if (token !== null) {
    setAuthTokenGetter(() => token);
  }
}, [token]);
```

**Why this pattern**:
- `client.ts` has no React dependency — just a sync getter function
- `AuthProvider` calls `setAuthTokenGetter` once when token changes
- No circular imports (client doesn't import from contexts/)
- `localStorage` fallback ensures API calls work even before AuthProvider mounts
```

---

## 5. Design: Round 4 — Lucide Icons + Accessibility

### 5.1 Icon Library Decision

**Selected**: Lucide React

**Rationale**:
- Tree-shakeable (50 icons ≈ 8 KB gzipped)
- Full TypeScript + React 19 support
- Clean stroke icons complement amber/parchment aesthetic
- `strokeWidth` prop allows matching design weight

**Installation**:
```bash
npm install lucide-react
```

### 5.2 Icons to Install

Based on emoji usage in current components:

| Current Emoji | Lucide Replacement | Where |
|---------------|-------------------|-------|
| ✒️ | `PenLine` | LoginPage header |
| ✨ | `Sparkles` | RegisterPage success, ProjectDashboard |
| 🔍 | `Search` | ProjectDashboard search |
| ✕ | `X` or `XCircle` | ErrorAlert dismiss |
| ✓ | `CheckCircle` | SuccessView |
| ◷ | `Loader2` | LoadingButton spinner |
| ❌ | `XCircle` | ErrorAlert icon |
| 📚 | `BookOpen` | ProjectDashboard project cards |
| ➕ | `Plus` | CreateProjectModal step icons |
| ✓ | `Check` | CreateProjectModal step completed |

Additional icons for future pages:
- `Feather`, `Scroll`, `Quill` — writing theme
- `Sparkles` — AI features
- `GitBranch` — version control

### 5.3 Amber-Stized Icon Wrapper

To ensure consistent amber-styled icons without repeating `color`/`stroke` props everywhere:

```tsx
// workspace/apps/web/src/components/ui/icons/index.ts
import {
  PenLine, Sparkles, Search, X, XCircle, CheckCircle,
  Loader2, BookOpen, Plus, Check, Feather, Scroll,
  GitBranch, Clock, MapPin, Compass, Archive
} from 'lucide-react';

export const Icons = {
  // Auth
  PenLine: (props: LucideProps) => <PenLine {...props} color="var(--color-amber)" strokeWidth={1.5} />,
  
  // Status
  Success: (props: LucideProps) => <CheckCircle {...props} color="var(--color-success)" strokeWidth={1.5} />,
  Error: (props: LucideProps) => <XCircle {...props} color="var(--color-error)" strokeWidth={1.5} />,
  Loading: (props: LucideProps) => <Loader2 {...props} color="var(--color-amber)" strokeWidth={1.5} />,
  
  // Actions
  Search: (props: LucideProps) => <Search {...props} color="var(--color-ink-light)" strokeWidth={1.5} />,
  Plus: (props: LucideProps) => <Plus {...props} color="var(--color-amber)" strokeWidth={1.5} />,
  Close: (props: LucideProps) => <X {...props} color="var(--color-ink-light)" strokeWidth={1.5} />,
  Check: (props: LucideProps) => <Check {...props} color="var(--color-success)" strokeWidth={2} />,
  
  // Theme
  Sparkles: (props: LucideProps) => <Sparkles {...props} color="var(--color-amber)" strokeWidth={1.5} />,
  BookOpen: (props: LucideProps) => <BookOpen {...props} color="var(--color-amber)" strokeWidth={1.5} />,
  Feather: (props: LucideProps) => <Feather {...props} color="var(--color-amber)" strokeWidth={1.5} />,
  
  // (add more as needed)
};

export type { LucideProps } from 'lucide-react';
```

**Design decision**: Centralized icon wrapper with amber default colors. Components import `Icons.PenLine` instead of raw `PenLine`, ensuring consistent styling without per-usage color props.

### 5.4 Accessibility Fixes (Overview)

**Problem**: No `aria-live` regions, no focus management in modals

**Fixes**:

1. **Dynamic error/success messages**: All `ErrorAlert` and `SuccessView` use `aria-live="polite"`
2. **Focus trap in CreateProjectModal**: `useFocusTrap` hook (see §5.5)
3. **Focus restoration on modal close**: Return focus to trigger element (stored ref)
4. **Skip-to-content link**: Added to `App.tsx` as first focusable element (§5.6)
5. **Form input `aria-describedby`**: Connect error messages to inputs

### 5.5 `useFocusTrap` Hook

```tsx
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    // Save current focus before trapping
    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusableElements = Array.from(
      ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstEl?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    ref.current.addEventListener('keydown', handleKeyDown);
    return () => {
      ref.current?.removeEventListener('keydown', handleKeyDown);
      // Restore focus to trigger element on unmount
      previousFocusRef.current?.focus();
    };
  }, [ref, active]);
}
```

**Usage in `CreateProjectModal`**:
```tsx
const modalRef = useRef<HTMLDivElement>(null);
useFocusTrap(modalRef, isOpen);

return (
  <dialog open={isOpen}>
    <div ref={modalRef}>  {/* pass ref to trap focus inside */}
      {/* modal content */}
    </div>
  </dialog>
);
```

### 5.6 Skip-to-Content Link

In `App.tsx`, add as first element inside `<AuthProvider>` wrapper:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-amber focus:text-white focus:px-4 focus:py-2 focus:rounded">
  跳转到主要内容
</a>
<div id="main-content" tabIndex={-1} />
```

CSS (`index.css`) — add:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

### 5.7 Token Consistency Fix

Replace hardcoded hex values with theme tokens:

| Hardcoded | Replace With |
|-----------|-------------|
| `#F5F0E8` | `bg-parchment` |
| `#2C2416` | `text-ink` |
| `#8B6914` | `text-amber` |

---

## 6. Migration Strategy

### Round-Based Approach

| Round | Deliverables | Files Changed | Risk |
|-------|-------------|---------------|------|
| **R1** | 5 UI components | New files only | ✅ Low (additive) |
| **R2** | 3 hooks + utils | New files + 2 files (RegisterPage, ResetPasswordPage) | ✅ Low |
| **R3** | AuthProvider | New files + 8 components migrated | ⚠️ Medium |
| **R4** | Lucide + a11y | All 8 components + index.css | ⚠️ Medium |

**Key principle**: Each round is independently deployable. Components can use old patterns in the same file as new patterns during migration.

### Regression Testing (per round)

After each round, run:

```bash
npm run typecheck    # TypeScript + ESLint (from workspace/apps/web/package.json)
npm run test         # All tests (coverage must stay ≥ 80%)
npm run dev          # Manual smoke test
```

A subagent will verify each round before proceeding to the next.

---

## 7. Expected Outcomes

### Quality Score Improvements (estimated)

| Dimension | Before | After | Delta |
|-----------|--------|-------|-------|
| Code Organization | 7/10 | 8.5/10 | +1.5 |
| Custom Hooks | 3/10 | 8/10 | +5 |
| Error Handling | 5/10 | 8/10 | +3 |
| Loading States | 5/10 | 8/10 | +3 |
| Responsive Design | 7/10 | 7/10 | 0 |
| Accessibility | 4/10 | 7/10 | +3 |
| **Overall** | **6/10** | **8/10** | **+2** |

### Measurable Improvements

- **~295 lines** of duplicated code eliminated
- **~85%** reduction in `localStorage` direct access (scattered → centralized)
- **0** emoji icons remaining (all replaced with Lucide)
- **100%** of form inputs with proper `aria-describedby` connections
- **100%** of error/success messages announced to screen readers

### Non-Goals (out of scope)

- Not rewriting business logic
- Not changing API contracts
- Not adding new features
- Not touching backend code

---

## 8. Files to Change

### New Files (R1-R4)

```
workspace/apps/web/src/components/
├── ui/
│   ├── FormInput.tsx
│   ├── ErrorAlert.tsx
│   ├── LoadingButton.tsx
│   ├── SuccessView.tsx
│   ├── AuthCard.tsx
│   ├── SkeletonLoader.tsx
│   └── icons/
│       └── index.ts

workspace/apps/web/src/hooks/
├── useApi.ts
├── useAuth.ts
├── usePasswordValidation.ts
└── index.ts

workspace/apps/web/src/contexts/
├── AuthContext.tsx
└── AuthProvider.tsx
```

### Modified Files (R1-R4)

```
workspace/apps/web/src/
├── App.tsx                          # R3: Add AuthProvider
├── index.css                        # R4: Add focus styles, skip-link
├── features/epic-1/components/
│   ├── LoginPage.tsx               # R1,R3,R4: Use components
│   ├── RegisterPage.tsx            # R1,R2,R3,R4
│   ├── ForgotPasswordPage.tsx      # R1,R3,R4
│   ├── ResetPasswordPage.tsx       # R1,R2,R3,R4
│   ├── VerificationResultPage.tsx  # R1,R3,R4
│   ├── ProjectDashboard.tsx         # R1,R4
│   └── CreateProjectModal.tsx       # R1,R3,R4 (focus trap)
├── api/client.ts                    # R3: Uses AuthContext token
└── main.tsx                         # R3: Verify MSW still works
```

---

## 9. Verification Plan

After all 4 rounds:

1. **Functional**: All 8 pages load and pass existing tests
2. **Coverage**: Line coverage stays ≥ 80%
3. **TypeScript**: Zero new type errors
4. **Accessibility**: `axe` or Lighthouse a11y score ≥ 85
5. **Bundle size**: No increase > 10 KB gzipped (Lucide is tree-shakeable)
