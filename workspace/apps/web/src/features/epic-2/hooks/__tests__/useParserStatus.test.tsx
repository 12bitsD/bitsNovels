import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useParserStatus } from '../useParserStatus';

vi.mock('../../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

import { client } from '../../../../api/client';

const createResponse = <T,>(data: T) => ({
  data,
  error: undefined,
  response: new Response(),
});

const createProjectStatus = (overrides: Record<string, unknown> = {}) => ({
  projectId: 'project-1',
  pendingCount: 0,
  summary: {
    noContentCount: 0,
    pendingCount: 0,
    queuedCount: 0,
    parsingCount: 0,
    parsedCount: 1,
    failedCount: 0,
    cancelledCount: 0,
  },
  activeBatchJobs: [],
  chapters: [],
  ...overrides,
});

describe('useParserStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('debounces auto trigger on chapter switch for 60 seconds', async () => {
    vi.mocked(client.GET).mockResolvedValue(createResponse(createProjectStatus()));
    vi.mocked(client.POST).mockResolvedValue(
      createResponse({ task: { id: 'task-1', chapterId: 'chapter-1', trigger: 'auto', status: 'queued' } }),
    );

    const { rerender } = renderHook(
      ({ activeChapterId, currentContent }) =>
        useParserStatus({
          projectId: 'project-1',
          activeChapterId,
          currentContent,
        }),
      {
        initialProps: {
          activeChapterId: 'chapter-1',
          currentContent: '第一章内容',
        },
      },
    );

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalledWith('/api/projects/project-1/parser/status');
    });

    rerender({ activeChapterId: 'chapter-2', currentContent: '第二章内容' });

    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(client.POST).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    await waitFor(() => {
      expect(client.POST).toHaveBeenCalledWith('/api/projects/project-1/parser/chapters/chapter-1/auto-trigger', {
        body: expect.objectContaining({
          content: '第一章内容',
          trigger: 'auto',
          sourceEvent: 'chapter_switch',
        }),
      });
    });
  });

  it('sends a compensation trigger during beforeunload', async () => {
    vi.mocked(client.GET).mockResolvedValue(createResponse(createProjectStatus()));

    renderHook(() =>
      useParserStatus({
        projectId: 'project-1',
        activeChapterId: 'chapter-1',
        currentContent: '离开前的正文',
      }),
    );

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalled();
    });

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/project-1/parser/chapters/chapter-1/auto-trigger',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      }),
    );
  });

  it('manually triggers parsing and shows a success toast after completion', async () => {
    let chapterStatusCalls = 0;

    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/projects/project-1/parser/status') {
        return createResponse(createProjectStatus());
      }

      if (path === '/api/projects/project-1/parser/chapters/chapter-1/status') {
        chapterStatusCalls += 1;

        return createResponse({
          state:
            chapterStatusCalls === 1
              ? {
                  chapterId: 'chapter-1',
                  status: 'queued',
                  retryCount: 0,
                  trigger: 'manual',
                }
              : {
                  chapterId: 'chapter-1',
                  status: 'parsed',
                  retryCount: 0,
                  trigger: 'manual',
                  resultSummary: {
                    newCharacters: 1,
                    newLocations: 1,
                    newItems: 0,
                    newFactions: 0,
                    newForeshadows: 0,
                    newRelations: 0,
                    consistencyIssues: 0,
                  },
                },
        });
      }

      throw new Error(`Unexpected GET ${path}`);
    });

    vi.mocked(client.POST).mockResolvedValue(
      createResponse({ task: { id: 'task-1', chapterId: 'chapter-1', trigger: 'manual', status: 'queued' } }),
    );

    const { result } = renderHook(() =>
      useParserStatus({
        projectId: 'project-1',
        activeChapterId: 'chapter-1',
        currentContent: '当前章节正文',
      }),
    );

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalledWith('/api/projects/project-1/parser/status');
    });

    await act(async () => {
      const triggerPromise = result.current.triggerManualParse();
      vi.advanceTimersByTime(2_000);
      await triggerPromise;
    });

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project-1/parser/chapters/chapter-1/trigger', {
      body: expect.objectContaining({
        trigger: 'manual',
        sourceEvent: 'manual_retry',
        content: '当前章节正文',
      }),
    });

    await waitFor(() => {
      expect(result.current.toast?.title).toBe('解析完成');
    });

    expect(result.current.toast?.description).toContain('新增角色 1');
    expect(result.current.isManualTriggering).toBe(false);
  });

  it('starts batch parsing, tracks progress, and cancels remaining tasks', async () => {
    let progressCalls = 0;

    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/projects/project-1/parser/status') {
        return createResponse(createProjectStatus());
      }

      if (path === '/api/projects/project-1/parser/batch/job-1/progress') {
        progressCalls += 1;

        return createResponse({
          job:
            progressCalls === 1
              ? {
                  id: 'job-1',
                  projectId: 'project-1',
                  scope: 'selected',
                  totalChapters: 2,
                  completedChapters: 1,
                  failedChapters: 0,
                  cancelledChapters: 0,
                  status: 'running',
                  progress: 50,
                }
              : {
                  id: 'job-1',
                  projectId: 'project-1',
                  scope: 'selected',
                  totalChapters: 2,
                  completedChapters: 2,
                  failedChapters: 0,
                  cancelledChapters: 0,
                  status: 'completed',
                  progress: 100,
                },
        });
      }

      throw new Error(`Unexpected GET ${path}`);
    });

    vi.mocked(client.POST)
      .mockResolvedValueOnce(
        createResponse({
          job: {
            id: 'job-1',
            projectId: 'project-1',
            scope: 'selected',
            totalChapters: 2,
            completedChapters: 0,
            failedChapters: 0,
            cancelledChapters: 0,
            status: 'pending',
          },
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          job: {
            id: 'job-1',
            projectId: 'project-1',
            scope: 'selected',
            totalChapters: 2,
            completedChapters: 1,
            failedChapters: 0,
            cancelledChapters: 1,
            status: 'cancelled',
            progress: 50,
          },
        }),
      );

    const { result } = renderHook(() =>
      useParserStatus({
        projectId: 'project-1',
        activeChapterId: 'chapter-1',
        currentContent: '当前章节正文',
      }),
    );

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalledWith('/api/projects/project-1/parser/status');
    });

    await act(async () => {
      await result.current.startBatchParse({ scope: 'selected', chapterIds: ['chapter-1', 'chapter-2'] });
    });

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    await waitFor(() => {
      expect(result.current.activeBatchJob?.progress).toBe(50);
    });

    await act(async () => {
      await result.current.cancelBatchParse();
    });

    expect(client.POST).toHaveBeenLastCalledWith('/api/projects/project-1/parser/batch/job-1/cancel');
    expect(result.current.activeBatchJob?.status).toBe('cancelled');
  });

  it('sends frozen contract fields for auto trigger payload', async () => {
    vi.mocked(client.GET).mockResolvedValue(createResponse(createProjectStatus()));
    vi.mocked(client.POST).mockResolvedValue(
      createResponse({ task: { id: 'task-1', chapterId: 'chapter-1', trigger: 'auto', status: 'queued' } }),
    );

    const { rerender } = renderHook(
      ({ activeChapterId, currentContent }) =>
        useParserStatus({
          projectId: 'project-1',
          activeChapterId,
          currentContent,
        }),
      {
        initialProps: {
          activeChapterId: 'chapter-1',
          currentContent: '第一章内容',
        },
      },
    );

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalledWith('/api/projects/project-1/parser/status');
    });

    rerender({ activeChapterId: 'chapter-2', currentContent: '第二章内容' });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    await waitFor(() => {
      expect(client.POST).toHaveBeenCalled();
    });

    const autoTriggerCall = vi
      .mocked(client.POST)
      .mock.calls.find(([path]) => path === '/api/projects/project-1/parser/chapters/chapter-1/auto-trigger');

    expect(autoTriggerCall).toBeDefined();

    const payload = autoTriggerCall?.[1] as { body: Record<string, unknown> } | undefined;
    expect(payload?.body).toMatchObject({
      trigger: 'auto',
      sourceEvent: 'chapter_switch',
    });
    expect(payload?.body.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('ignores duplicate manual trigger while previous request is still running', async () => {
    let chapterStatusCalls = 0;

    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/projects/project-1/parser/status') {
        return createResponse(createProjectStatus());
      }

      if (path === '/api/projects/project-1/parser/chapters/chapter-1/status') {
        chapterStatusCalls += 1;

        return createResponse({
          state:
            chapterStatusCalls === 1
              ? {
                  chapterId: 'chapter-1',
                  status: 'parsing',
                  retryCount: 0,
                  trigger: 'manual',
                }
              : {
                  chapterId: 'chapter-1',
                  status: 'parsed',
                  retryCount: 0,
                  trigger: 'manual',
                },
        });
      }

      throw new Error(`Unexpected GET ${path}`);
    });

    vi.mocked(client.POST).mockResolvedValue(
      createResponse({ task: { id: 'task-1', chapterId: 'chapter-1', trigger: 'manual', status: 'queued' } }),
    );

    const { result } = renderHook(() =>
      useParserStatus({
        projectId: 'project-1',
        activeChapterId: 'chapter-1',
        currentContent: '当前章节正文',
      }),
    );

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalledWith('/api/projects/project-1/parser/status');
    });

    await act(async () => {
      const firstTrigger = result.current.triggerManualParse();
      const duplicateTrigger = result.current.triggerManualParse();
      vi.advanceTimersByTime(2_000);
      await Promise.all([firstTrigger, duplicateTrigger]);
    });

    expect(client.POST).toHaveBeenCalledTimes(1);
  });

  it('fails fast with timeout toast when polling exceeds threshold', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/projects/project-1/parser/status') {
        return createResponse(createProjectStatus());
      }

      if (path === '/api/projects/project-1/parser/chapters/chapter-1/status') {
        return createResponse({
          state: {
            chapterId: 'chapter-1',
            status: 'queued',
            retryCount: 0,
            trigger: 'manual',
          },
        });
      }

      throw new Error(`Unexpected GET ${path}`);
    });

    vi.mocked(client.POST).mockResolvedValue(
      createResponse({ task: { id: 'task-1', chapterId: 'chapter-1', trigger: 'manual', status: 'queued' } }),
    );

    const { result } = renderHook(() =>
      useParserStatus({
        projectId: 'project-1',
        activeChapterId: 'chapter-1',
        currentContent: '当前章节正文',
        completionPollMs: 50,
        pollTimeoutMs: 120,
      }),
    );

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalledWith('/api/projects/project-1/parser/status');
    });

    await act(async () => {
      const triggerPromise = result.current.triggerManualParse();
      vi.advanceTimersByTime(300);
      await triggerPromise;
    });

    expect(result.current.toast?.title).toBe('解析超时');
    expect(result.current.toast?.description).toContain('chapter-1');
    expect(result.current.getChapterState('chapter-1')?.status).toBe('failed');
  });

  it('supports retrying failed chapter and recovers to success', async () => {
    let chapterStatusCalls = 0;

    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/projects/project-1/parser/status') {
        return createResponse(createProjectStatus());
      }

      if (path === '/api/projects/project-1/parser/chapters/chapter-1/status') {
        chapterStatusCalls += 1;

        return createResponse({
          state:
            chapterStatusCalls === 1
              ? {
                  chapterId: 'chapter-1',
                  status: 'queued',
                  retryCount: 1,
                  trigger: 'manual',
                }
              : {
                  chapterId: 'chapter-1',
                  status: 'parsed',
                  retryCount: 1,
                  trigger: 'manual',
                  resultSummary: {
                    newCharacters: 2,
                    newLocations: 0,
                    newItems: 1,
                    newFactions: 0,
                    newForeshadows: 0,
                    newRelations: 0,
                    consistencyIssues: 0,
                  },
                },
        });
      }

      throw new Error(`Unexpected GET ${path}`);
    });

    vi.mocked(client.POST).mockResolvedValue(
      createResponse({ task: { id: 'task-2', chapterId: 'chapter-1', trigger: 'manual', status: 'queued' } }),
    );

    const { result } = renderHook(() =>
      useParserStatus({
        projectId: 'project-1',
        activeChapterId: 'chapter-1',
        currentContent: '修订后正文',
      }),
    );

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalledWith('/api/projects/project-1/parser/status');
    });

    await act(async () => {
      const retryPromise = result.current.retryChapter('chapter-1', '修订后正文');
      vi.advanceTimersByTime(2_000);
      await retryPromise;
    });

    expect(result.current.retryingChapterId).toBeNull();
    expect(result.current.toast?.title).toBe('重试成功');
    expect(result.current.toast?.description).toContain('新增角色 2');
  });
});
