import {
  PenLine, Sparkles, Search, X, XCircle, CheckCircle,
  Loader2, BookOpen, Plus, Check, Feather, Scroll,
  GitBranch, Clock, MapPin, Compass, Archive, AlertCircle, Folder
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

// CSS variables for theme-aware coloring
const amber = 'var(--color-amber)';
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

  // Theme (amber icons for the writing app aesthetic)
  Sparkles: (props: LucideProps) => <Sparkles {...props} color={amber} strokeWidth={1.5} />,
  BookOpen: (props: LucideProps) => <BookOpen {...props} color={amber} strokeWidth={1.5} />,
  Feather: (props: LucideProps) => <Feather {...props} color={amber} strokeWidth={1.5} />,
  Scroll: (props: LucideProps) => <Scroll {...props} color={amber} strokeWidth={1.5} />,
  Archive: (props: LucideProps) => <Archive {...props} color={amber} strokeWidth={1.5} />,
  Folder: (props: LucideProps) => <Folder {...props} color={amber} strokeWidth={1.5} />,

  // UI
  GitBranch: (props: LucideProps) => <GitBranch {...props} color={inkLight} strokeWidth={1.5} />,
  Clock: (props: LucideProps) => <Clock {...props} color={inkLight} strokeWidth={1.5} />,
  MapPin: (props: LucideProps) => <MapPin {...props} color={amber} strokeWidth={1.5} />,
  Compass: (props: LucideProps) => <Compass {...props} color={amber} strokeWidth={1.5} />,
};

export type { LucideProps };
