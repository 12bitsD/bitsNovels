import { Sparkles, X } from 'lucide-react';

import type { StoryCopilotMode, StoryCopilotScaffoldState, StoryCopilotSession } from '../types';

const MODE_LABELS: Record<StoryCopilotMode, string> = {
  worldbuild: '想设定',
  plot_derive_lite: '推剧情',
  story_diagnose: '看建议',
};

interface StoryCopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: StoryCopilotMode;
  onModeChange: (mode: StoryCopilotMode) => void;
  state: StoryCopilotScaffoldState;
  sessions: StoryCopilotSession[];
}

export function StoryCopilotPanel({
  isOpen,
  onClose,
  activeMode,
  onModeChange,
  state,
  sessions,
}: StoryCopilotPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-[420px] max-w-full flex-col border-l border-border bg-surface-panel shadow-2xl">
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--color-amber)]">
            <Sparkles size={16} />
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Story Copilot</p>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">统一 AI 创作入口</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">围绕会话、草稿卡片与建议面板搭建 Epic 4 交互骨架。</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel-muted)] hover:text-[var(--color-text-primary)]"
          aria-label="关闭 Story Copilot"
        >
          <X size={18} />
        </button>
      </div>

      <div className="border-b border-border px-5 py-3" role="tablist" aria-label="Story Copilot 模式">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MODE_LABELS) as StoryCopilotMode[]).map((mode) => {
            const isActive = mode === activeMode;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onModeChange(mode)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-[var(--color-amber)]/45 bg-[var(--color-amber-light)]/70 text-[var(--color-text-primary)]'
                    : 'border-border bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-panel-muted)]'
                }`}
              >
                {MODE_LABELS[mode]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Recent Sessions</p>
            <h3 className="mt-1 font-semibold text-[var(--color-text-primary)]">最近会话</h3>
          </div>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-border bg-surface-panel-muted/55 p-3">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{session.title}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {MODE_LABELS[session.mode]} · {session.status === 'completed' ? '已完成' : '进行中'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Scaffold</p>
            <h3 className="mt-1 font-semibold text-[var(--color-text-primary)]">{state.headline}</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{state.description}</p>
          </div>
          <div className="space-y-3">
            {state.cards.map((card) => (
              <article key={card.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <h4 className="font-medium text-[var(--color-text-primary)]">{card.title}</h4>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{card.summary}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                    {MODE_LABELS[activeMode]}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--color-amber)]/30 bg-[var(--color-amber-light)]/60 px-3 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-amber)]/50"
                  >
                    {card.actionLabel}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export default StoryCopilotPanel;
