import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSnapshots, type Snapshot, type DiffResult } from '../hooks/useSnapshots';
import * as clientModule from '../../../api/client';

// Mock the client module
vi.mock('../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    DELETE: vi.fn(),
  },
  extractApiErrorMessage: (error: { detail?: string; error?: { message?: string } } | null | undefined, fallback: string) =>
    error?.detail ?? error?.error?.message ?? fallback,
}));

// @ts-expect-error typecheck fix
const mockClient = clientModule.client as {
  GET: ReturnType<typeof vi.fn>;
  POST: ReturnType<typeof vi.fn>;
  DELETE: ReturnType<typeof vi.fn>;
};

describe('useSnapshots', () => {
  const projectId = 'test-project-123';
  const chapterId = 'test-chapter-456';

  const mockSnapshot = {
    id: 'snapshot-1',
    chapterId,
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]}',
    charCount: 11,
    type: 'manual' as const,
    label: 'First draft',
    createdAt: '2026-03-30T10:00:00Z',
  };

  const mockSnapshotsList = [
    mockSnapshot,
    {
      id: 'snapshot-2',
      chapterId,
      content: '{"type":"doc","content":[]}',
      charCount: 0,
      type: 'auto' as const,
      createdAt: '2026-03-30T09:00:00Z',
    },
    {
      id: 'snapshot-3',
      chapterId,
      content: '{"type":"doc","content":[]}',
      charCount: 0,
      type: 'daily' as const,
      createdAt: '2026-03-29T08:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty snapshots array', () => {
      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: false }));

      expect(result.current.snapshots).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('');
      expect(result.current.selectedSnapshot).toBeNull();
    });
  });

  describe('fetchSnapshots', () => {
    it('should fetch snapshots on mount when autoFetch is true', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.snapshots).toEqual(mockSnapshotsList);
      });

      expect(mockClient.GET).toHaveBeenCalledWith(
        `/api/projects/${projectId}/chapters/${chapterId}/snapshots`
      );
    });

    it('should not fetch snapshots when autoFetch is false', () => {
      renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: false }));

      expect(mockClient.GET).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: undefined, error: { detail: 'Failed to fetch' } });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch');
      });

      expect(result.current.snapshots).toEqual([]);
    });

    it('should allow manual refetch', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: false }));

      act(() => {
        result.current.fetchSnapshots();
      });

      await waitFor(() => {
        expect(result.current.snapshots).toEqual(mockSnapshotsList);
      });
    });
  });

  describe('createSnapshot', () => {
    it('should create a new snapshot with label', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      await waitFor(() => {
        expect(result.current.snapshots).toEqual(mockSnapshotsList);
      });

      mockClient.POST.mockResolvedValueOnce({
        data: { snapshot: { ...mockSnapshot, id: 'new-snapshot', label: 'New label' } },
        error: undefined,
      });
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });

      act(() => {
        result.current.createSnapshot('New label');
      });

      await waitFor(() => {
        expect(mockClient.POST).toHaveBeenCalledWith(
          `/api/projects/${projectId}/chapters/${chapterId}/snapshots`,
          { body: { label: 'New label' } }
        );
      });
    });

    it('should handle create error', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: [] }, error: undefined });
      mockClient.POST.mockResolvedValueOnce({ data: undefined, error: { detail: 'Creation failed' } });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      await waitFor(() => {
        expect(result.current.snapshots).toEqual([]);
      });

      let errorMsg: string | undefined;
      act(() => {
        result.current.createSnapshot('Test label').catch(err => {
          errorMsg = err.message;
        });
      });

      await waitFor(() => {
        expect(errorMsg).toBe('Creation failed');
      });
    });

    it('should reject label longer than 100 characters', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: [] }, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      await waitFor(() => {
        expect(result.current.snapshots).toEqual([]);
      });

      const longLabel = 'a'.repeat(101);

      let errorMsg: string | undefined;
      act(() => {
        result.current.createSnapshot(longLabel).catch(err => {
          errorMsg = err.message;
        });
      });

      await waitFor(() => {
        expect(errorMsg).toBe('标签不能超过100字');
      });

      expect(mockClient.POST).not.toHaveBeenCalled();
    });
  });

  describe('getSnapshot', () => {
    it('should fetch a single snapshot by id', async () => {
      mockClient.GET.mockResolvedValue({ data: { snapshot: mockSnapshot }, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: false }));

      let snapshot: Snapshot | undefined;
      await act(async () => {
        snapshot = await result.current.getSnapshot('snapshot-1');
      });

      expect(snapshot).toEqual(mockSnapshot);
      expect(mockClient.GET).toHaveBeenCalledWith(
        `/api/projects/${projectId}/chapters/${chapterId}/snapshots/snapshot-1`
      );
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot and refresh list', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });
      mockClient.DELETE.mockResolvedValueOnce({ data: undefined, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      await waitFor(() => {
        expect(result.current.snapshots).toEqual(mockSnapshotsList);
      });

      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: [mockSnapshotsList[1], mockSnapshotsList[2]] }, error: undefined });

      act(() => {
        result.current.deleteSnapshot('snapshot-1');
      });

      await waitFor(() => {
        expect(mockClient.DELETE).toHaveBeenCalledWith(
          `/api/projects/${projectId}/chapters/${chapterId}/snapshots/snapshot-1`
        );
      });
    });
  });

  describe('restoreSnapshot', () => {
    it('should restore a snapshot', async () => {
      mockClient.POST.mockResolvedValueOnce({ data: { success: true }, error: undefined });
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });

      const onRestore = vi.fn();
      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, onRestore, autoFetch: false }));

      act(() => {
        result.current.restoreSnapshot('snapshot-1');
      });

      await waitFor(() => {
        expect(mockClient.POST).toHaveBeenCalledWith(
          `/api/projects/${projectId}/chapters/${chapterId}/snapshots/snapshot-1/restore`
        );
      });

      expect(onRestore).toHaveBeenCalled();
    });

    it('should handle restore error', async () => {
      mockClient.POST.mockResolvedValueOnce({ data: undefined, error: { detail: 'Restore failed' } });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: false }));

      let errorMsg: string | undefined;
      act(() => {
        result.current.restoreSnapshot('snapshot-1').catch(err => {
          errorMsg = err.message;
        });
      });

      await waitFor(() => {
        expect(errorMsg).toBe('Restore failed');
      });
    });
  });

  describe('getDiff', () => {
    it('should fetch diff between snapshot and current', async () => {
      const mockDiff = {
        diff: '--- snapshot\n+++ current',
        snapshotContent: 'old text',
        currentContent: 'new text',
      };
      mockClient.GET.mockResolvedValue({ data: mockDiff, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: false }));

      let diff: DiffResult | undefined;
      await act(async () => {
        diff = await result.current.getDiff('snapshot-1');
      });

      expect(diff).toEqual(mockDiff);
      expect(mockClient.GET).toHaveBeenCalledWith(
        `/api/projects/${projectId}/chapters/${chapterId}/snapshots/snapshot-1/diff`
      );
    });
  });

  describe('selectSnapshot', () => {
    it('should select a snapshot', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      await waitFor(() => {
        expect(result.current.snapshots).toEqual(mockSnapshotsList);
      });

      act(() => {
        result.current.selectSnapshot(mockSnapshot);
      });

      expect(result.current.selectedSnapshot).toEqual(mockSnapshot);
    });

    it('should clear selected snapshot', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      await waitFor(() => {
        expect(result.current.snapshots).toEqual(mockSnapshotsList);
      });

      act(() => {
        result.current.selectSnapshot(mockSnapshot);
      });

      expect(result.current.selectedSnapshot).toEqual(mockSnapshot);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedSnapshot).toBeNull();
    });
  });

  describe('calculateStorageStats', () => {
    it('should calculate total size and count', async () => {
      mockClient.GET.mockResolvedValueOnce({ data: { snapshots: mockSnapshotsList }, error: undefined });

      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: true }));

      await waitFor(() => {
        expect(result.current.snapshots).toEqual(mockSnapshotsList);
      });

      const stats = result.current.calculateStorageStats();

      expect(stats.count).toBe(3);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });

    it('should return zero stats for empty list', () => {
      const { result } = renderHook(() => useSnapshots({ projectId, chapterId, autoFetch: false }));

      const stats = result.current.calculateStorageStats();

      expect(stats.count).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
    });
  });
});
