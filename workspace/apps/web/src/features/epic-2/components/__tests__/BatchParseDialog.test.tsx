import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BatchParseDialog from '../ParserStatus/BatchParseDialog';

const volumes = [
  {
    id: 'volume-1',
    name: '第一卷',
    chapters: [
      { id: 'chapter-1', title: '第一章', volumeId: 'volume-1' },
      { id: 'chapter-2', title: '第二章', volumeId: 'volume-1' },
    ],
  },
  {
    id: 'volume-2',
    name: '第二卷',
    chapters: [{ id: 'chapter-3', title: '第三章', volumeId: 'volume-2' }],
  },
];

describe('BatchParseDialog', () => {
  it('renders scope controls and estimated time', () => {
    render(
      <BatchParseDialog
        isOpen
        volumes={volumes}
        scope="all"
        selectedVolumeId={null}
        selectedChapterIds={[]}
        onClose={vi.fn()}
        onScopeChange={vi.fn()}
        onVolumeChange={vi.fn()}
        onChapterToggle={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: '批量重新解析' })).toBeInTheDocument();
    expect(screen.getByLabelText('全书')).toBeChecked();
    expect(screen.getByText('共 3 章，预计耗时约 1 分钟')).toBeInTheDocument();
  });

  it('supports changing scope and manual chapter selection', () => {
    const onScopeChange = vi.fn();
    const onChapterToggle = vi.fn();

    render(
      <BatchParseDialog
        isOpen
        volumes={volumes}
        scope="selected"
        selectedVolumeId={null}
        selectedChapterIds={['chapter-1']}
        onClose={vi.fn()}
        onScopeChange={onScopeChange}
        onVolumeChange={vi.fn()}
        onChapterToggle={onChapterToggle}
        onStart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('指定卷'));
    expect(onScopeChange).toHaveBeenCalledWith('volume');

    fireEvent.click(screen.getByLabelText('第二章'));
    expect(onChapterToggle).toHaveBeenCalledWith('chapter-2');
  });

  it('shows parsing progress and allows cancelling remaining tasks', () => {
    const onCancel = vi.fn();

    render(
      <BatchParseDialog
        isOpen
        volumes={volumes}
        scope="all"
        selectedVolumeId={null}
        selectedChapterIds={[]}
        activeJob={{
          id: 'job-1',
          projectId: 'project-1',
          scope: 'all',
          totalChapters: 3,
          completedChapters: 1,
          failedChapters: 0,
          cancelledChapters: 0,
          status: 'running',
          progress: 33,
        }}
        onClose={vi.fn()}
        onScopeChange={vi.fn()}
        onVolumeChange={vi.fn()}
        onChapterToggle={vi.fn()}
        onStart={vi.fn()}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('1/3 章节解析完成')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '批量解析进度' })).toHaveAttribute('aria-valuenow', '33');

    fireEvent.click(screen.getByRole('button', { name: '取消剩余任务' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
