import { useState, useCallback, useEffect, useRef } from 'react';
import { client } from '../../../api/client';

export type SnapshotType = 'manual' | 'auto' | 'daily' | 'restore_backup';

export interface Snapshot {
  id: string;
  chapterId: string;
  content: string;
  charCount: number;
  type: SnapshotType;
  label?: string;
  createdAt: string;
}

export interface DiffResult {
  added: Array<{ text: string; position: number }>;
  removed: Array<{ text: string; position: number }>;
  modified: Array<{ text: string; position: number }>;
}

export interface StorageStats {
  count: number;
  totalSizeBytes: number;
}

export interface UseSnapshotsOptions {
  projectId: string;
  chapterId: string;
  autoFetch?: boolean;
  onRestore?: () => void;
}

export interface UseSnapshotsReturn {
  snapshots: Snapshot[];
  loading: boolean;
  error: string;
  selectedSnapshot: Snapshot | null;
  fetchSnapshots: () => Promise<void>;
  createSnapshot: (label?: string) => Promise<Snapshot>;
  getSnapshot: (snapshotId: string) => Promise<Snapshot>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  getDiff: (snapshotId: string) => Promise<DiffResult>;
  selectSnapshot: (snapshot: Snapshot | null) => void;
  clearSelection: () => void;
  calculateStorageStats: () => StorageStats;
}

export function useSnapshots(options: UseSnapshotsOptions): UseSnapshotsReturn {
  const { projectId, chapterId, autoFetch = true, onRestore } = options;

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSnapshots = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError('');

    try {
      const result = await client.GET(`/api/projects/${projectId}/chapters/${chapterId}/snapshots`);

      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '获取快照失败';
        setError(msg);
      } else {
        setSnapshots(result.data as Snapshot[]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '获取快照失败';
      setError(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [projectId, chapterId]);

  useEffect(() => {
    if (autoFetch) {
      fetchSnapshots();
    }
  }, [autoFetch, fetchSnapshots]);

  const createSnapshot = useCallback(async (label?: string): Promise<Snapshot> => {
    if (label && label.length > 100) {
      throw new Error('标签不能超过100字');
    }

    const result = await client.POST(`/api/projects/${projectId}/chapters/${chapterId}/snapshots`, {
      body: { label },
    });

    if (result.error) {
      const msg = (result.error as { detail?: string }).detail || '创建快照失败';
      throw new Error(msg);
    }

    await fetchSnapshots();
    return result.data as Snapshot;
  }, [projectId, chapterId, fetchSnapshots]);

  const getSnapshot = useCallback(async (snapshotId: string): Promise<Snapshot> => {
    const result = await client.GET(`/api/projects/${projectId}/chapters/${chapterId}/snapshots/${snapshotId}`);

    if (result.error) {
      const msg = (result.error as { detail?: string }).detail || '获取快照详情失败';
      throw new Error(msg);
    }

    return result.data as Snapshot;
  }, [projectId, chapterId]);

  const deleteSnapshot = useCallback(async (snapshotId: string): Promise<void> => {
    const result = await client.DELETE(`/api/projects/${projectId}/chapters/${chapterId}/snapshots/${snapshotId}`);

    if (result.error) {
      const msg = (result.error as { detail?: string }).detail || '删除快照失败';
      throw new Error(msg);
    }

    await fetchSnapshots();
  }, [projectId, chapterId, fetchSnapshots]);

  const restoreSnapshot = useCallback(async (snapshotId: string): Promise<void> => {
    const result = await client.POST(`/api/projects/${projectId}/chapters/${chapterId}/snapshots/${snapshotId}/restore`);

    if (result.error) {
      const msg = (result.error as { detail?: string }).detail || '恢复快照失败';
      throw new Error(msg);
    }

    onRestore?.();
    await fetchSnapshots();
  }, [projectId, chapterId, fetchSnapshots, onRestore]);

  const getDiff = useCallback(async (snapshotId: string): Promise<DiffResult> => {
    const result = await client.GET(`/api/projects/${projectId}/chapters/${chapterId}/snapshots/${snapshotId}/diff`);

    if (result.error) {
      const msg = (result.error as { detail?: string }).detail || '获取差异对比失败';
      throw new Error(msg);
    }

    return result.data as DiffResult;
  }, [projectId, chapterId]);

  const selectSnapshot = useCallback((snapshot: Snapshot | null) => {
    setSelectedSnapshot(snapshot);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSnapshot(null);
  }, []);

  const calculateStorageStats = useCallback((): StorageStats => {
    const count = snapshots.length;
    const totalSizeBytes = snapshots.reduce((acc, snapshot) => {
      return acc + new Blob([snapshot.content]).size;
    }, 0);

    return { count, totalSizeBytes };
  }, [snapshots]);

  return {
    snapshots,
    loading,
    error,
    selectedSnapshot,
    fetchSnapshots,
    createSnapshot,
    getSnapshot,
    deleteSnapshot,
    restoreSnapshot,
    getDiff,
    selectSnapshot,
    clearSelection,
    calculateStorageStats,
  };
}
