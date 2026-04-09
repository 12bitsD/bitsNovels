import { useEffect, useState } from 'react';
import { AlertTriangle, Sparkles, X } from 'lucide-react';
import { FormInput } from '../../../../components/ui/FormInput';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import type { KBForeshadow, KBForeshadowSuggestion, UpdateKBForeshadowInput } from './types';
import { FORESHADOW_STATUS_LABELS, FORESHADOW_STATUS_ORDER } from './types';

interface KBForeshadowDetailProps {
  foreshadow: KBForeshadow;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: UpdateKBForeshadowInput) => void | Promise<void>;
  onConfirmSuggestion: (suggestion: KBForeshadowSuggestion) => void | Promise<void>;
}

interface FormState {
  name: string;
  summary: string;
  quote: string;
  status: KBForeshadow['status'];
  expectedResolveChapterId: string;
  resolvedChapterId: string;
  resolveNote: string;
}

function buildState(foreshadow: KBForeshadow): FormState {
  return {
    name: foreshadow.name,
    summary: foreshadow.summary,
    quote: foreshadow.quote,
    status: foreshadow.status,
    expectedResolveChapterId: foreshadow.expectedResolveChapterId ?? '',
    resolvedChapterId: foreshadow.resolvedChapterId ?? '',
    resolveNote: foreshadow.resolveNote ?? '',
  };
}

export default function KBForeshadowDetail({
  foreshadow,
  saving = false,
  onClose,
  onSave,
  onConfirmSuggestion,
}: KBForeshadowDetailProps) {
  const [form, setForm] = useState<FormState>(() => buildState(foreshadow));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(buildState(foreshadow));
    setError(null);
  }, [foreshadow]);

  const handleSubmit = async () => {
    if (form.status === 'resolved' && (!form.resolvedChapterId.trim() || !form.resolveNote.trim())) {
      setError('已回收状态需要填写回收章节和回收说明');
      return;
    }

    setError(null);

    await onSave({
      name: form.name,
      summary: form.summary,
      quote: form.quote,
      status: form.status,
      expectedResolveChapterId: form.expectedResolveChapterId || undefined,
      resolvedChapterId: form.resolvedChapterId || undefined,
      resolveNote: form.resolveNote || undefined,
    });
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">伏笔详情</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-light)]">埋设章节 {foreshadow.plantedChapterId}</p>
        </div>
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="rounded-md p-1.5 text-[var(--color-ink-light)] transition-colors hover:bg-[var(--color-parchment)] hover:text-[var(--color-ink)]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {foreshadow.notifyState.warned && (
          <div className="flex items-center gap-2 rounded-md border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]">
            <AlertTriangle size={16} />
            该伏笔已超出预期回收进度，请尽快处理。
          </div>
        )}

        <FormInput
          id="foreshadow-name"
          label="名称"
          value={form.name}
          onChange={(value) => setForm((current) => ({ ...current, name: value }))}
        />

        <div>
          <label htmlFor="foreshadow-summary" className="mb-1.5 block text-sm font-medium text-ink-light">
            摘要
          </label>
          <textarea
            id="foreshadow-summary"
            value={form.summary}
            onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
            className="input-base min-h-24 resize-y"
          />
        </div>

        <div>
          <label htmlFor="foreshadow-quote" className="mb-1.5 block text-sm font-medium text-ink-light">
            原文引用
          </label>
          <textarea
            id="foreshadow-quote"
            value={form.quote}
            onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
            className="input-base min-h-24 resize-y"
          />
        </div>

        <FormInput
          id="foreshadow-planted-chapter"
          label="埋设章节"
          value={foreshadow.plantedChapterId}
          onChange={() => undefined}
          disabled
        />

        <div>
          <label htmlFor="foreshadow-status" className="mb-1.5 block text-sm font-medium text-ink-light">
            状态
          </label>
          <select
            id="foreshadow-status"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as KBForeshadow['status'] }))}
            className="input-base"
          >
            {FORESHADOW_STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {FORESHADOW_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <FormInput
          id="foreshadow-expected-chapter"
          label="预期回收章节"
          value={form.expectedResolveChapterId}
          onChange={(value) => setForm((current) => ({ ...current, expectedResolveChapterId: value }))}
        />

        <FormInput
          id="foreshadow-resolved-chapter"
          label="回收章节"
          value={form.resolvedChapterId}
          onChange={(value) => setForm((current) => ({ ...current, resolvedChapterId: value }))}
        />

        <div>
          <label htmlFor="foreshadow-resolve-note" className="mb-1.5 block text-sm font-medium text-ink-light">
            回收说明
          </label>
          <textarea
            id="foreshadow-resolve-note"
            value={form.resolveNote}
            onChange={(event) => setForm((current) => ({ ...current, resolveNote: event.target.value }))}
            className="input-base min-h-24 resize-y"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        <section className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment)]/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Sparkles size={16} className="text-[var(--color-amber)]" />
            AI 建议
          </div>

          {foreshadow.aiSuggestions.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-light)]">暂无 AI 建议</p>
          ) : (
            foreshadow.aiSuggestions.map((suggestion) => (
              <div key={`${suggestion.chapterId}-${suggestion.createdAt}`} className="rounded-md bg-white p-3 shadow-sm">
                <p className="text-sm text-[var(--color-ink)]">{suggestion.message}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--color-ink-light)]">
                  <span>建议章节 {suggestion.chapterId}</span>
                  <button
                    type="button"
                    onClick={() => onConfirmSuggestion(suggestion)}
                    className="rounded-md bg-[var(--color-amber)] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[var(--color-amber-dark)]"
                  >
                    确认 AI 建议
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="border-t border-[var(--color-border)] p-4">
        <LoadingButton loading={saving} loadingText="保存中..." type="button" onClick={handleSubmit}>
          保存伏笔
        </LoadingButton>
      </div>
    </div>
  );
}
