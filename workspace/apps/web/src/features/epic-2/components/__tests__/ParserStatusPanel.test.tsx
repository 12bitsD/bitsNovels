import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ParserStatusPanel from '../ParserStatus/ParserStatusPanel';
import * as useParserStatusModule from '../../hooks/useParserStatus';

vi.mock('../../hooks/useParserStatus');

const volumes = [
  {
    id: 'volume-1',
    name: '第一卷',
    chapters: [
      { id: 'chapter-1', title: '第一章', volumeId: 'volume-1' },
      { id: 'chapter-2', title: '第二章', volumeId: 'volume-1' },
    ],
  },
];

const createHookValue = (overrides: Partial<ReturnType<typeof useParserStatusModule.useParserStatus>> = {}) => ({
  projectStatus: {
    projectId: 'project-1',
    pendingCount: 0,
    summary: {
      noContentCount: 0,
      pendingCount: 0,
      queuedCount: 0,
      parsingCount: 0,
      parsedCount: 2,
      failedCount: 0,
      cancelledCount: 0,
    },
    activeBatchJobs: [],
    chapters: [],
  },
  chapterStates: {},
  activeBatchJob: null,
  isLoading: false,
  isManualTriggering: false,
  retryingChapterId: null,
  toast: null,
  triggerManualParse: vi.fn(),
  retryChapter: vi.fn(),
  startBatchParse: vi.fn(),
  cancelBatchParse: vi.fn(),
  dismissToast: vi.fn(),
  refreshProjectStatus: vi.fn(),
  getChapterState: vi.fn(() => undefined),
  ...overrides,
});

describe('ParserStatusPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders synced project status and manual trigger button', () => {
    vi.mocked(useParserStatusModule.useParserStatus).mockReturnValue(createHookValue());

    render(
      <ParserStatusPanel
        projectId="project-1"
        activeChapterId="chapter-1"
        currentContent="章节内容"
        volumes={volumes}
      />,
    );

    expect(screen.getByText('全部已同步')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新解析当前章节' })).toBeInTheDocument();
  });

  it('shows pending count and loading state while manual parsing runs', () => {
    const triggerManualParse = vi.fn();

    vi.mocked(useParserStatusModule.useParserStatus).mockReturnValue(
      createHookValue({
        projectStatus: {
          projectId: 'project-1',
          pendingCount: 3,
          summary: {
            noContentCount: 0,
            pendingCount: 1,
            queuedCount: 1,
            parsingCount: 0,
            parsedCount: 2,
            failedCount: 1,
            cancelledCount: 0,
          },
          activeBatchJobs: [],
          chapters: [],
        },
        isManualTriggering: true,
        triggerManualParse,
      }),
    );

    render(
      <ParserStatusPanel
        projectId="project-1"
        activeChapterId="chapter-1"
        currentContent="章节内容"
        volumes={volumes}
      />,
    );

    expect(screen.getByText('3 章待解析')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '解析中...' })).toBeDisabled();
  });

  it('opens the batch dialog from the dropdown menu', () => {
    vi.mocked(useParserStatusModule.useParserStatus).mockReturnValue(createHookValue());

    render(
      <ParserStatusPanel
        projectId="project-1"
        activeChapterId="chapter-1"
        currentContent="章节内容"
        volumes={volumes}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '批量重新解析' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '指定卷' }));

    expect(screen.getByRole('dialog', { name: '批量重新解析' })).toBeInTheDocument();
    expect(screen.getByLabelText('指定卷')).toBeChecked();
  });

  it('shows batch progress and cancels remaining tasks', () => {
    const cancelBatchParse = vi.fn();

    vi.mocked(useParserStatusModule.useParserStatus).mockReturnValue(
      createHookValue({
        activeBatchJob: {
          id: 'job-1',
          projectId: 'project-1',
          scope: 'all',
          totalChapters: 4,
          completedChapters: 2,
          failedChapters: 0,
          cancelledChapters: 0,
          status: 'running',
          progress: 50,
        },
        cancelBatchParse,
      }),
    );

    render(
      <ParserStatusPanel
        projectId="project-1"
        activeChapterId="chapter-1"
        currentContent="章节内容"
        volumes={volumes}
      />,
    );

    expect(screen.getByText('2/4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '取消剩余任务' }));

    expect(cancelBatchParse).toHaveBeenCalledTimes(1);
  });

  it('renders toast notifications from parser operations', () => {
    vi.mocked(useParserStatusModule.useParserStatus).mockReturnValue(
      createHookValue({
        toast: {
          type: 'success',
          title: '解析完成',
          description: '新增角色 1，地点 1，道具 0。',
        },
      }),
    );

    render(
      <ParserStatusPanel
        projectId="project-1"
        activeChapterId="chapter-1"
        currentContent="章节内容"
        volumes={volumes}
      />,
    );

    expect(screen.getByText('解析完成')).toBeInTheDocument();
    expect(screen.getByText('新增角色 1，地点 1，道具 0。')).toBeInTheDocument();
  });

  it('renders chapter-level parser state list with failure reason entry', () => {
    vi.mocked(useParserStatusModule.useParserStatus).mockReturnValue(
      createHookValue({
        projectStatus: {
          projectId: 'project-1',
          pendingCount: 1,
          summary: {
            noContentCount: 0,
            pendingCount: 0,
            queuedCount: 0,
            parsingCount: 0,
            parsedCount: 1,
            failedCount: 1,
            cancelledCount: 0,
          },
          activeBatchJobs: [],
          chapters: [
            {
              chapterId: 'chapter-1',
              status: 'failed',
              retryCount: 1,
              trigger: 'auto',
              failureReason: 'Parser timed out after 60 seconds',
            },
            {
              chapterId: 'chapter-2',
              status: 'parsed',
              retryCount: 0,
              trigger: 'manual',
            },
          ],
        },
      }),
    );

    render(
      <ParserStatusPanel
        projectId="project-1"
        activeChapterId="chapter-1"
        currentContent="章节内容"
        volumes={volumes}
      />,
    );

    expect(screen.getByText('第一章')).toBeInTheDocument();
    expect(screen.getByLabelText('解析失败')).toBeInTheDocument();
    expect(screen.getByText('Parser timed out after 60 seconds')).toBeInTheDocument();
  });

  it('covers queued/running/succeeded/failed/retrying/fallback chapter states and interactions', () => {
    const retryChapter = vi.fn();

    vi.mocked(useParserStatusModule.useParserStatus).mockReturnValue(
      createHookValue({
        retryingChapterId: 'chapter-5',
        retryChapter,
        projectStatus: {
          projectId: 'project-1',
          pendingCount: 4,
          summary: {
            noContentCount: 0,
            pendingCount: 0,
            queuedCount: 1,
            parsingCount: 1,
            parsedCount: 1,
            failedCount: 1,
            cancelledCount: 0,
          },
          activeBatchJobs: [],
          chapters: [
            {
              chapterId: 'chapter-1',
              status: 'queued',
              retryCount: 0,
              trigger: 'auto',
            },
            {
              chapterId: 'chapter-2',
              status: 'parsing',
              retryCount: 0,
              trigger: 'manual',
            },
            {
              chapterId: 'chapter-3',
              status: 'parsed',
              retryCount: 0,
              trigger: 'manual',
            },
            {
              chapterId: 'chapter-4',
              status: 'failed',
              retryCount: 1,
              trigger: 'manual',
              failureReason: 'AI upstream unavailable',
            },
            {
              chapterId: 'chapter-5',
              status: 'queued',
              retryCount: 1,
              trigger: 'manual',
            },
            {
              chapterId: 'chapter-6',
              status: 'failed',
              retryCount: 1,
              trigger: 'manual',
              failureReason: 'Parser timed out after 60 seconds',
              fallback: {
                used: true,
                reason: 'upstream_timeout',
              },
            },
          ],
        },
      }),
    );

    render(
      <ParserStatusPanel
        projectId="project-1"
        activeChapterId="chapter-1"
        currentContent="章节内容"
        volumes={[
          ...volumes,
          {
            id: 'volume-2',
            name: '第二卷',
            chapters: [
              { id: 'chapter-3', title: '第三章', volumeId: 'volume-2' },
              { id: 'chapter-4', title: '第四章', volumeId: 'volume-2' },
              { id: 'chapter-5', title: '第五章', volumeId: 'volume-2' },
              { id: 'chapter-6', title: '第六章', volumeId: 'volume-2' },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText('排队中')).toBeInTheDocument();
    expect(screen.getByText('运行中')).toBeInTheDocument();
    expect(screen.getByText('已成功')).toBeInTheDocument();
    expect(screen.getByText('失败')).toBeInTheDocument();
    expect(screen.getAllByText('重试中')).toHaveLength(2);
    expect(screen.getByText('已降级')).toBeInTheDocument();
    expect(screen.getByText('降级原因：upstream_timeout')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: '重试解析 第四章' });
    fireEvent.click(retryBtn);
    expect(retryChapter).toHaveBeenCalledWith('chapter-4');

    expect(screen.getByRole('button', { name: '重试中 第五章' })).toBeDisabled();
  });
});
