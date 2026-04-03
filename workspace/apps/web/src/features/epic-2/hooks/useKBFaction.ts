import { useState, useEffect, useCallback } from 'react';
import { client } from '../../../api/client';
import type { KBFaction, FactionType, KBFactionReferences } from '../components/KBFaction/types';

const PAGE_SIZE = 20;

export interface UseKBFactionOptions {
  projectId: string;
  initialSearch?: string;
  initialTypeFilter?: FactionType | 'all';
}

export interface UseKBFactionReturn {
  factions: KBFaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  search: string;
  setSearch: (search: string) => void;
  typeFilter: FactionType | 'all';
  setTypeFilter: (filter: FactionType | 'all') => void;
  selectedFaction: KBFaction | null;
  setSelectedFaction: (faction: KBFaction | null) => void;
  selectedFactionRefs: KBFactionReferences | null;
  loadingRefs: boolean;
  loadMore: () => Promise<void>;
  confirmFaction: (id: string) => Promise<void>;
  rejectFaction: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useKBFaction({
  projectId,
  initialSearch = '',
  initialTypeFilter = 'all',
}: UseKBFactionOptions): UseKBFactionReturn {
  const [factions, setFactions] = useState<KBFaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<FactionType | 'all'>(initialTypeFilter);
  const [selectedFaction, setSelectedFaction] = useState<KBFaction | null>(null);
  const [selectedFactionRefs, setSelectedFactionRefs] = useState<KBFactionReferences | null>(null);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const buildQueryString = useCallback((pageNum: number, searchQuery: string, filter: FactionType | 'all') => {
    const params = new URLSearchParams();
    params.append('page', pageNum.toString());
    params.append('page_size', PAGE_SIZE.toString());
    if (searchQuery.trim()) {
      params.append('search', searchQuery.trim());
    }
    if (filter !== 'all') {
      params.append('faction_type', filter);
    }
    return params.toString();
  }, []);

  const fetchFactions = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const queryString = buildQueryString(pageNum, search, typeFilter);
      const { data, error: apiError } = await client.GET(
        `/api/projects/${projectId}/knowledge-base/factions?${queryString}`
      );

      if (apiError) {
        throw new Error('Failed to fetch factions');
      }

      const response = data as { items: KBFaction[]; has_more: boolean };

      if (append) {
        setFactions(prev => [...prev, ...response.items]);
      } else {
        setFactions(response.items);
      }

      setHasMore(response.has_more);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [buildQueryString, projectId, search, typeFilter]);

  const fetchFactionReferences = useCallback(async (factionId: string) => {
    try {
      setLoadingRefs(true);
      const { data, error: apiError } = await client.GET(
        `/api/projects/${projectId}/knowledge-base/factions/${factionId}/references`
      );

      if (apiError) {
        throw new Error('Failed to fetch faction references');
      }

      setSelectedFactionRefs(data as KBFactionReferences);
    } catch (err) {
      setSelectedFactionRefs(null);
    } finally {
      setLoadingRefs(false);
    }
  }, [projectId]);

  const confirmFaction = useCallback(async (id: string) => {
    const originalFactions = [...factions];
    setFactions(prev =>
      prev.map(f => (f.id === id ? { ...f, confirmed: true, source: 'manual' as const } : f))
    );

    if (selectedFaction?.id === id) {
      setSelectedFaction(prev => prev ? { ...prev, confirmed: true, source: 'manual' as const } : null);
    }

    try {
      const { error: apiError } = await client.POST(
        `/api/projects/${projectId}/knowledge-base/factions/${id}/confirm`
      );

      if (apiError) {
        throw new Error('Failed to confirm faction');
      }
    } catch {
      setFactions(originalFactions);
      if (selectedFaction?.id === id) {
        setSelectedFaction(prev => prev ? { ...prev, confirmed: false, source: 'ai' as const } : null);
      }
    }
  }, [factions, projectId, selectedFaction]);

  const rejectFaction = useCallback(async (id: string) => {
    const originalFactions = [...factions];
    setFactions(prev => prev.filter(f => f.id !== id));

    if (selectedFaction?.id === id) {
      setSelectedFaction(null);
      setSelectedFactionRefs(null);
    }

    try {
      const { error: apiError } = await client.DELETE(
        `/api/projects/${projectId}/knowledge-base/factions/${id}`
      );

      if (apiError) {
        throw new Error('Failed to reject faction');
      }
    } catch {
      setFactions(originalFactions);
    }
  }, [factions, projectId, selectedFaction]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchFactions(page + 1, true);
  }, [hasMore, loading, page, fetchFactions]);

  const refetch = useCallback(async () => {
    await fetchFactions(1, false);
  }, [fetchFactions]);

  useEffect(() => {
    fetchFactions(1, false);
  }, [projectId, search, typeFilter]);

  useEffect(() => {
    if (selectedFaction) {
      fetchFactionReferences(selectedFaction.id);
    } else {
      setSelectedFactionRefs(null);
    }
  }, [selectedFaction, fetchFactionReferences]);

  return {
    factions,
    loading,
    error,
    hasMore,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    selectedFaction,
    setSelectedFaction,
    selectedFactionRefs,
    loadingRefs,
    loadMore,
    confirmFaction,
    rejectFaction,
    refetch,
  };
}
