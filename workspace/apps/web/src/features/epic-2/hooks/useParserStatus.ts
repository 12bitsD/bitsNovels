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
  pollTimeoutMs?: number;
}

interface ChapterContentResponse {
  chapter?: {
    content?: string;
  };
}

interface ApiErrorShape {
  code?: string;
  message?: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: ApiErrorShape;
  task?: T;
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

const buildFailureToast = (state: ParserChapterState) => {
  const reason = state.failureReason ?? '请稍后重试当前章节。';
  const timeoutLike = /timeout|timed out|超时/i.test(reason);
  const fallbackHint = state.fallback?.used
    ? `（已启用降级：${state.fallback.reason ?? 'degraded_mode'}）`
    : '';

  return {
    title: timeoutLike ? '解析超时' : '解析失败',
    description: `${reason}${fallbackHint}`,
  };
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const fallbackHash = (content: string) => {
  let acc = 0n;
  for (const char of content) {
    acc = (acc * 131n + BigInt(char.codePointAt(0) ?? 0)) % (1n << 256n);
  }
  return acc.toString(16).padStart(64, '0').slice(0, 64);
};

const computeContentHash = async (content: string) => {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(content),
    );
    return toHex(new Uint8Array(digest));
  }
  return fallbackHash(content);
};

export function useParserStatus({
  projectId,
  activeChapterId = null,
  currentContent = '',
  autoTriggerDebounceMs = 60_000,
  progressPollMs = 2_000,
  completionPollMs = 2_000,
  pollTimeoutMs = 90_000,
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
  const chapterStatesRef = useRef<Record<string, ParserChapterState>>({});
  const lastTriggeredSnapshotsRef = useRef<Record<string, string>>({});
  const manualTriggerInFlightRef = useRef(false);
  const retryingChapterIdRef = useRef<string | null>(null);
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

  useEffect(() => {
    chapterStatesRef.current = chapterStates;
  }, [chapterStates]);

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
        const startedAt = Date.now();

        const poll = async () => {
          try {
            if (Date.now() - startedAt >= pollTimeoutMs) {
              clearChapterPollingTimer(chapterId);
              const timeoutState: ParserChapterState = {
                chapterId,
                status: 'failed',
                retryCount: chapterStatesRef.current[chapterId]?.retryCount ?? 0,
                trigger: chapterStatesRef.current[chapterId]?.trigger ?? 'manual',
                failureReason: `章节 ${chapterId} 解析超时，请稍后重试。`,
              };
              setChapterStates((currentStates) => ({
                ...currentStates,
                [chapterId]: {
                  ...(currentStates[chapterId] ?? timeoutState),
                  ...timeoutState,
                },
              }));
              resolve(timeoutState);
              return;
            }

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
    [clearChapterPollingTimer, completionPollMs, fetchChapterStatus, pollTimeoutMs],
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

      const contentHash = await computeContentHash(content);

      const { data, error, response } = await client.POST(`/api/projects/${projectId}/parser/chapters/${chapterId}/auto-trigger`, {
        body: {
          trigger: 'auto',
          sourceEvent: 'chapter_switch',
          contentHash,
          content,
        },
      });

      const envelope = data as ApiEnvelope<ParserChapterState> | undefined;
      if (error || !response.ok || envelope?.success === false) {
        if (envelope?.error?.code === 'PARSER_DEBOUNCED') {
          setToast({
            type: 'info',
            title: '自动触发已去重',
            description: '60 秒内重复触发已合并为最后一次快照。',
          });
        }
        return;
      }

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
    if (!activeChapterId || manualTriggerInFlightRef.current) {
      return;
    }

    manualTriggerInFlightRef.current = true;
    setIsManualTriggering(true);
    clearAutoTriggerTimer(activeChapterId);

    try {
      const content = await getChapterContent(activeChapterId, currentContent);
      const contentHash = await computeContentHash(content);
      const { data, error, response } = await client.POST(`/api/projects/${projectId}/parser/chapters/${activeChapterId}/trigger`, {
        body: {
          trigger: 'manual',
          sourceEvent: 'manual_retry',
          contentHash,
          content,
        },
      });
      const envelope = data as ApiEnvelope<ParserChapterState> | undefined;
      if (error || !response.ok || envelope?.success === false) {
        setToast({
          type: 'error',
          title: envelope?.error?.code === 'PARSER_TASK_ALREADY_RUNNING' ? '解析进行中' : '触发失败',
          description: envelope?.error?.message ?? '当前章节无法触发解析，请稍后重试。',
        });
        return;
      }

      lastTriggeredSnapshotsRef.current[activeChapterId] = content;
      setChapterStates((currentStates) => ({
        ...currentStates,
        [activeChapterId]: {
          chapterId: activeChapterId,
          retryCount: currentStates[activeChapterId]?.retryCount ?? 0,
          status: 'queued',
          trigger: 'manual',
          lastQueuedAt: new Date().toISOString(),
        },
      }));
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
        const failureToast = buildFailureToast(completedState);
        setToast({
          type: 'error',
          title: failureToast.title,
          description: failureToast.description,
        });
      }
    } catch {
      setToast({
        type: 'error',
        title: '触发失败',
        description: '触发解析时发生异常，请检查网络后重试。',
      });
    } finally {
      manualTriggerInFlightRef.current = false;
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
    if (retryingChapterIdRef.current === chapterId) {
      return;
    }

    retryingChapterIdRef.current = chapterId;
    setRetryingChapterId(chapterId);

    try {
      const content = await getChapterContent(chapterId, contentOverride);
      const contentHash = await computeContentHash(content);
      const { data, error, response } = await client.POST(`/api/projects/${projectId}/parser/chapters/${chapterId}/trigger`, {
        body: {
          trigger: 'manual',
          sourceEvent: 'manual_retry',
          contentHash,
          content,
        },
      });
      const envelope = data as ApiEnvelope<ParserChapterState> | undefined;
      if (error || !response.ok || envelope?.success === false) {
        setToast({
          type: 'error',
          title: envelope?.error?.code === 'PARSER_TASK_ALREADY_RUNNING' ? '解析进行中' : '重试失败',
          description: envelope?.error?.message ?? '当前章节无法重试，请稍后再试。',
        });
        return;
      }

      lastTriggeredSnapshotsRef.current[chapterId] = content;
      const completedState = await pollChapterUntilTerminal(chapterId);
      await refreshProjectStatus();

      if (completedState?.status === 'parsed') {
        setToast({
          type: 'success',
          title: (completedState.retryCount ?? 0) > 0 ? '重试成功' : '解析完成',
          description: buildSuccessToastDescription(completedState),
        });
      }

      if (completedState?.status === 'failed') {
        const failureToast = buildFailureToast(completedState);
        setToast({
          type: 'error',
          title: failureToast.title,
          description: failureToast.description,
        });
      }
    } catch {
      setToast({
        type: 'error',
        title: '重试失败',
        description: '触发重试时发生异常，请稍后再试。',
      });
    } finally {
      retryingChapterIdRef.current = null;
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
      const hashSeed = fallbackHash(compensationPayload.content);

      void fetch(`/api/projects/${projectId}/parser/chapters/${compensationPayload.chapterId}/auto-trigger`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trigger: 'auto',
          sourceEvent: 'chapter_close',
          contentHash: hashSeed,
          content: compensationPayload.content,
        }),
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
