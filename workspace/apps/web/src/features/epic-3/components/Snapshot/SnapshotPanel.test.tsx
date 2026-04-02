import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SnapshotPanel } from './SnapshotPanel';
import * as clientModule from '../../../../api/client';

vi.mock('../../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    DELETE: vi.fn(),
  },
}));

const mockClient = clientModule.client as {
  GET: ReturnType<typeof vi.fn>;
  POST: ReturnType<typeof vi.fn>;
  DELETE: ReturnType<typeof vi.fn>;
};

describe('SnapshotPanel', () => {
  const projectId = 'project-123';
  const chapterId = 'chapter-456';
  const currentContent = '{"type":"doc"}';

  const mockOnClose = vi.fn();
  const mockOnRestore = vi.fn();

  const mockSnapshots = [
    {
      id: 'snapshot-1',
      chapterId,
      content: '{"type":"doc"}',
      charCount: 1000,
      type: 'manual' as const,
      label: 'First draft',
      createdAt: '2026-03-30T10:00:00Z',
    },
    {
      id: 'snapshot-2',
      chapterId,
      content: '{"type":"doc","content":[]}',
      charCount: 1200,
      type: 'auto' as const,
      createdAt: '2026-03-30T09:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.GET.mockResolvedValue({ data: mockSnapshots, error: undefined });
  });

  it('should not render when isOpen is false', () => {
    render(
      <SnapshotPanel
        projectId={projectId}
        chapterId={chapterId}
        currentContent={currentContent}
        isOpen={false}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    expect(screen.queryByText('版本历史')).not.toBeInTheDocument();
  });

  it('should render panel when isOpen is true', () => {
    render(
      <SnapshotPanel
        projectId={projectId}
        chapterId={chapterId}
        currentContent={currentContent}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    expect(screen.getByText('版本历史')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <SnapshotPanel
        projectId={projectId}
        chapterId={chapterId}
        currentContent={currentContent}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    const closeButton = screen.getByLabelText('关闭面板');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display storage stats', async () => {
    render(
      <SnapshotPanel
        projectId={projectId}
        chapterId={chapterId}
        currentContent={currentContent}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('存储统计')).toBeInTheDocument();
    });
  });

  it('should display snapshot list', async () => {
    render(
      <SnapshotPanel
        projectId={projectId}
        chapterId={chapterId}
        currentContent={currentContent}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('First draft')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    mockClient.GET.mockImplementation(() => new Promise(() => {}));

    render(
      <SnapshotPanel
        projectId={projectId}
        chapterId={chapterId}
        currentContent={currentContent}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should show error state when fetch fails', async () => {
    mockClient.GET.mockResolvedValue({ data: undefined, error: { detail: 'Failed to load' } });

    render(
      <SnapshotPanel
        projectId={projectId}
        chapterId={chapterId}
        currentContent={currentContent}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });
});
