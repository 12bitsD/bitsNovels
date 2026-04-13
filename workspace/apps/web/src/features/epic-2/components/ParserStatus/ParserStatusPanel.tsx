import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, Sparkles, TriangleAlert, X } from 'lucide-react';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { useParserStatus } from '../../hooks/useParserStatus';
import BatchParseDialog from './BatchParseDialog';
import type { BatchParseStartInput, ParserChapterState, ParserToast, ParserVolumeOption } from './types';

interface ParserStatusPanelProps {
  projectId: string;
  activeChapterId: string | null;
  currentContent: string;
  volumes: ParserVolumeOption[];
}

const getToastClasses = (toast: ParserToast) => {
  switch (toast.type) {
    case 'success':
      return 'border-success/30 bg-success/10 text-success';
    case 'warning':
      return 'border-warning/30 bg-warning/10 text-warning';
    case 'error':
      return 'border-error/30 bg-error/10 text-error';
    default:
      return 'border-info/30 bg-info/10 text-info';
  }
};

const deriveChapterUiStatus = (
  chapterState: ParserChapterState,
): 'queued' | 'running' | 'succeeded' | 'failed' | 'retrying' | 'fallback' | 'no_content' | 'pending' => {
  if (chapterState.status === 'failed' && chapterState.fallback?.used) {
    return 'fallback';
  }

  if ((chapterState.status === 'queued' || chapterState.status === 'parsing') && chapterState.retryCount > 0) {
    return 'retrying';
  }

  if (chapterState.status === 'queued') {
    return 'queued';
  }

  if (chapterState.status === 'parsing') {
    return 'running';
  }

  if (chapterState.status === 'parsed') {
    return 'succeeded';
  }

  if (chapterState.status === 'failed') {
    return 'failed';
  }

  if (chapterState.status === 'no_content') {
    return 'no_content';
  }

  return 'pending';
};

const getUiStatusLabel = (status: ReturnType<typeof deriveChapterUiStatus>) => {
  switch (status) {
    case 'queued':
      return '排队中';
    case 'running':
      return '运行中';
    case 'succeeded':
      return '已成功';
    case 'failed':
      return '失败';
    case 'retrying':
      return '重试中';
    case 'fallback':
      return '已降级';
    case 'no_content':
      return '无内容';
    default:
      return '待解析';
  }
};

const getUiStatusClass = (status: ReturnType<typeof deriveChapterUiStatus>) => {
  switch (status) {
    case 'succeeded':
      return 'bg-success/10 text-success border-success/30';
    case 'failed':
    case 'fallback':
      return 'bg-error/10 text-error border-error/30';
    case 'running':
    case 'retrying':
      return 'bg-amber/10 text-amber border-amber/30';
    case 'queued':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'no_content':
      return 'bg-border/30 text-ink-light border-border/40';
    default:
      return 'bg-info/10 text-info border-info/30';
  }
};

export default function ParserStatusPanel({
  projectId,
  activeChapterId,
  currentContent,
  volumes,
}: ParserStatusPanelProps) {
  const {
    projectStatus,
    activeBatchJob,
    isLoading,
    isManualTriggering,
    retryingChapterId,
    toast,
    triggerManualParse,
    retryChapter,
    startBatchParse,
    cancelBatchParse,
    dismissToast,
  } = useParserStatus({ projectId, activeChapterId, currentContent });

  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchScope, setBatchScope] = useState<'all' | 'volume' | 'selected'>('all');
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | null>(volumes[0]?.id ?? null);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);

  const pendingCount = projectStatus?.pendingCount ?? 0;

  const totalChapterCount = useMemo(() => volumes.flatMap((volume) => volume.chapters).length, [volumes]);
  const chapterTitleMap = useMemo(
    () =>
      volumes
        .flatMap((volume) => volume.chapters)
        .reduce<Record<string, string>>((accumulator, chapter) => {
          accumulator[chapter.id] = chapter.title;
          return accumulator;
        }, {}),
    [volumes],
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => dismissToast(), 3_000);
    return () => clearTimeout(timer);
  }, [dismissToast, toast]);

  const openBatchDialog = (scope: 'all' | 'volume' | 'selected') => {
    setBatchScope(scope);
    if (scope === 'all') {
      setSelectedChapterIds([]);
    }
    setDialogOpen(true);
    setMenuOpen(false);
  };

  const handleChapterToggle = (chapterId: string) => {
    setSelectedChapterIds((currentIds) =>
      currentIds.includes(chapterId)
        ? currentIds.filter((id) => id !== chapterId)
        : [...currentIds, chapterId],
    );
  };

  const handleBatchStart = async () => {
    const payload: BatchParseStartInput =
      batchScope === 'volume'
        ? { scope: 'volume', volumeId: selectedVolumeId ?? undefined }
        : batchScope === 'selected'
          ? { scope: 'selected', chapterIds: selectedChapterIds }
          : { scope: 'all' };

    await startBatchParse(payload);
  };

  const globalStatus = pendingCount === 0 ? '全部已同步' : `${pendingCount} 章待解析`;

  return (
    <section className="relative overflow-hidden rounded-lg border border-border/30 bg-white shadow-card" aria-label="Parser 状态面板">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber/10">
            <Sparkles size={18} className="text-amber" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-ink">Parser 状态</h2>
              {pendingCount === 0 ? (
                <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
              ) : (
                <TriangleAlert size={14} className="text-warning" aria-hidden="true" />
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-ink">{isLoading ? '正在同步解析状态...' : globalStatus}</p>
            {activeBatchJob && (
              <p className="mt-1 text-xs text-ink-light">批量任务进行中</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LoadingButton
            type="button"
            loading={isManualTriggering}
            loadingText="解析中..."
            onClick={() => void triggerManualParse()}
            className="w-auto px-4"
          >
            重新解析当前章节
          </LoadingButton>

          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="btn-secondary flex w-auto items-center gap-2 px-4"
            >
              批量重新解析
              <ChevronDown size={14} />
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-40 rounded-md border border-border/40 bg-white p-1 shadow-float">
                <button type="button" role="menuitem" onClick={() => openBatchDialog('all')} className="block w-full rounded px-3 py-2 text-left text-sm text-ink hover:bg-parchment">
                  全书
                </button>
                <button type="button" role="menuitem" onClick={() => openBatchDialog('volume')} className="block w-full rounded px-3 py-2 text-left text-sm text-ink hover:bg-parchment">
                  指定卷
                </button>
                <button type="button" role="menuitem" onClick={() => openBatchDialog('selected')} className="block w-full rounded px-3 py-2 text-left text-sm text-ink hover:bg-parchment">
                  手动勾选
                </button>
              </div>
            )}
          </div>

          {activeBatchJob && (
            <button type="button" onClick={() => void cancelBatchParse()} className="btn-secondary w-auto px-4">
              取消剩余任务
            </button>
          )}
        </div>
      </div>

      {activeBatchJob && (
        <div className="border-t border-border/20 bg-parchment/20 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-sm text-ink">
            <span>{activeBatchJob.completedChapters}/{activeBatchJob.totalChapters}</span>
            <span className="font-mono text-ink-light">{activeBatchJob.progress ?? 0}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/40">
            <div className="h-full bg-amber transition-all" style={{ width: `${activeBatchJob.progress ?? 0}%` }} />
          </div>
        </div>
      )}

      {!isLoading && (projectStatus?.chapters?.length ?? 0) > 0 && (
        <div className="border-t border-border/20 px-4 py-3">
          <ul className="space-y-2">
            {(projectStatus?.chapters ?? []).map((chapterState) => {
              const uiStatus = deriveChapterUiStatus(chapterState);
              return (
                <li key={chapterState.chapterId} className="rounded-md border border-border/20 bg-parchment/10 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink">
                    {chapterTitleMap[chapterState.chapterId] ?? chapterState.chapterId}
                  </span>
                  <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${getUiStatusClass(uiStatus)}`}>
                    {getUiStatusLabel(uiStatus)}
                  </span>
                </div>
                {chapterState.status === 'failed' && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-error">
                    <TriangleAlert size={14} aria-label="解析失败" />
                    <span>{chapterState.failureReason ?? '解析失败'}</span>
                  </div>
                )}
                {chapterState.fallback?.used && (
                  <p className="mt-1 text-xs text-warning">
                    降级原因：{chapterState.fallback.reason ?? 'degraded_mode'}
                  </p>
                )}
                {chapterState.status === 'failed' && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => void retryChapter(chapterState.chapterId)}
                      className="btn-secondary w-auto px-3 py-1 text-xs"
                      aria-label={`重试解析 ${chapterTitleMap[chapterState.chapterId] ?? chapterState.chapterId}`}
                    >
                      重试解析
                    </button>
                  </div>
                )}
                {(chapterState.status === 'queued' || chapterState.status === 'parsing') &&
                  retryingChapterId === chapterState.chapterId && (
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled
                        className="btn-secondary w-auto cursor-not-allowed px-3 py-1 text-xs opacity-60"
                        aria-label={`重试中 ${chapterTitleMap[chapterState.chapterId] ?? chapterState.chapterId}`}
                      >
                        重试中
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {toast && (
        <div aria-live="polite" className="pointer-events-none absolute right-4 top-4 z-30 w-80">
          <div className={`pointer-events-auto rounded-md border p-3 shadow-float ${getToastClasses(toast)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description && <p className="mt-1 text-sm">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={dismissToast}
                aria-label="关闭提示"
                className="rounded p-1 opacity-80 transition hover:bg-white/40 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <BatchParseDialog
        isOpen={dialogOpen}
        volumes={volumes}
        scope={batchScope}
        selectedVolumeId={selectedVolumeId}
        selectedChapterIds={selectedChapterIds}
        activeJob={activeBatchJob}
        onClose={() => setDialogOpen(false)}
        onScopeChange={setBatchScope}
        onVolumeChange={setSelectedVolumeId}
        onChapterToggle={handleChapterToggle}
        onStart={() => void handleBatchStart()}
        onCancel={() => void cancelBatchParse()}
      />

      {!isLoading && totalChapterCount === 0 && (
        <div className="flex items-center gap-2 border-t border-border/20 px-4 py-3 text-sm text-ink-light">
          <Loader2 size={14} className="text-amber" />
          暂无可解析章节
        </div>
      )}
    </section>
  );
}
