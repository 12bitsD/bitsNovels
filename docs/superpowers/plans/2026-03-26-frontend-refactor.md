# Frontend Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate ~315 lines of duplicated code across 8 frontend pages by building a shared UI component library, custom hooks, and AuthContext. Replace all emoji icons with Lucide React. Add accessibility improvements.

**Architecture:** 4-round incremental migration. Each round is independently deployable. Components can mix old/new patterns during transition. Token integration uses ref-based getter pattern to avoid circular Context→API→Context dependencies.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v4, Lucide React, Vitest, MSW

---

## Chunk 1: Round 1 — Shared UI Components

**Files to create:**
- `workspace/apps/web/src/components/ui/FormInput.tsx`
- `workspace/apps/web/src/components/ui/ErrorAlert.tsx`
- `workspace/apps/web/src/components/ui/LoadingButton.tsx`
- `workspace/apps/web/src/components/ui/SuccessView.tsx`
- `workspace/apps/web/src/components/ui/AuthCard.tsx`
- `workspace/apps/web/src/components/ui/SkeletonLoader.tsx`
- `workspace/apps/web/src/components/ui/icons/index.ts`

**Files to modify:** None (all new files, no existing code touched)

---

### Task 1: Create `FormInput` component

**Files:**
- Create: `workspace/apps/web/src/components/ui/FormInput.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/components/ui/__tests__/FormInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FormInput } from '../FormInput';

describe('FormInput', () => {
  it('renders label and input', () => {
    render(<FormInput id="email" label="邮箱" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
  });

  it('shows error message with aria-live', () => {
    render(<FormInput id="email" label="邮箱" value="" onChange={() => {}} error="邮箱格式不正确" />);
    const errorEl = screen.getByRole('paragraph');
    expect(errorEl).toHaveAttribute('aria-live', 'polite');
    expect(errorEl.textContent).toContain('邮箱格式不正确');
  });

  it('connects aria-describedby to error', () => {
    render(<FormInput id="email" label="邮箱" value="" onChange={() => {}} error="错误" />);
    const input = screen.getByLabelText('邮箱');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('calls onChange with input value', () => {
    const onChange = vi.fn();
    render(<FormInput id="email" label="邮箱" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'test@test.com' } });
    expect(onChange).toHaveBeenCalledWith('test@test.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/FormInput.test.tsx`
Expected: FAIL — `FormInput` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// workspace/apps/web/src/components/ui/FormInput.tsx
import { XCircleIcon } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type { LucideProps };

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
  hint?: string;
  className?: string;
}

export function FormInput({
  id, label, type = 'text', value, onChange,
  placeholder, error, required, disabled, hint, className = ''
}: FormInputProps) {
  return (
    <div className={className}>
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/FormInput.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/FormInput.tsx src/components/ui/__tests__/FormInput.test.tsx
git commit -m "feat(ui): add FormInput component with aria-live error display"
```

---

### Task 2: Create `ErrorAlert` component

**Files:**
- Create: `workspace/apps/web/src/components/ui/ErrorAlert.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/components/ui/__tests__/ErrorAlert.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorAlert } from '../ErrorAlert';

describe('ErrorAlert', () => {
  it('renders error message with aria-live', () => {
    render(<ErrorAlert error="登录失败，请检查邮箱和密码" />);
    const el = screen.getByRole('region');
    expect(el).toHaveAttribute('aria-live', 'polite');
    expect(el.textContent).toContain('登录失败');
  });

  it('shows dismiss button when onDismiss provided', () => {
    const onDismiss = vi.fn();
    render(<ErrorAlert error="错误" onDismiss={onDismiss} />);
    const btn = screen.getByRole('button', { name: '关闭提示' });
    fireEvent.click(btn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does not show dismiss button when onDismiss not provided', () => {
    render(<ErrorAlert error="错误" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/ErrorAlert.test.tsx`
Expected: FAIL — `ErrorAlert` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// workspace/apps/web/src/components/ui/ErrorAlert.tsx
import { XCircleIcon, XIcon } from 'lucide-react';

interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/ErrorAlert.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ErrorAlert.tsx src/components/ui/__tests__/ErrorAlert.test.tsx
git commit -m "feat(ui): add ErrorAlert with aria-live and optional dismiss"
```

---

### Task 3: Create `LoadingButton` component

**Files:**
- Create: `workspace/apps/web/src/components/ui/LoadingButton.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/components/ui/__tests__/LoadingButton.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingButton } from '../LoadingButton';

describe('LoadingButton', () => {
  it('shows loading state with spinner and loadingText', async () => {
    const user = userEvent.setup();
    render(<LoadingButton loading loadingText="登录中...">登录</LoadingButton>);
    expect(screen.getByText('登录中...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows children when not loading', () => {
    render(<LoadingButton loading={false}>登录</LoadingButton>);
    expect(screen.getByText('登录')).toBeInTheDocument();
  });

  it('disables button when loading even if disabled prop is false', () => {
    render(<LoadingButton loading={true} disabled={false}>登录</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('uses variant primary by default', () => {
    const { container } = render(<LoadingButton loading={false}>Test</LoadingButton>);
    expect(container.querySelector('button')).toHaveClass('btn-primary');
  });

  it('uses variant secondary when specified', () => {
    const { container } = render(<LoadingButton loading={false} variant="secondary">Test</LoadingButton>);
    expect(container.querySelector('button')).toHaveClass('btn-secondary');
  });

  it('forwards className', () => {
    const { container } = render(<LoadingButton loading={false} className="mt-4">Test</LoadingButton>);
    expect(container.querySelector('button')).toHaveClass('mt-4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/LoadingButton.test.tsx`
Expected: FAIL — `LoadingButton` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// workspace/apps/web/src/components/ui/LoadingButton.tsx
import { Loader2Icon } from 'lucide-react';

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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/LoadingButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/LoadingButton.tsx src/components/ui/__tests__/LoadingButton.test.tsx
git commit -m "feat(ui): add LoadingButton with loading spinner state"
```

---

### Task 4: Create `SuccessView` component

**Files:**
- Create: `workspace/apps/web/src/components/ui/SuccessView.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/components/ui/__tests__/SuccessView.test.tsx
import { render, screen } from '@testing-library/react';
import { SuccessView } from '../SuccessView';
import { CheckCircle } from 'lucide-react';

describe('SuccessView', () => {
  const defaultProps = {
    icon: <CheckCircle size={32} />,
    title: '注册成功',
    description: '请前往邮箱验证您的账号',
  };

  it('renders title and description', () => {
    render(<SuccessView {...defaultProps} />);
    expect(screen.getByText('注册成功')).toBeInTheDocument();
    expect(screen.getByText('请前往邮箱验证您的账号')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<SuccessView {...defaultProps} icon={<CheckCircle data-testid="icon" size={32} />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders primary action button as type=button', () => {
    const onAction = vi.fn();
    render(<SuccessView {...defaultProps} action={{ label: '去登录', onClick: onAction }} />);
    const btn = screen.getByRole('button', { name: '去登录' });
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('renders secondary action as text link', () => {
    const onSecondary = vi.fn();
    render(<SuccessView {...defaultProps} secondaryAction={{ label: '重新发送', onClick: onSecondary }} />);
    expect(screen.getByText('重新发送')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/SuccessView.test.tsx`
Expected: FAIL — `SuccessView` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// workspace/apps/web/src/components/ui/SuccessView.tsx
import { LoadingButton } from './LoadingButton';

interface SuccessViewProps {
  icon: React.ReactNode;
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
  className?: string;
}

export function SuccessView({
  icon, title, description, action, secondaryAction, className = ''
}: SuccessViewProps) {
  return (
    <div className={`text-center py-4 ${className}`}>
      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-success">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
      {description && <p className="text-ink-light text-sm mb-6">{description}</p>}
      {action && (
        <LoadingButton type="button" onClick={action.onClick} loading={false} className="mt-2">
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/SuccessView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SuccessView.tsx src/components/ui/__tests__/SuccessView.test.tsx
git commit -m "feat(ui): add SuccessView component for success states"
```

---

### Task 5: Create `AuthCard` component

**Files:**
- Create: `workspace/apps/web/src/components/ui/AuthCard.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/components/ui/__tests__/AuthCard.test.tsx
import { render, screen } from '@testing-library/react';
import { AuthCard } from '../AuthCard';
import { PenLine } from 'lucide-react';

describe('AuthCard', () => {
  it('renders icon, title, description', () => {
    render(
      <AuthCard
        icon={<PenLine data-testid="icon" />}
        title="欢迎回来"
        description="登录您的账号"
      >
        <form>Form content</form>
      </AuthCard>
    );
    expect(screen.getByText('欢迎回来')).toBeInTheDocument();
    expect(screen.getByText('登录您的账号')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <AuthCard icon={<PenLine />} title="Test" footer={<div data-testid="footer">Footer</div>}>
        Content
      </AuthCard>
    );
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('applies className to inner card', () => {
    const { container } = render(
      <AuthCard icon={<PenLine />} title="Test" className="custom-class">
        Content
      </AuthCard>
    );
    expect(container.querySelector('[class*="bg-white"]')).toHaveClass('custom-class');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/AuthCard.test.tsx`
Expected: FAIL — `AuthCard` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// workspace/apps/web/src/components/ui/AuthCard.tsx
interface AuthCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({
  icon, title, description, children, footer, className = ''
}: AuthCardProps) {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-4 font-sans text-ink">
      <div
        className={`bg-white/80 backdrop-blur-xl p-10 rounded-xl border border-white/60 max-w-md w-full animate-in fade-in zoom-in-95 duration-500 ${className}`}
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/AuthCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AuthCard.tsx src/components/ui/__tests__/AuthCard.test.tsx
git commit -m "feat(ui): add AuthCard wrapper for auth pages"
```

---

### Task 6: Create `SkeletonLoader` component

**Files:**
- Create: `workspace/apps/web/src/components/ui/SkeletonLoader.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/components/ui/__tests__/SkeletonLoader.test.tsx
import { render, screen } from '@testing-library/react';
import { SkeletonLoader } from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders text variant with correct size', () => {
    render(<SkeletonLoader variant="text" />);
    const el = screen.getByRole('presentation');
    expect(el).toHaveClass('animate-pulse', 'h-4', 'w-full');
  });

  it('renders card variant', () => {
    render(<SkeletonLoader variant="card" />);
    const el = screen.getByRole('presentation');
    expect(el).toHaveClass('h-32', 'w-full');
  });

  it('renders with aria-hidden', () => {
    render(<SkeletonLoader variant="text" />);
    expect(screen.getByRole('presentation')).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom width/height', () => {
    render(<SkeletonLoader variant="text" width="200px" height="24px" />);
    const el = screen.getByRole('presentation');
    expect(el).toHaveStyle({ width: '200px', height: '24px' });
  });

  it('applies className', () => {
    render(<SkeletonLoader variant="text" className="mb-4" />);
    expect(screen.getByRole('presentation')).toHaveClass('mb-4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/SkeletonLoader.test.tsx`
Expected: FAIL — `SkeletonLoader` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// workspace/apps/web/src/components/ui/SkeletonLoader.tsx
type SkeletonVariant = 'text' | 'card' | 'avatar' | 'button';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
}

const sizes: Record<SkeletonVariant, string> = {
  text:    'h-4 w-full',
  card:    'h-32 w-full',
  avatar:  'h-12 w-12 rounded-full',
  button:  'h-10 w-24',
};

export function SkeletonLoader({
  variant = 'text', width, height, className = ''
}: SkeletonLoaderProps) {
  return (
    <div
      role="presentation"
      className={`animate-pulse bg-amber-light/30 rounded ${sizes[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/components/ui/__tests__/SkeletonLoader.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SkeletonLoader.tsx src/components/ui/__tests__/SkeletonLoader.test.tsx
git commit -m "feat(ui): add SkeletonLoader for loading states"
```

---

### Task 7: Create Lucide icon wrapper

**Files:**
- Create: `workspace/apps/web/src/components/ui/icons/index.ts`

- [ ] **Step 1: Verify lucide-react is installed**

Run: `cd workspace/apps/web && cat package.json | grep lucide`
Expected: should show lucide-react (if not, run `npm install lucide-react`)

- [ ] **Step 2: Write the icon wrapper**

```typescript
// workspace/apps/web/src/components/ui/icons/index.ts
import {
  PenLine, Sparkles, Search, X, XCircle, CheckCircle,
  Loader2, BookOpen, Plus, Check, Feather, Scroll,
  GitBranch, Clock, MapPin, Compass, Archive, AlertCircle
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

// Amber-styled icons with consistent stroke weight (1.5)
// Use CSS variable for theme-aware coloring
const amber = 'var(--color-amber)';
const amberDark = 'var(--color-amber-dark)';
const inkLight = 'var(--color-ink-light)';
const success = 'var(--color-success)';
const error = 'var(--color-error)';

export const Icons = {
  // Auth
  PenLine: (props: LucideProps) => <PenLine {...props} color={amber} strokeWidth={1.5} />,

  // Status
  Success: (props: LucideProps) => <CheckCircle {...props} color={success} strokeWidth={1.5} />,
  Error: (props: LucideProps) => <XCircle {...props} color={error} strokeWidth={1.5} />,
  Alert: (props: LucideProps) => <AlertCircle {...props} color={error} strokeWidth={1.5} />,
  Loading: (props: LucideProps) => <Loader2 {...props} color={amber} strokeWidth={1.5} />,

  // Actions
  Search: (props: LucideProps) => <Search {...props} color={inkLight} strokeWidth={1.5} />,
  Plus: (props: LucideProps) => <Plus {...props} color={amber} strokeWidth={1.5} />,
  Close: (props: LucideProps) => <X {...props} color={inkLight} strokeWidth={1.5} />,
  Check: (props: LucideProps) => <Check {...props} color={success} strokeWidth={2} />,

  // Theme
  Sparkles: (props: LucideProps) => <Sparkles {...props} color={amber} strokeWidth={1.5} />,
  BookOpen: (props: LucideProps) => <BookOpen {...props} color={amber} strokeWidth={1.5} />,
  Feather: (props: LucideProps) => <Feather {...props} color={amber} strokeWidth={1.5} />,
  Scroll: (props: LucideProps) => <Scroll {...props} color={amber} strokeWidth={1.5} />,
  Archive: (props: LucideProps) => <Archive {...props} color={amber} strokeWidth={1.5} />,
  GitBranch: (props: LucideProps) => <GitBranch {...props} color={inkLight} strokeWidth={1.5} />,
  Clock: (props: LucideProps) => <Clock {...props} color={inkLight} strokeWidth={1.5} />,
  MapPin: (props: LucideProps) => <MapPin {...props} color={amber} strokeWidth={1.5} />,
  Compass: (props: LucideProps) => <Compass {...props} color={amber} strokeWidth={1.5} />,
};

export type { LucideProps };
```

- [ ] **Step 3: Install lucide-react if missing and verify**

```bash
cd workspace/apps/web && npm install lucide-react && npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/icons/index.ts package.json package-lock.json
git commit -m "feat(ui): add Lucide icon wrapper with amber-styled defaults"
```

---

## Chunk 2: Round 1 — Migrate LoginPage to use shared components

**Files to modify:**
- `workspace/apps/web/src/features/epic-1/components/LoginPage.tsx`

---

### Task 8: Migrate LoginPage to use shared components

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/LoginPage.tsx`
- Create: `workspace/apps/web/src/features/epic-1/components/__tests__/LoginPage.test.tsx` (if existing test doesn't cover component integration)

- [ ] **Step 1: Read existing LoginPage**

Read: `workspace/apps/web/src/features/epic-1/components/LoginPage.tsx`

- [ ] **Step 2: Refactor to use AuthCard, FormInput, ErrorAlert, LoadingButton, Icons.PenLine**

Replace the inline card markup, form inputs, error display, and loading button with the new shared components. Keep all existing state, handlers, and API logic intact. Replace emoji ✒️ with `<Icons.PenLine size={24} />`.

Key changes:
- Wrap entire page in `<AuthCard icon={<Icons.PenLine size={24} />} title="欢迎回来" description="登录您的账号" footer={...}>`
- Replace each `<div>` + `<label>` + `<input>` block with `<FormInput>`
- Replace error display with `<ErrorAlert>`
- Replace submit button with `<LoadingButton loading={loading} loadingText="登录中...">`
- Replace OAuth buttons to use `<Icons.Search>` or `<Icons.BookOpen>` if icons are desired (optional)
- Extract footer into `<AuthCard footer={...}>` slot

- [ ] **Step 3: Run typecheck**

Run: `cd workspace/apps/web && npm run typecheck`
Expected: Zero type errors

- [ ] **Step 4: Run tests**

Run: `cd workspace/apps/web && npx vitest run src/features/epic-1/components/__tests__/LoginPage.test.tsx`
Expected: All tests pass

- [ ] **Step 5: Run full test suite (regression check)**

Run: `cd workspace/apps/web && npm run test -- --run 2>&1 | tail -30`
Expected: All tests pass, coverage ≥ 80%

- [ ] **Step 6: Commit**

```bash
git add src/features/epic-1/components/LoginPage.tsx
git commit -m "refactor(epic-1): migrate LoginPage to use shared UI components"
```

---

## Chunk 3: Round 1 — Migrate remaining auth pages

**Files to modify:**
- `workspace/apps/web/src/features/epic-1/components/RegisterPage.tsx`
- `workspace/apps/web/src/features/epic-1/components/ForgotPasswordPage.tsx`
- `workspace/apps/web/src/features/epic-1/components/ResetPasswordPage.tsx`
- `workspace/apps/web/src/features/epic-1/components/VerificationResultPage.tsx`

---

### Task 9: Migrate RegisterPage

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/RegisterPage.tsx`

- [ ] **Step 1: Read RegisterPage, identify duplications**

Read: `workspace/apps/web/src/features/epic-1/components/RegisterPage.tsx`

- [ ] **Step 2: Replace inline markup with shared components**

Same pattern as LoginPage:
- AuthCard wrapper
- FormInput for email/password fields (use `type="password"`)
- ErrorAlert for error display
- LoadingButton for submit
- Icons.PenLine for page icon
- SuccessView for the success state (after registration)
- Keep `validatePassword` function (will be moved to hook in Round 2)

- [ ] **Step 3: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/RegisterPage.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/features/epic-1/components/RegisterPage.tsx
git commit -m "refactor(epic-1): migrate RegisterPage to shared UI components"
```

---

### Task 10: Migrate ForgotPasswordPage

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/ForgotPasswordPage.tsx`

- [ ] **Step 1: Read and migrate**

Same pattern — AuthCard + FormInput + ErrorAlert + LoadingButton + SuccessView (for success state).

- [ ] **Step 2: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/ForgotPasswordPage.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/epic-1/components/ForgotPasswordPage.tsx
git commit -m "refactor(epic-1): migrate ForgotPasswordPage to shared UI components"
```

---

### Task 11: Migrate ResetPasswordPage

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/ResetPasswordPage.tsx`

- [ ] **Step 1: Read and migrate**

Same pattern. Note: `validatePassword` function exists here too — keep it inline for now (Round 2 will extract it to `usePasswordValidation`).

- [ ] **Step 2: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/ResetPasswordPage.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/epic-1/components/ResetPasswordPage.tsx
git commit -m "refactor(epic-1): migrate ResetPasswordPage to shared UI components"
```

---

### Task 12: Migrate VerificationResultPage

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/VerificationResultPage.tsx`

- [ ] **Step 1: Read and migrate**

Replace inline spinner with `Icons.Loading`. Replace success/error state sections with `SuccessView`. Use `AuthCard` wrapper if it has the auth card structure.

- [ ] **Step 2: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/VerificationResultPage.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/epic-1/components/VerificationResultPage.tsx
git commit -m "refactor(epic-1): migrate VerificationResultPage to shared UI components"
```

---

## Chunk 4: Round 1 — Migrate ProjectDashboard and CreateProjectModal

**Files to modify:**
- `workspace/apps/web/src/features/epic-1/components/ProjectDashboard.tsx`
- `workspace/apps/web/src/features/epic-1/components/CreateProjectModal.tsx`

---

### Task 13: Migrate ProjectDashboard

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/ProjectDashboard.tsx`

- [ ] **Step 1: Read ProjectDashboard**

Read: `workspace/apps/web/src/features/epic-1/components/ProjectDashboard.tsx`

- [ ] **Step 2: Replace inline skeleton with SkeletonLoader, replace emoji icons**

- Replace inline skeleton markup (animate-pulse div blocks) with `<SkeletonLoader variant="card" />`
- Replace emoji 🔍 with `<Icons.Search size={16} />`
- Replace emoji ✨ with `<Icons.Sparkles size={16} />`
- Replace emoji 📚 with `<Icons.BookOpen size={16} />`

- [ ] **Step 3: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/ProjectDashboard.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/features/epic-1/components/ProjectDashboard.tsx
git commit -m "refactor(epic-1): migrate ProjectDashboard to shared UI components"
```

---

### Task 14: Migrate CreateProjectModal

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/CreateProjectModal.tsx`

- [ ] **Step 1: Read CreateProjectModal**

Read: `workspace/apps/web/src/features/epic-1/components/CreateProjectModal.tsx`

- [ ] **Step 2: Replace inline components with shared components**

- Replace emoji ➕ with `<Icons.Plus size={16} />`
- Replace emoji ✓ with `<Icons.Check size={16} />`
- Replace emoji ✕ with `<Icons.Close size={16} />`
- Replace form inputs with FormInput
- Replace error display with ErrorAlert
- Replace submit button with LoadingButton

- [ ] **Step 3: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/CreateProjectModal.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/features/epic-1/components/CreateProjectModal.tsx
git commit -m "refactor(epic-1): migrate CreateProjectModal to shared UI components"
```

---

## Chunk 5: Round 2 — Custom Hooks

**Files to create:**
- `workspace/apps/web/src/hooks/useApi.ts`
- `workspace/apps/web/src/hooks/usePasswordValidation.ts`
- `workspace/apps/web/src/hooks/index.ts`

**Files to modify:**
- `workspace/apps/web/src/features/epic-1/components/RegisterPage.tsx` (use usePasswordValidation)
- `workspace/apps/web/src/features/epic-1/components/ResetPasswordPage.tsx` (use usePasswordValidation)

---

### Task 15: Create `useApi` hook

**Files:**
- Create: `workspace/apps/web/src/hooks/useApi.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/hooks/__tests__/useApi.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../useApi';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw/browser';

describe('useApi', () => {
  it('returns data on success', async () => {
    server.use(
      http.post('/test', () => HttpResponse.json({ result: 'ok' }))
    );

    const { result } = renderHook(() => useApi<{ result: string }>());
    await result.current.execute('/test', { body: {} });

    await waitFor(() => expect(result.current.data).toEqual({ result: 'ok' }));
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(false);
  });

  it('sets error on failure', async () => {
    server.use(
      http.post('/test-error', () => HttpResponse.json(
        { detail: 'Invalid request' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useApi<{ result: string }>());
    await result.current.execute('/test-error', { body: {} });

    await waitFor(() => expect(result.current.error).toBe('Invalid request'));
    expect(result.current.data).toBeUndefined();
  });

  it('sets loading during request', async () => {
    server.use(
      http.post('/test-slow', () => new HttpResponse(() => new Promise(() => {})))
    );

    const { result } = renderHook(() => useApi());
    result.current.execute('/test-slow', { body: {} });
    expect(result.current.loading).toBe(true);
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    server.use(
      http.post('/test', () => HttpResponse.json({ result: 'ok' }))
    );

    const { result } = renderHook(() => useApi({ onSuccess }));
    await result.current.execute('/test', { body: {} });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ result: 'ok' }));
  });

  it('reset clears all state', async () => {
    server.use(
      http.post('/test', () => HttpResponse.json({ result: 'ok' }))
    );

    const { result } = renderHook(() => useApi());
    await result.current.execute('/test', { body: {} });
    await waitFor(() => expect(result.current.data).toBeDefined());
    result.current.reset();
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/hooks/__tests__/useApi.test.ts`
Expected: FAIL — `useApi` not found

- [ ] **Step 3: Write implementation**

```typescript
// workspace/apps/web/src/hooks/useApi.ts
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
  execute: (path: string, options?: { body?: unknown }) => Promise<T | undefined>;
  reset: () => void;
}

export function useApi<T = unknown>(options: UseApiOptions<T> = {}): UseApiResult<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(async (path: string, requestOptions?: { body?: unknown }) => {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/hooks/__tests__/useApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useApi.ts src/hooks/__tests__/useApi.test.ts
git commit -m "feat(hooks): add useApi hook with loading/error state"
```

---

### Task 16: Create `usePasswordValidation` hook

**Files:**
- Create: `workspace/apps/web/src/hooks/usePasswordValidation.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/hooks/__tests__/usePasswordValidation.test.ts
import { renderHook } from '@testing-library/react';
import { usePasswordValidation } from '../usePasswordValidation';

describe('usePasswordValidation', () => {
  it('returns invalid for short passwords', () => {
    const { result } = renderHook(() => usePasswordValidation());
    const validation = result.current.validate('Ab1');
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('returns valid for strong passwords', () => {
    const { result } = renderHook(() => usePasswordValidation());
    const validation = result.current.validate('Abcdefg1');
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('validateAndSet updates password and returns validation', () => {
    const { result } = renderHook(() => usePasswordValidation());
    const validation = result.current.setPassword('Abcdefg1');
    expect(result.current.password).toBe('Abcdefg1');
    expect(validation.isValid).toBe(true);
    expect(result.current.isValid).toBe(true);
  });

  it('isValid is derived state, not recalculated on every render', () => {
    const { result } = renderHook(() => usePasswordValidation());
    result.current.setPassword('Abcdefg1');
    // Multiple re-renders should not change isValid
    const isValidBefore = result.current.isValid;
    result.current.validate('different'); // doesn't update the hook's password state
    expect(result.current.isValid).toBe(isValidBefore);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/hooks/__tests__/usePasswordValidation.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// workspace/apps/web/src/hooks/usePasswordValidation.ts
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

  return {
    password,
    setPassword: validateAndSet,
    validate,
    isValid: validation.isValid,
    errors: validation.errors,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/hooks/__tests__/usePasswordValidation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePasswordValidation.ts src/hooks/__tests__/usePasswordValidation.test.ts
git commit -m "feat(hooks): add usePasswordValidation hook"
```

---

### Task 17: Create hooks barrel export

**Files:**
- Create: `workspace/apps/web/src/hooks/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// workspace/apps/web/src/hooks/index.ts
export { useApi } from './useApi';
export { usePasswordValidation } from './usePasswordValidation';
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/index.ts
git commit -m "feat(hooks): add hooks barrel export"
```

---

### Task 18: Migrate RegisterPage to use `usePasswordValidation`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/RegisterPage.tsx`

- [ ] **Step 1: Read current RegisterPage**

- [ ] **Step 2: Replace inline validatePassword with usePasswordValidation hook**

Import `usePasswordValidation` from `../../../hooks` and replace the inline `validatePassword` function with the hook. The hook's `isValid` and `errors` replace the local validation state.

- [ ] **Step 3: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/RegisterPage.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/features/epic-1/components/RegisterPage.tsx
git commit -m "refactor(epic-1): use usePasswordValidation hook in RegisterPage"
```

---

### Task 19: Migrate ResetPasswordPage to use `usePasswordValidation`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/ResetPasswordPage.tsx`

- [ ] **Step 1: Read and migrate**

Same as RegisterPage — replace inline `validatePassword` with `usePasswordValidation` hook.

- [ ] **Step 2: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/ResetPasswordPage.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/epic-1/components/ResetPasswordPage.tsx
git commit -m "refactor(epic-1): use usePasswordValidation hook in ResetPasswordPage"
```

---

## Chunk 6: Round 3 — AuthContext

**Files to create:**
- `workspace/apps/web/src/contexts/AuthContext.tsx` (contains both AuthContext + AuthProvider + useAuth)

**Files to modify:**
- `workspace/apps/web/src/api/client.ts` (add setAuthTokenGetter pattern)
- `workspace/apps/web/src/App.tsx` (wrap routes with AuthProvider)
- `workspace/apps/web/src/features/epic-1/components/LoginPage.tsx`
- `workspace/apps/web/src/features/epic-1/components/RegisterPage.tsx`
- `workspace/apps/web/src/features/epic-1/components/ForgotPasswordPage.tsx`
- `workspace/apps/web/src/features/epic-1/components/ResetPasswordPage.tsx`
- `workspace/apps/web/src/features/epic-1/components/VerificationResultPage.tsx`
- `workspace/apps/web/src/features/epic-1/components/ProjectDashboard.tsx`
- `workspace/apps/web/src/features/epic-1/components/CreateProjectModal.tsx`

---

### Task 20: Create AuthContext + AuthProvider + useAuth

**Files:**
- Create: `workspace/apps/web/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/contexts/__tests__/AuthContext.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw/browser';

const TestConsumer = () => {
  const { user, token, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="token">{token ?? 'no-token'}</span>
      <span data-testid="user">{user?.email ?? 'no-user'}</span>
      <button onClick={() => login('test@test.com', 'password')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  it('throws when useAuth called outside provider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth() must be used within <AuthProvider>');
    spy.mockRestore();
  });

  it('initializes with token from localStorage', async () => {
    localStorage.setItem('token', 'test-token');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    localStorage.removeItem('token');
  });

  it('login sets token and fetches user', async () => {
    server.use(
      http.post('/api/auth/login', () => HttpResponse.json({ token: 'new-token' })),
      http.get('/api/auth/me', () => HttpResponse.json({
        user: { id: '1', email: 'test@test.com' },
        is_verified: true
      }))
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await result.current.login('test@test.com', 'password');
    await waitFor(() => expect(result.current.token).toBe('new-token'));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout clears token and user', async () => {
    localStorage.setItem('token', 'test-token');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => !result.current.isLoading);
    result.current.logout();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/contexts/__tests__/AuthContext.test.tsx`
Expected: FAIL — AuthContext not found

- [ ] **Step 3: Write implementation**

```typescript
// workspace/apps/web/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { client } from '../api/client';
import { setAuthTokenGetter } from '../api/client';

interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerified: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      'useAuth() must be used within <AuthProvider>. ' +
      'Wrap your app root in <AuthProvider> to fix this.'
    );
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const isAuthenticated = !!token && !!user;

  // Sync token to API client's getter
  useEffect(() => {
    if (token !== null) {
      setAuthTokenGetter(() => token);
    }
  }, [token]);

  // Fetch user profile on mount if token exists
  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const { data } = await client.GET('/api/auth/me');
        if (data) {
          setUser((data as { user: User; is_verified?: boolean }).user);
          setIsVerified((data as { is_verified?: boolean }).is_verified ?? false);
        }
      } catch {
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
      if ((data as { token?: string })?.token) {
        const t = (data as { token: string }).token;
        localStorage.setItem('token', t);
        setToken(t);
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
    <AuthContext.Provider value={{
      user, token, isAuthenticated, isLoading, isVerified, login, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/contexts/__tests__/AuthContext.test.tsx`
Expected: PASS (or some failures due to MSW setup — fix as needed)

- [ ] **Step 5: Commit**

```bash
git add src/contexts/AuthContext.tsx src/contexts/__tests__/AuthContext.test.tsx
git commit -m "feat(auth): add AuthContext with AuthProvider and useAuth hook"
```

---

### Task 21: Update `client.ts` to support `setAuthTokenGetter`

**Files:**
- Modify: `workspace/apps/web/src/api/client.ts`

- [ ] **Step 1: Read current client.ts**

- [ ] **Step 2: Add setAuthTokenGetter function**

Add a module-level ref and `setAuthTokenGetter` function. The existing `request` function uses `authTokenRef.get()` instead of `localStorage.getItem('token')`.

- [ ] **Step 3: Run typecheck**

```bash
cd workspace/apps/web && npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/api/client.ts
git commit -m "feat(api): support setAuthTokenGetter for AuthContext integration"
```

---

### Task 22: Wrap App with AuthProvider

**Files:**
- Modify: `workspace/apps/web/src/App.tsx`

- [ ] **Step 1: Read App.tsx**

- [ ] **Step 2: Import and wrap routes with AuthProvider**

```typescript
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* existing routes */}
        </Routes>
      </AuthProvider>
      <DevNavigation />
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd workspace/apps/web && npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wrap routes with AuthProvider"
```

---

### Task 23: Migrate LoginPage to use `useAuth`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/LoginPage.tsx`

- [ ] **Step 1: Read LoginPage**

- [ ] **Step 2: Replace local state and localStorage with useAuth**

```typescript
// Replace:
// const [email, setEmail] = useState('');
// const [password, setPassword] = useState('');
// const [error, setError] = useState('');
// const [loading, setLoading] = useState(false);
// With:
const { login, isLoading } = useAuth();
const [error, setError] = useState('');

// Replace handleSubmit's manual API call with:
await login(email, password, rememberMe);
// Then check if successful by watching isAuthenticated via useAuth or redirect in useEffect

// Remove: localStorage.setItem('token', data.token);
// Remove: localStorage.getItem('token') calls
```

- [ ] **Step 3: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/LoginPage.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/features/epic-1/components/LoginPage.tsx
git commit -m "refactor(epic-1): use useAuth hook in LoginPage"
```

---

### Task 24: Migrate RegisterPage to use `useAuth`

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/RegisterPage.tsx`

- [ ] **Step 1: Read and migrate**

Same pattern — remove localStorage token access, use `useAuth().login()` or call API directly.

- [ ] **Step 2: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/RegisterPage.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/epic-1/components/RegisterPage.tsx
git commit -m "refactor(epic-1): use useAuth in RegisterPage"
```

---

### Task 25: Migrate remaining 6 components

**Files:**
- Modify: ForgotPasswordPage, ResetPasswordPage, VerificationResultPage, ProjectDashboard, CreateProjectModal, UnverifiedPrompt

- [ ] **Step 1: Read and update each file**

For each file: remove direct `localStorage.getItem('token')` calls. If component checks auth status, use `useAuth().isAuthenticated`. If component makes API calls that need auth, the `client.ts` already reads from `authTokenRef` (updated by AuthProvider) so no changes needed in individual components for that.

- [ ] **Step 2: Run typecheck + full test suite after all migrations**

```bash
cd workspace/apps/web && npm run typecheck && npm run test -- --run 2>&1 | tail -30
```

- [ ] **Step 3: Commit**

```bash
git add src/features/epic-1/components/ForgotPasswordPage.tsx \
        src/features/epic-1/components/ResetPasswordPage.tsx \
        src/features/epic-1/components/VerificationResultPage.tsx \
        src/features/epic-1/components/ProjectDashboard.tsx \
        src/features/epic-1/components/CreateProjectModal.tsx \
        src/features/epic-1/components/UnverifiedPrompt.tsx
git commit -m "refactor(epic-1): migrate remaining components to use useAuth"
```

---

## Chunk 7: Round 4 — Lucide Icons + Accessibility

**Files to modify:**
- `workspace/apps/web/src/index.css` (skip link CSS + sr-only)
- `workspace/apps/web/src/App.tsx` (skip-to-content link)
- `workspace/apps/web/src/features/epic-1/components/CreateProjectModal.tsx` (focus trap)
- All 8 components (replace any remaining emoji with Icons.*)

---

### Task 26: Add skip-to-content link and focus styles

**Files:**
- Modify: `workspace/apps/web/src/index.css`
- Modify: `workspace/apps/web/src/App.tsx`

- [ ] **Step 1: Add sr-only CSS to index.css**

Add to `@layer base`:
```css
.skip-to-content {
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
.skip-to-content:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 0.5rem 1rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  background: var(--color-amber);
  color: white;
  border-radius: 0.25rem;
  z-index: 50;
}
```

- [ ] **Step 2: Add skip link to App.tsx**

```tsx
<a href="#main-content" className="skip-to-content">
  跳转到主要内容
</a>
<div id="main-content" tabIndex={-1} />
```

Place the skip link as the first element inside `<AuthProvider>`.

- [ ] **Step 3: Run typecheck**

```bash
cd workspace/apps/web && npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/App.tsx
git commit -m "feat(a11y): add skip-to-content link and focus styles"
```

---

### Task 27: Add `useFocusTrap` hook

**Files:**
- Create: `workspace/apps/web/src/hooks/useFocusTrap.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// workspace/apps/web/src/hooks/__tests__/useFocusTrap.test.ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from '../useFocusTrap';
import { useRef } from 'react';

const FocusTrapTarget = ({ active }: { active: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div ref={ref}>
      <button>First</button>
      <button>Last</button>
    </div>
  );
};

describe('useFocusTrap', () => {
  it('focuses first element when activated', () => {
    render(<FocusTrapTarget active={true} />);
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('traps Tab key on last element', async () => {
    const user = userEvent.setup();
    render(<FocusTrapTarget active={true} />);
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    first.focus();
    await user.tab();
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
  });

  it('does not trap when inactive', async () => {
    const user = userEvent.setup();
    render(<FocusTrapTarget active={false} />);
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    first.focus();
    await user.tab();
    await user.tab();
    // Should not cycle back — let natural tab happen
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workspace/apps/web && npx vitest run src/hooks/__tests__/useFocusTrap.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// workspace/apps/web/src/hooks/useFocusTrap.ts
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusableElements = Array.from(
      ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

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
      previousFocusRef.current?.focus();
    };
  }, [ref, active]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workspace/apps/web && npx vitest run src/hooks/__tests__/useFocusTrap.test.ts`
Expected: PASS

- [ ] **Step 5: Update hooks barrel export**

In `src/hooks/index.ts`, add:
```typescript
export { useFocusTrap } from './useFocusTrap';
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFocusTrap.ts src/hooks/__tests__/useFocusTrap.test.ts src/hooks/index.ts
git commit -m "feat(hooks): add useFocusTrap for modal accessibility"
```

---

### Task 28: Integrate focus trap into CreateProjectModal

**Files:**
- Modify: `workspace/apps/web/src/features/epic-1/components/CreateProjectModal.tsx`

- [ ] **Step 1: Read CreateProjectModal**

- [ ] **Step 2: Add useFocusTrap to modal**

```typescript
import { useFocusTrap } from '../../../hooks';

export default function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = true; // or derived from props
  useFocusTrap(modalRef, isOpen);

  return (
    <dialog open={isOpen}>
      <div ref={modalRef}>
        {/* modal content */}
      </div>
    </dialog>
  );
}
```

- [ ] **Step 3: Run typecheck + tests**

```bash
cd workspace/apps/web && npm run typecheck && npx vitest run src/features/epic-1/components/__tests__/CreateProjectModal.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/features/epic-1/components/CreateProjectModal.tsx
git commit -m "feat(a11y): add focus trap to CreateProjectModal"
```

---

### Task 29: Final regression — full test suite

**Files:** All modified files

- [ ] **Step 1: Run full test suite**

```bash
cd workspace/apps/web && npm run typecheck && npm run test -- --run 2>&1 | tail -40
```

Expected:
- All tests pass
- Line coverage ≥ 80%
- Zero TypeScript errors

- [ ] **Step 2: Commit all remaining changes**

```bash
git add -A && git commit -m "chore: finalize frontend refactor — all rounds complete"
```

---

## Regression Checklist (after each round)

After each chunk, run:

```bash
cd workspace/apps/web && npm run typecheck   # must be zero errors
npm run test -- --run                         # must all pass, coverage ≥ 80%
```

**After all 4 rounds, run final check:**

```bash
cd workspace/apps/web && npm run typecheck && npm run test -- --run 2>&1 | grep -E "(%|FAIL|PASS|Error)"
```

Expected final state:
- All tests: PASS
- Line coverage: ≥ 80% (current baseline 83.41% — must not decrease)
- TypeScript: 0 errors
- Zero emoji icons in source code (verified by `grep -r "emoji\|✒️\|✨\|🔍\|✕\|✓\|◷\|📚\|➕" src/`)
