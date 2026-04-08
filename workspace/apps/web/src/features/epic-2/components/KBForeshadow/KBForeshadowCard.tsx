import { AlertTriangle, BookOpen, CheckCircle2, CircleDashed, Ban, Sparkles } from 'lucide-react';
import type { KBForeshadow } from './types';
import { FORESHADOW_STATUS_LABELS } from './types';

interface KBForeshadowCardProps {
  foreshadow: KBForeshadow;
  selected?: boolean;
  onClick?: (foreshadow: KBForeshadow) => void;
}

const STATUS_ICON_MAP = {
  unresolved: CircleDashed,
  partially_resolved: BookOpen,
  resolved: CheckCircle2,
  abandoned: Ban,
};

export default function KBForeshadowCard({
  foreshadow,
  selected = false,
  onClick,
}: KBForeshadowCardProps) {
  const StatusIcon = STATUS_ICON_MAP[foreshadow.status];
  const isOverdue = foreshadow.notifyState.warned;

  return (
    <button
      type="button"
      aria-label={`伏笔: ${foreshadow.name}`}
      onClick={() => onClick?.(foreshadow)}
      className={`
        w-full text-left rounded-lg border bg-white p-4 transition-all hover:shadow-md
        ${isOverdue ? 'border-[var(--color-error)] bg-[var(--color-error)]/5' : ''}
        ${selected ? 'border-[var(--color-amber)] ring-2 ring-[var(--color-amber)]/15' : ''}
        ${!isOverdue && !selected ? 'border-[var(--color-border)]' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-[var(--color-ink)]">{foreshadow.name}</h3>
            {foreshadow.source === 'ai' && !foreshadow.confirmed && (
              <span className="rounded bg-[var(--color-warning)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-warning)]">
                AI识别-待确认
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--color-error)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-error)]">
                <AlertTriangle size={12} />
                超期警告
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-ink-light)]">
            <span className="inline-flex items-center gap-1">
              <StatusIcon size={14} />
              {FORESHADOW_STATUS_LABELS[foreshadow.status]}
            </span>
            <span>埋设章节 {foreshadow.plantedChapterId}</span>
            {foreshadow.expectedResolveChapterId && (
              <span>预期回收 {foreshadow.expectedResolveChapterId}</span>
            )}
          </div>
        </div>

        {foreshadow.aiSuggestions.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-[var(--color-amber)]/10 px-2 py-1 text-xs font-medium text-[var(--color-amber)]">
            <Sparkles size={12} />
            AI建议 {foreshadow.aiSuggestions.length}
          </span>
        )}
      </div>
    </button>
  );
}
