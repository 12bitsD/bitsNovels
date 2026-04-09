import { useState, useEffect, useCallback, useRef } from 'react';
import { client } from '../../../api/client';
import type { Volume, ChapterSummary } from '@bitsnovels/api-types';

interface OutlineResponse {
  volumes: Volume[];
  totals: {
    volumeCount: number;
    chapterCount: number;
    totalChars: number;
  };
}

interface UseChapterPanelOptions {
  projectId: string;
}

interface UseChapterPanelReturn {
  volumes: Volume[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createChapter: (params: { volumeId: string; title?: string; targetOrder?: number }) => Promise<ChapterSummary | null>;
  renameChapter: (chapterId: string, newTitle: string) => Promise<boolean>;
  deleteChapter: (chapterId: string) => Promise<boolean>;
  reorderChapter: (params: {
    chapterId: string;
    targetVolumeId: string;
    targetOrder: number;
  }) => Promise<boolean>;
}

export function useChapterPanel({ projectId }: UseChapterPanelOptions): UseChapterPanelReturn {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchOutline = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      setError(null);
      const { data, error: apiError } = await client.GET(`/api/projects/${projectId}/outline`);
      
      if (!isMounted.current) return;
      
      if (apiError) {
        setError('加载失败，请重试');
        return;
      }
      
      if (data) {
        setVolumes((data as OutlineResponse).volumes);
      }
    } catch {
      if (isMounted.current) {
        setError('加载失败，请重试');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    isMounted.current = true;
    fetchOutline();
    return () => {
      isMounted.current = false;
    };
  }, [fetchOutline]);

  const createChapter = useCallback(async ({
    volumeId,
    title = '新章节',
    targetOrder,
  }: {
    volumeId: string;
    title?: string;
    targetOrder?: number;
  }): Promise<ChapterSummary | null> => {
    try {
      const body: Record<string, unknown> = { volumeId, title };
      if (targetOrder !== undefined) {
        body.targetOrder = targetOrder;
      }
      
      const { data, error: apiError } = await client.POST(`/api/projects/${projectId}/chapters`, {
        body,
      });
      
      if (apiError) {
        return null;
      }
      
      await fetchOutline();
      return data as ChapterSummary;
    } catch {
      return null;
    }
  }, [projectId, fetchOutline]);

  const renameChapter = useCallback(async (chapterId: string, newTitle: string): Promise<boolean> => {
    try {
      const { error: apiError } = await client.PATCH(`/api/projects/${projectId}/chapters/${chapterId}`, {
        body: { title: newTitle },
      });
      
      if (apiError) {
        return false;
      }
      
      await fetchOutline();
      return true;
    } catch {
      return false;
    }
  }, [projectId, fetchOutline]);

  const deleteChapter = useCallback(async (chapterId: string): Promise<boolean> => {
    try {
      const { error: apiError } = await client.DELETE(`/api/projects/${projectId}/chapters/${chapterId}`);
      
      if (apiError) {
        return false;
      }
      
      await fetchOutline();
      return true;
    } catch {
      return false;
    }
  }, [projectId, fetchOutline]);

  const reorderChapter = useCallback(async ({
    chapterId,
    targetVolumeId,
    targetOrder,
  }: {
    chapterId: string;
    targetVolumeId: string;
    targetOrder: number;
  }): Promise<boolean> => {
    try {
      const { error: apiError } = await client.POST(`/api/projects/${projectId}/chapters/reorder`, {
        body: { chapterId, targetVolumeId, targetOrder },
      });
      
      if (apiError) {
        return false;
      }
      
      await fetchOutline();
      return true;
    } catch {
      return false;
    }
  }, [projectId, fetchOutline]);

  return {
    volumes,
    loading,
    error,
    refetch: fetchOutline,
    createChapter,
    renameChapter,
    deleteChapter,
    reorderChapter,
  };
}
