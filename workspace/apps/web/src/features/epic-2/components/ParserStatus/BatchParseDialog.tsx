import { X } from 'lucide-react';
import type { ParserBatchJob, ParserVolumeOption } from './types';

interface BatchParseDialogProps {
  isOpen: boolean;
  volumes: ParserVolumeOption[];
  scope: 'all' | 'volume' | 'selected';
  selectedVolumeId: string | null;
  selectedChapterIds: string[];
  activeJob?: ParserBatchJob | null;
  onClose: () => void;
  onScopeChange: (scope: 'all' | 'volume' | 'selected') => void;
  onVolumeChange: (volumeId: string | null) => void;
  onChapterToggle: (chapterId: string) => void;
  onStart: () => void;
  onCancel?: () => void;
}

const estimateMinutes = (chapterCount: number) => Math.max(1, Math.ceil(chapterCount / 3));

const getSelectableChapters = (
  volumes: ParserVolumeOption[],
  scope: 'all' | 'volume' | 'selected',
  selectedVolumeId: string | null,
) => {
  if (scope === 'volume' && selectedVolumeId) {
    return volumes.find((volume) => volume.id === selectedVolumeId)?.chapters ?? [];
  }

  return volumes.flatMap((volume) => volume.chapters);
};

export default function BatchParseDialog({
  isOpen,
  volumes,
  scope,
  selectedVolumeId,
  selectedChapterIds,
  activeJob,
  onClose,
  onScopeChange,
  onVolumeChange,
  onChapterToggle,
  onStart,
  onCancel,
}: BatchParseDialogProps) {
  if (!isOpen) {
    return null;
  }

  const selectableChapters = getSelectableChapters(volumes, scope, selectedVolumeId);
  const chapterCount =
    scope === 'selected'
      ? selectedChapterIds.length
      : scope === 'volume'
        ? selectableChapters.length
        : volumes.flatMap((volume) => volume.chapters).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="批量重新解析"
        className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/30 bg-parchment/40 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">批量重新解析</h2>
            <p className="mt-1 text-sm text-ink-light">共 {chapterCount} 章，预计耗时约 {estimateMinutes(chapterCount)} 分钟</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭批量重新解析对话框"
            className="rounded p-1.5 text-ink-light transition-colors hover:bg-parchment hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink-light">解析范围</legend>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="batch-scope" checked={scope === 'all'} onChange={() => onScopeChange('all')} aria-label="全书" />
              全书
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="batch-scope" checked={scope === 'volume'} onChange={() => onScopeChange('volume')} aria-label="指定卷" />
              指定卷
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="batch-scope" checked={scope === 'selected'} onChange={() => onScopeChange('selected')} aria-label="手动勾选" />
              手动勾选
            </label>
          </fieldset>

          {scope === 'volume' && (
            <div>
              <label htmlFor="parser-volume-select" className="mb-1.5 block text-sm font-medium text-ink-light">
                选择卷
              </label>
              <select
                id="parser-volume-select"
                value={selectedVolumeId ?? ''}
                onChange={(event) => onVolumeChange(event.target.value || null)}
                className="input-base"
              >
                <option value="">请选择卷</option>
                {volumes.map((volume) => (
                  <option key={volume.id} value={volume.id}>
                    {volume.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === 'selected' && (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border/40 bg-parchment/10 p-3">
              {volumes.flatMap((volume) => volume.chapters).map((chapter) => (
                <label key={chapter.id} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={selectedChapterIds.includes(chapter.id)}
                    onChange={() => onChapterToggle(chapter.id)}
                    aria-label={chapter.title}
                  />
                  {chapter.title}
                </label>
              ))}
            </div>
          )}

          {activeJob && (
            <div className="space-y-3 rounded-md border border-border/40 bg-parchment/20 p-4">
              <div className="flex items-center justify-between text-sm text-ink">
                <span>{activeJob.completedChapters}/{activeJob.totalChapters} 章节解析完成</span>
                <span className="font-mono text-ink-light">{activeJob.progress ?? 0}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="批量解析进度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={activeJob.progress ?? 0}
                className="h-2 overflow-hidden rounded-full bg-border/40"
              >
                <div
                  className="h-full bg-amber transition-all"
                  style={{ width: `${activeJob.progress ?? 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border/30 bg-parchment/20 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary w-auto px-4">
            关闭
          </button>
          {activeJob ? (
            <button type="button" onClick={onCancel} className="btn-secondary w-auto px-4">
              取消剩余任务
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={chapterCount === 0}
              className="btn-primary w-auto px-4"
            >
              开始解析
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
