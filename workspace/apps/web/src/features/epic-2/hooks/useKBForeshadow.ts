import { useCallback, useEffect, useMemo, useState } from 'react';
import { client } from '../../../api/client';
import type {
  CreateKBForeshadowInput,
  ForeshadowStatusFilter,
  KBForeshadow,
  KBForeshadowSuggestion,
  UpdateKBForeshadowInput,
} from '../components/KBForeshadow/types';

interface UseKBForeshadowOptions {
  projectId: string;
}

interface UseKBForeshadowReturn {
  foreshadows: KBForeshadow[];
  loading: boolean;
  detailLoading: boolean;
  saving: boolean;
  creating: boolean;
  error: string | null;
  search: string;
  statusFilter: ForeshadowStatusFilter;
  selectedForeshadow: KBForeshadow | null;
  setSearch: (value: string) => void;
  setStatusFilter: (value: ForeshadowStatusFilter) => void;
  selectForeshadow: (id: string) => Promise<void>;
  clearSelection: () => void;
  createForeshadow: (payload: CreateKBForeshadowInput) => Promise<KBForeshadow | null>;
  saveForeshadow: (id: string, payload: UpdateKBForeshadowInput) => Promise<KBForeshadow | null>;
  updateForeshadowStatus: (id: string, payload: UpdateKBForeshadowInput) => Promise<KBForeshadow | null>;
  updateExpectedResolveChapter: (id: string, chapterId?: string) => Promise<KBForeshadow | null>;
  confirmSuggestion: (id: string, suggestion: KBForeshadowSuggestion) => Promise<KBForeshadow | null>;
  refetch: () => Promise<void>;
}

function updateItem(items: KBForeshadow[], updated: KBForeshadow) {
  const existing = items.some((item) => item.id === updated.id);
  if (!existing) {
    return [updated, ...items];
  }
  return items.map((item) => (item.id === updated.id ? updated : item));
}

export function useKBForeshadow({ projectId }: UseKBForeshadowOptions): UseKBForeshadowReturn {
  const [foreshadows, setForeshadows] = useState<KBForeshadow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ForeshadowStatusFilter>('all');
  const [selectedForeshadow, setSelectedForeshadow] = useState<KBForeshadow | null>(null);

  const listPath = useMemo(() => {
    const params = new URLSearchParams();
    params.append('groupBy', 'status');
    if (statusFilter !== 'all') {
      params.append('status', statusFilter);
    }
    if (search.trim()) {
      params.append('query', search.trim());
    }
    return `/api/projects/${projectId}/kb/foreshadow?${params.toString()}`;
  }, [projectId, search, statusFilter]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: apiError } = await client.GET(listPath);
      if (apiError) {
        throw new Error('Failed to fetch foreshadows');
      }
      const response = data as { items?: KBForeshadow[] };
      setForeshadows(response.items ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [listPath]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const selectForeshadow = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const { data, error: apiError } = await client.GET(`/api/projects/${projectId}/kb/foreshadow/${id}`);
      if (apiError) {
        throw new Error('Failed to fetch foreshadow detail');
      }
      setSelectedForeshadow((data as { foreshadow: KBForeshadow }).foreshadow);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
    } finally {
      setDetailLoading(false);
    }
  }, [projectId]);

  const clearSelection = useCallback(() => {
    setSelectedForeshadow(null);
  }, []);

  const createForeshadow = useCallback(async (payload: CreateKBForeshadowInput) => {
    try {
      setCreating(true);
      setError(null);
      const { data, error: apiError } = await client.POST(`/api/projects/${projectId}/kb/foreshadow`, {
        body: payload,
      });
      if (apiError) {
        throw new Error('Failed to create foreshadow');
      }
      const created = (data as { foreshadow: KBForeshadow }).foreshadow;
      setForeshadows((current) => [created, ...current]);
      return created;
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unknown error');
      return null;
    } finally {
      setCreating(false);
    }
  }, [projectId]);

  const saveForeshadow = useCallback(async (id: string, payload: UpdateKBForeshadowInput) => {
    try {
      setSaving(true);
      setError(null);
      const { data, error: apiError } = await client.PATCH(`/api/projects/${projectId}/kb/foreshadow/${id}`, {
        body: payload,
      });
      if (apiError) {
        throw new Error('Failed to update foreshadow');
      }
      const updated = (data as { foreshadow: KBForeshadow }).foreshadow;
      setForeshadows((current) => updateItem(current, updated));
      setSelectedForeshadow((current) => (current?.id === updated.id ? updated : current));
      return updated;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unknown error');
      return null;
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  const updateForeshadowStatus = useCallback(async (id: string, payload: UpdateKBForeshadowInput) => {
    return saveForeshadow(id, payload);
  }, [saveForeshadow]);

  const updateExpectedResolveChapter = useCallback(async (id: string, chapterId?: string) => {
    return saveForeshadow(id, { expectedResolveChapterId: chapterId });
  }, [saveForeshadow]);

  const confirmSuggestion = useCallback(async (id: string, suggestion: KBForeshadowSuggestion) => {
    return saveForeshadow(id, {
      status: 'partially_resolved',
      resolvedChapterId: suggestion.chapterId,
      resolveNote: suggestion.message,
    });
  }, [saveForeshadow]);

  return {
    foreshadows,
    loading,
    detailLoading,
    saving,
    creating,
    error,
    search,
    statusFilter,
    selectedForeshadow,
    setSearch,
    setStatusFilter,
    selectForeshadow,
    clearSelection,
    createForeshadow,
    saveForeshadow,
    updateForeshadowStatus,
    updateExpectedResolveChapter,
    confirmSuggestion,
    refetch,
  };
}
