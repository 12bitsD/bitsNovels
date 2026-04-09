import { useEffect, useState } from 'react';
import { FormInput } from '../../../../components/ui/FormInput';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import type { CreateKBForeshadowInput } from './types';

interface CreateForeshadowDialogProps {
  open: boolean;
  creating?: boolean;
  onClose: () => void;
  onCreate: (payload: CreateKBForeshadowInput) => void | Promise<void>;
}

const EMPTY_FORM: CreateKBForeshadowInput = {
  name: '',
  summary: '',
  plantedChapterId: '',
  quote: '',
  expectedResolveChapterId: '',
};

export default function CreateForeshadowDialog({
  open,
  creating = false,
  onClose,
  onCreate,
}: CreateForeshadowDialogProps) {
  const [form, setForm] = useState<CreateKBForeshadowInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(EMPTY_FORM);
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('请填写伏笔名称');
      return;
    }
    if (!form.summary.trim()) {
      setError('请填写摘要');
      return;
    }
    if (!form.plantedChapterId.trim()) {
      setError('请填写埋设章节');
      return;
    }

    setError(null);
    await onCreate({
      ...form,
      expectedResolveChapterId: form.expectedResolveChapterId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">手动创建伏笔</h2>
        </div>

        <div className="space-y-4 px-6 py-5">
          <FormInput
            id="create-foreshadow-name"
            label="伏笔名称"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />

          <div>
            <label htmlFor="create-foreshadow-summary" className="mb-1.5 block text-sm font-medium text-ink-light">
              摘要
            </label>
            <textarea
              id="create-foreshadow-summary"
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              className="input-base min-h-24 resize-y"
            />
          </div>

          <FormInput
            id="create-foreshadow-planted"
            label="埋设章节"
            value={form.plantedChapterId}
            onChange={(value) => setForm((current) => ({ ...current, plantedChapterId: value }))}
          />

          <div>
            <label htmlFor="create-foreshadow-quote" className="mb-1.5 block text-sm font-medium text-ink-light">
              原文引用
            </label>
            <textarea
              id="create-foreshadow-quote"
              value={form.quote}
              onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
              className="input-base min-h-24 resize-y"
            />
          </div>

          <FormInput
            id="create-foreshadow-expected"
            label="预期回收章节"
            value={form.expectedResolveChapterId ?? ''}
            onChange={(value) => setForm((current) => ({ ...current, expectedResolveChapterId: value }))}
          />

          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-gray-200"
          >
            取消
          </button>
          <LoadingButton loading={creating} loadingText="创建中..." type="button" className="w-auto px-5" onClick={handleSubmit}>
            创建伏笔
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
