import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SnapshotPanel } from '../components/Snapshot/SnapshotPanel';
import { CreateSnapshot } from '../components/Snapshot/CreateSnapshot';
import { SnapshotList } from '../components/Snapshot/SnapshotList';
import { SnapshotDiff } from '../components/Snapshot/SnapshotDiff';
import { RestoreConfirm } from '../components/Snapshot/RestoreConfirm';
import { StorageStats } from '../components/Snapshot/StorageStats';
import { useSnapshots } from '../hooks/useSnapshots';
import * as clientModule from '../../../api/client';

vi.mock('../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    DELETE: vi.fn(),
  },
}));

// @ts-expect-error typecheck fix
const mockClient = clientModule.client as {
  GET: ReturnType<typeof vi.fn>;
  POST: ReturnType<typeof vi.fn>;
  DELETE: ReturnType<typeof vi.fn>;
};

describe('US-3.6 Snapshot Feature Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateSnapshot Component', () => {
    const mockOnCreate = vi.fn();

    beforeEach(() => {
      mockOnCreate.mockClear();
    });

    it('should create snapshot with label', async () => {
      mockOnCreate.mockResolvedValueOnce(undefined);

      render(<CreateSnapshot onCreate={mockOnCreate} />);

      fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

      const textarea = screen.getByLabelText('标签/备注（可选）');
      fireEvent.change(textarea, { target: { value: 'Draft v1' } });

      const submitButton = screen.getAllByRole('button').find(
        b => b.textContent?.includes('创建快照') && b.className?.includes('bg-[#8B6914]')
      );
      fireEvent.click(submitButton!);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith('Draft v1');
      });
    });

    it('should validate label length', async () => {
      render(<CreateSnapshot onCreate={mockOnCreate} />);

      fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

      const textarea = screen.getByLabelText('标签/备注（可选）');
      fireEvent.change(textarea, { target: { value: 'a'.repeat(101) } });

      expect(screen.getByText('超过字数限制')).toBeInTheDocument();
    });
  });

  describe('SnapshotList Component', () => {
    const mockSnapshots = [
      {
        id: '1',
        chapterId: 'c1',
        content: 'content',
        charCount: 1000,
        type: 'manual' as const,
        label: 'Manual snapshot',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        chapterId: 'c1',
        content: 'content',
        charCount: 1100,
        type: 'auto' as const,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '3',
        chapterId: 'c1',
        content: 'content',
        charCount: 1200,
        type: 'daily' as const,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    const mockOnSelect = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnCompare = vi.fn();

    it('should distinguish snapshot types visually', () => {
      render(
        <SnapshotList
          snapshots={mockSnapshots}
          selectedSnapshot={null}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
          onCompare={mockOnCompare}
        />
      );

      expect(screen.getByText('手动')).toBeInTheDocument();
      expect(screen.getByText('自动')).toBeInTheDocument();
      expect(screen.getByText('每日')).toBeInTheDocument();
    });

    it('should allow deletion only for manual snapshots', () => {
      render(
        <SnapshotList
          snapshots={mockSnapshots}
          selectedSnapshot={null}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
          onCompare={mockOnCompare}
        />
      );

      const deleteButtons = screen.getAllByLabelText('删除快照');
      expect(deleteButtons).toHaveLength(1);
    });
  });

  describe('SnapshotDiff Component', () => {
    it('should highlight additions in green', () => {
      render(
        <SnapshotDiff
          originalContent="old content"
          snapshotContent="new content"
        />
      );

      expect(screen.getByText(/新增/)).toBeInTheDocument();
    });

    it('should highlight deletions in red', () => {
      render(
        <SnapshotDiff
          originalContent="removed content"
          snapshotContent=""
        />
      );

      expect(screen.getByText(/删除/)).toBeInTheDocument();
    });
  });

  describe('RestoreConfirm Component', () => {
    const mockSnapshot = {
      id: '1',
      chapterId: 'c1',
      content: 'content',
      charCount: 1000,
      type: 'manual' as const,
      label: 'Restore point',
      createdAt: '2026-03-30T10:00:00Z',
    };

    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();

    it('should show restore warning', () => {
      render(
        <RestoreConfirm
          snapshot={mockSnapshot}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/此操作不可撤销/)).toBeInTheDocument();
      expect(screen.getByText(/恢复后，当前版本的内容将被替换/)).toBeInTheDocument();
    });

    it('should require explicit confirmation', async () => {
      mockOnConfirm.mockResolvedValueOnce(undefined);

      render(
        <RestoreConfirm
          snapshot={mockSnapshot}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '确认恢复' }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });
  });

  describe('StorageStats Component', () => {
    it('should display total storage info', () => {
      render(
        <StorageStats
          totalSizeBytes={5 * 1024 * 1024}
          snapshotCount={10}
        />
      );

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('5.00 MB')).toBeInTheDocument();
    });
  });

  describe('SnapshotPanel Integration', () => {
    const mockSnapshots = [
      {
        id: 'snapshot-1',
        chapterId: 'chapter-1',
        content: '{"type":"doc"}',
        charCount: 1000,
        type: 'manual' as const,
        label: 'Test snapshot',
        createdAt: '2026-03-30T10:00:00Z',
      },
    ];

    beforeEach(() => {
      mockClient.GET.mockResolvedValue({ data: mockSnapshots, error: undefined });
    });

    it('should load and display snapshots', async () => {
      render(
        <SnapshotPanel
          projectId="project-1"
          chapterId="chapter-1"
          currentContent='{"type":"doc"}'
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test snapshot')).toBeInTheDocument();
      });
    });

    it('should support creating snapshot', async () => {
      mockClient.POST.mockResolvedValue({ data: mockSnapshots[0], error: undefined });

      render(
        <SnapshotPanel
          projectId="project-1"
          chapterId="chapter-1"
          currentContent='{"type":"doc"}'
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test snapshot')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

      const textarea = screen.getByLabelText('标签/备注（可选）');
      fireEvent.change(textarea, { target: { value: 'New snapshot' } });

      const submitButton = screen.getAllByRole('button').find(
        b => b.textContent?.includes('创建快照') && b.className?.includes('bg-[#8B6914]')
      );
      fireEvent.click(submitButton!);

      await waitFor(() => {
        expect(mockClient.POST).toHaveBeenCalledWith(
          '/api/projects/project-1/chapters/chapter-1/snapshots',
          { body: { label: 'New snapshot' } }
        );
      });
    });
  });

  describe('useSnapshots Hook', () => {
    it('should calculate storage statistics', async () => {
      mockClient.GET.mockResolvedValue({
        data: [
          { id: '1', chapterId: 'c1', content: 'a'.repeat(1000), charCount: 100, type: 'manual', createdAt: new Date().toISOString() },
          { id: '2', chapterId: 'c1', content: 'b'.repeat(2000), charCount: 200, type: 'auto', createdAt: new Date().toISOString() },
        ],
        error: undefined,
      });

      const TestComponent = () => {
        const { calculateStorageStats } = useSnapshots({
          projectId: 'p1',
          chapterId: 'c1',
          autoFetch: true,
        });

        const stats = calculateStorageStats();

        return (
          <div>
            <span data-testid="count">{stats.count}</span>
            <span data-testid="size">{stats.totalSizeBytes}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('2');
      });

      const size = screen.getByTestId('size').textContent;
      expect(Number(size)).toBeGreaterThan(0);
    });
  });
});
