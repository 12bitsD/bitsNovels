import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { client } from '../../../api/client';
import type {
  BatchParseStartInput,
  ParserBatchJob,
  ParserChapterState,
  ParserProjectStatus,
  ParserToast,
} from '../components/ParserStatus/types';

interface UseParserStatusOptions {
  projectId: string;
  activeChapterId?: string | null;
  currentContent?: string;
  autoTriggerDebounceMs?: number;
  progressPollMs?: number;
  completionPollMs?: number;
}

interface ChapterContentResponse {
  chapter?: {
    content?: string;
  };
}

interface UseParserStatusReturn {
  projectStatus: ParserProjectStatus | null;
  chapterStates: Record<string, ParserChapterState>;
  activeBatchJob: ParserBatchJob | null;
  isLoading: boolean;
  isManualTriggering: boolean;
  retryingChapterId: string | null;
  toast: ParserToast | null;
  triggerManualParse: () => Promise<void>;
  retryChapter: (chapterId: string, contentOverride?: string) => Promise<void>;
  startBatchParse: (input: BatchParseStartInput) => Promise<void>;
  cancelBatchParse: () => Promise<void>;
  dismissToast: () => void;
  refreshProjectStatus: () => Promise<void>;
  getChapterState: (chapterId: string) => ParserChapterState | undefined;
}

const DEFAULT_SUMMARY = {
  noContentCount: 0,
  pendingCount: 0,
  queuedCount: 0,
  parsingCount: 0,
  parsedCount: 0,
  failedCount: 0,
  cancelledCount: 0,
};

const TERMINAL_CHAPTER_STATUSES = new Set(['parsed', 'failed', 'no_content']);
const TERMINAL_BATCH_STATUSES = new Set(['completed', 'failed', 'cancelled']);

const mergeChapterStates = (states: ParserChapterState[]) =>
  states.reduce<Record<string, ParserChapterState>>((accumulator, state) => {
    accumulator[state.chapterId] = state;
    return accumulator;
  }, {});

const buildSuccessToastDescription = (state: ParserChapterState) => {
  const summary = state.resultSummary;

  if (!summary) {
    return '解析结果已同步到知识库。';
  }

  return `新增角色 ${summary.newCharacters}，地点 ${summary.newLocations}，道具 ${summary.newItems}。`;
};

export function useParserStatus({
  projectId,
  activeChapterId = null,
  currentContent = '',
  autoTriggerDebounceMs = 60_000,
  progressPollMs = 2_000,
  completionPollMs = 2_000,
}: UseParserStatusOptions): UseParserStatusReturn {
  const [projectStatus, setProjectStatus] = useState<ParserProjectStatus | null>(null);
  const [chapterStates, setChapterStates] = useState<Record<string, ParserChapterState>>({});
  const [activeBatchJob, setActiveBatchJob] = useState<ParserBatchJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManualTriggering, setIsManualTriggering] = useState(false);
  const [retryingChapterId, setRetryingChapterId] = useState<string | null>(null);
  const [toast, setToast] = useState<ParserToast | null>(null);

  const previousActiveChapterIdRef = useRef<string | null>(null);
  const previousActiveContentRef = useRef('');
  const lastTriggeredSnapshotsRef = useRef<Record<string, string>>({});
  const autoTriggerTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const chapterPollingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const batchPollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoTriggerTimer = useCallback((chapterId: string) => {
    const timer = autoTriggerTimersRef.current[chapterId];

    if (timer) {
      clearTimeout(timer);
      delete autoTriggerTimersRef.current[chapterId];
    }
  }, []);

  const clearChapterPollingTimer = useCallback((chapterId: string) => {
    const timer = chapterPollingTimersRef.current[chapterId];

    if (timer) {
      clearTimeout(timer);
      delete chapterPollingTimersRef.current[chapterId];
    }
  }, []);

  const clearBatchPollingTimer = useCallback(() => {
    if (batchPollingTimerRef.current) {
      clearTimeout(batchPollingTimerRef.current);
      batchPollingTimerRef.current = null;
    }
  }, []);

  const refreshProjectStatus = useCallback(async () => {
    const { data } = await client.GET(`/api/projects/${projectId}/parser/status`);
    const nextStatus = (data ?? {
      projectId,
      pendingCount: 0,
      summary: DEFAULT_SUMMARY,
      activeBatchJobs: [],
      chapters: [],
    }) as ParserProjectStatus;

    setProjectStatus(nextStatus);
    setChapterStates((currentStates) => ({
      ...currentStates,
      ...mergeChapterStates(nextStatus.chapters ?? []),
    }));

    const runningJob = (nextStatus.activeBatchJobs ?? []).find((job) => !TERMINAL_BATCH_STATUSES.has(job.status));
    if (runningJob) {
      setActiveBatchJob(runningJob);
    }

    setIsLoading(false);
  }, [projectId]);

  const fetchChapterStatus = useCallback(async (chapterId: string) => {
    const { data } = await client.GET(`/api/projects/${projectId}/parser/chapters/${chapterId}/status`);
    const nextState = (data as { state?: ParserChapterState } | undefined)?.state;

    if (nextState) {
      setChapterStates((currentStates) => ({
        ...currentStates,
        [chapterId]: nextState,
      }));
    }

    return nextState;
  }, [projectId]);

  const pollChapterUntilTerminal = useCallback(
    (chapterId: string) =>
      new Promise<ParserChapterState | undefined>((resolve, reject) => {
        const poll = async () => {
          try {
            const nextState = await fetchChapterStatus(chapterId);

            if (!nextState) {
              resolve(undefined);
              return;
            }

            if (TERMINAL_CHAPTER_STATUSES.has(nextState.status)) {
              clearChapterPollingTimer(chapterId);
              resolve(nextState);
              return;
            }

            chapterPollingTimersRef.current[chapterId] = setTimeout(poll, completionPollMs);
          } catch (error) {
            clearChapterPollingTimer(chapterId);
            reject(error);
          }
        };

        void poll();
      }),
    [clearChapterPollingTimer, completionPollMs, fetchChapterStatus],
  );

  const scheduleBatchProgressPoll = useCallback(
    (jobId: string) => {
      clearBatchPollingTimer();

      const poll = async () => {
        const { data } = await client.GET(`/api/projects/${projectId}/parser/batch/${jobId}/progress`);
        const nextJob = (data as { job?: ParserBatchJob } | undefined)?.job ?? null;

        if (!nextJob) {
          return;
        }

        setActiveBatchJob(nextJob);

        if (TERMINAL_BATCH_STATUSES.has(nextJob.status)) {
          await refreshProjectStatus();

          if (nextJob.status === 'completed') {
            setToast({ type: 'success', title: '批量解析完成', description: `已完成 ${nextJob.completedChapters}/${nextJob.totalChapters} 章。` });
          } else if (nextJob.status === 'failed') {
            setToast({ type: 'error', title: '批量解析失败', description: '请稍后重试未完成的章节。' });
          }

          clearBatchPollingTimer();
          return;
        }

        batchPollingTimerRef.current = setTimeout(poll, progressPollMs);
      };

      batchPollingTimerRef.current = setTimeout(poll, progressPollMs);
    },
    [clearBatchPollingTimer, progressPollMs, projectId, refreshProjectStatus],
  );

  const getChapterContent = useCallback(
    async (chapterId: string, fallbackContent?: string) => {
      if (fallbackContent && fallbackContent.trim()) {
        return fallbackContent;
      }

      const { data } = await client.GET(`/api/projects/${projectId}/chapters/${chapterId}`);
      const response = data as ChapterContentResponse | undefined;
      return response?.chapter?.content ?? '';
    },
    [projectId],
  );

  const sendAutoTrigger = useCallback(
    async (chapterId: string, content: string) => {
      if (!content.trim()) {
        return;
      }

      await client.POST(`/api/projects/${projectId}/parser/chapters/${chapterId}/auto-trigger`, {
        body: { content },
      });

      lastTriggeredSnapshotsRef.current[chapterId] = content;
      setChapterStates((currentStates) => ({
        ...currentStates,
        [chapterId]: {
          chapterId,
          retryCount: currentStates[chapterId]?.retryCount ?? 0,
          status: 'queued',
          trigger: 'auto',
        },
      }));
      await refreshProjectStatus();
    },
    [projectId, refreshProjectStatus],
  );

  const triggerManualParse = useCallback(async () => {
    if (!activeChapterId) {
      return;
    }

    setIsManualTriggering(true);
    clearAutoTriggerTimer(activeChapterId);

    try {
      const content = await getChapterContent(activeChapterId, currentContent);
      await client.POST(`/api/projects/${projectId}/parser/chapters/${activeChapterId}/trigger`, {
        body: { content },
      });

      lastTriggeredSnapshotsRef.current[activeChapterId] = content;
      const completedState = await pollChapterUntilTerminal(activeChapterId);
      await refreshProjectStatus();

      if (completedState?.status === 'parsed') {
        setToast({
          type: 'success',
          title: '解析完成',
          description: buildSuccessToastDescription(completedState),
        });
      }

      if (completedState?.status === 'failed') {
        setToast({
          type: 'error',
          title: '解析失败',
          description: completedState.failureReason ?? '请稍后重试当前章节。',
        });
      }
    } finally {
      setIsManualTriggering(false);
    }
  }, [
    activeChapterId,
    clearAutoTriggerTimer,
    currentContent,
    getChapterContent,
    pollChapterUntilTerminal,
    projectId,
    refreshProjectStatus,
  ]);

  const retryChapter = useCallback(async (chapterId: string, contentOverride?: string) => {
    setRetryingChapterId(chapterId);

    try {
      const content = await getChapterContent(chapterId, contentOverride);
      await client.POST(`/api/projects/${projectId}/parser/chapters/${chapterId}/trigger`, {
        body: { content },
      });

      lastTriggeredSnapshotsRef.current[chapterId] = content;
      const completedState = await pollChapterUntilTerminal(chapterId);
      await refreshProjectStatus();

      if (completedState?.status === 'parsed') {
        setToast({
          type: 'success',
          title: '解析完成',
          description: buildSuccessToastDescription(completedState),
        });
      }

      if (completedState?.status === 'failed') {
        setToast({
          type: 'error',
          title: '解析失败',
          description: completedState.failureReason ?? '请稍后再试。',
        });
      }
    } finally {
      setRetryingChapterId(null);
    }
  }, [getChapterContent, pollChapterUntilTerminal, projectId, refreshProjectStatus]);

  const startBatchParse = useCallback(async (input: BatchParseStartInput) => {
    const { data } = await client.POST(`/api/projects/${projectId}/parser/batch`, {
      body: input,
    });

    const nextJob = (data as { job?: ParserBatchJob } | undefined)?.job ?? null;
    if (!nextJob) {
      return;
    }

    setActiveBatchJob(nextJob);
    setToast({ type: 'info', title: '批量解析已开始', description: `共 ${nextJob.totalChapters} 章，正在同步解析进度。` });
    scheduleBatchProgressPoll(nextJob.id);
  }, [projectId, scheduleBatchProgressPoll]);

  const cancelBatchParse = useCallback(async () => {
    if (!activeBatchJob) {
      return;
    }

    const { data } = await client.POST(`/api/projects/${projectId}/parser/batch/${activeBatchJob.id}/cancel`);
    const cancelledJob = (data as { job?: ParserBatchJob } | undefined)?.job ?? null;

    if (cancelledJob) {
      clearBatchPollingTimer();
      setActiveBatchJob(cancelledJob);
      setToast({ type: 'warning', title: '已取消剩余任务', description: '未开始的章节解析任务已停止。' });
      await refreshProjectStatus();
    }
  }, [activeBatchJob, clearBatchPollingTimer, projectId, refreshProjectStatus]);

  const getChapterState = useCallback((chapterId: string) => chapterStates[chapterId], [chapterStates]);

  const compensationPayload = useMemo(
    () => ({ chapterId: activeChapterId, content: currentContent }),
    [activeChapterId, currentContent],
  );

  useEffect(() => {
    void refreshProjectStatus();
  }, [refreshProjectStatus]);

  useEffect(() => {
    const previousChapterId = previousActiveChapterIdRef.current;
    const previousContent = previousActiveContentRef.current;

    if (
      previousChapterId &&
      previousChapterId !== activeChapterId &&
      previousContent.trim() &&
      lastTriggeredSnapshotsRef.current[previousChapterId] !== previousContent
    ) {
      clearAutoTriggerTimer(previousChapterId);
      autoTriggerTimersRef.current[previousChapterId] = setTimeout(() => {
        void sendAutoTrigger(previousChapterId, previousContent);
      }, autoTriggerDebounceMs);
    }

    previousActiveChapterIdRef.current = activeChapterId;
    previousActiveContentRef.current = currentContent;
  }, [activeChapterId, autoTriggerDebounceMs, clearAutoTriggerTimer, currentContent, sendAutoTrigger]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!compensationPayload.chapterId || !compensationPayload.content.trim()) {
        return;
      }

      if (lastTriggeredSnapshotsRef.current[compensationPayload.chapterId] === compensationPayload.content) {
        return;
      }

      const token = window.localStorage.getItem('token');

      void fetch(`/api/projects/${projectId}/parser/chapters/${compensationPayload.chapterId}/auto-trigger`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: compensationPayload.content }),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [compensationPayload, projectId]);

  useEffect(() => () => {
    Object.keys(autoTriggerTimersRef.current).forEach(clearAutoTriggerTimer);
    Object.keys(chapterPollingTimersRef.current).forEach(clearChapterPollingTimer);
    clearBatchPollingTimer();
  }, [clearAutoTriggerTimer, clearBatchPollingTimer, clearChapterPollingTimer]);

  return {
    projectStatus,
    chapterStates,
    activeBatchJob,
    isLoading,
    isManualTriggering,
    retryingChapterId,
    toast,
    triggerManualParse,
    retryChapter,
    startBatchParse,
    cancelBatchParse,
    dismissToast: () => setToast(null),
    refreshProjectStatus,
    getChapterState,
  };
}

export type { UseParserStatusReturn };
