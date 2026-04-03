import { useState, useEffect, useCallback } from 'react';
import { client } from '../../../api/client';
import type { 
  KBLocation, 
  KBLocationTreeNode, 
  KBLocationListResponse,
  KBLocationReferences,
  LocationType 
} from '../components/KBLocation/types';

interface UseKBLocationOptions {
  search?: string;
  locationType?: LocationType;
  confirmed?: boolean;
}

interface UseKBLocationReturn {
  locations: KBLocation[];
  tree: KBLocationTreeNode[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  search: string;
  locationType: LocationType | undefined;
  confirmed: boolean | undefined;
  selectedIds: string[];
  confirmDialogOpen: boolean;
  bulkConfirmDialogOpen: boolean;
  mergeDialogOpen: boolean;
  pendingConfirmId: string | null;
  pendingBulkConfirmIds: string[];
  pendingMergeSourceId: string | null;
  locationsMap: Record<string, KBLocation>;
  setSearch: (search: string) => void;
  setLocationType: (type: LocationType | undefined) => void;
  setConfirmed: (confirmed: boolean | undefined) => void;
  setSelectedIds: (ids: string[]) => void;
  createLocation: (data: CreateKBLocationInput) => Promise<KBLocation | null>;
  updateLocation: (id: string, data: UpdateKBLocationInput) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  confirmLocation: (id: string) => Promise<void>;
  rejectLocation: (id: string) => Promise<void>;
  bulkConfirm: (ids: string[]) => Promise<void>;
  mergeLocation: (sourceId: string, targetId: string) => Promise<void>;
  fetchReferences: (id: string) => Promise<KBLocationReferences | null>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  setConfirmDialogOpen: (open: boolean) => void;
  setBulkConfirmDialogOpen: (open: boolean) => void;
  setMergeDialogOpen: (open: boolean) => void;
  setPendingConfirmId: (id: string | null) => void;
  setPendingBulkConfirmIds: (ids: string[]) => void;
  setPendingMergeSourceId: (id: string | null) => void;
  handleSearchChange: (value: string) => void;
  handleTypeFilterChange: (value: LocationType | undefined) => void;
  handleConfirm: (id: string) => void;
  handleReject: (id: string) => void;
  handleBulkConfirm: (ids: string[]) => void;
  handleMerge: (sourceId: string) => void;
}

interface CreateKBLocationInput {
  name: string;
  locationType: LocationType;
  parentId?: string;
  aliases?: string[];
  description?: string;
}

interface UpdateKBLocationInput {
  name?: string;
  locationType?: LocationType;
  parentId?: string | null;
  aliases?: string[];
  description?: string;
  remark?: string;
}

const PAGE_SIZE = 20;

export function useKBLocation(projectId: string, options: UseKBLocationOptions = {}): UseKBLocationReturn {
  const [locations, setLocations] = useState<KBLocation[]>([]);
  const [tree, setTree] = useState<KBLocationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  
  const [search, setSearch] = useState(options.search || '');
  const [locationType, setLocationType] = useState<LocationType | undefined>(options.locationType);
  const [confirmed, setConfirmed] = useState<boolean | undefined>(options.confirmed);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [bulkConfirmDialogOpen, setBulkConfirmDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [pendingBulkConfirmIds, setPendingBulkConfirmIds] = useState<string[]>([]);
  const [pendingMergeSourceId, setPendingMergeSourceId] = useState<string | null>(null);

  const locationsMap = locations.reduce((acc, loc) => {
    acc[loc.id] = loc;
    return acc;
  }, {} as Record<string, KBLocation>);

  const buildQueryString = useCallback((pageNum: number, searchQuery: string, type: LocationType | undefined, conf: boolean | undefined) => {
    const params = new URLSearchParams();
    params.append('page', pageNum.toString());
    params.append('page_size', PAGE_SIZE.toString());
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    if (type) {
      params.append('location_type', type);
    }
    if (conf !== undefined) {
      params.append('confirmed', conf.toString());
    }
    return params.toString();
  }, []);

  const buildTree = useCallback((flatLocations: KBLocation[]): KBLocationTreeNode[] => {
    const locationMap = new Map<string, KBLocationTreeNode>();
    const rootNodes: KBLocationTreeNode[] = [];

    flatLocations.forEach(loc => {
      locationMap.set(loc.id, { ...loc, children: [] });
    });

    flatLocations.forEach(loc => {
      const node = locationMap.get(loc.id)!;
      if (loc.parentId && locationMap.has(loc.parentId)) {
        const parent = locationMap.get(loc.parentId)!;
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, []);

  const fetchLocations = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const queryString = buildQueryString(pageNum, search, locationType, confirmed);
      const { data, error: apiError } = await client.GET(`/api/projects/${projectId}/kb/location?${queryString}`);

      if (apiError) {
        throw new Error('Failed to fetch locations');
      }

      const response = data as KBLocationListResponse;

      if (append) {
        setLocations(prev => [...prev, ...response.items]);
      } else {
        setLocations(response.items);
      }

      setTree(buildTree(response.items));
      setHasMore(response.has_more);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId, search, locationType, confirmed, buildQueryString, buildTree]);

  useEffect(() => {
    fetchLocations(1, false);
  }, [projectId, search, locationType, confirmed]);

  const createLocation = useCallback(async (input: CreateKBLocationInput): Promise<KBLocation | null> => {
    try {
      const { data, error: apiError } = await client.POST(`/api/projects/${projectId}/kb/location`, {
        body: input,
      });

      if (apiError) {
        throw new Error('Failed to create location');
      }

      await fetchLocations(1, false);
      return data as KBLocation;
    } catch {
      return null;
    }
  }, [projectId, fetchLocations]);

  const updateLocation = useCallback(async (id: string, input: UpdateKBLocationInput): Promise<void> => {
    try {
      const { error: apiError } = await client.PATCH(`/api/projects/${projectId}/kb/location/${id}`, {
        body: input,
      });

      if (apiError) {
        throw new Error('Failed to update location');
      }

      await fetchLocations(1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectId, fetchLocations]);

  const deleteLocation = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: apiError } = await client.DELETE(`/api/projects/${projectId}/kb/location/${id}`);

      if (apiError) {
        throw new Error('Failed to delete location');
      }

      await fetchLocations(1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectId, fetchLocations]);

  const confirmLocation = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: apiError } = await client.POST(`/api/projects/${projectId}/kb/location/${id}/confirm`);

      if (apiError) {
        throw new Error('Failed to confirm location');
      }

      await fetchLocations(1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectId, fetchLocations]);

  const rejectLocation = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: apiError } = await client.POST(`/api/projects/${projectId}/kb/location/${id}/reject`);

      if (apiError) {
        throw new Error('Failed to reject location');
      }

      await fetchLocations(1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectId, fetchLocations]);

  const bulkConfirm = useCallback(async (ids: string[]): Promise<void> => {
    try {
      const { error: apiError } = await client.POST(`/api/projects/${projectId}/kb/location/bulk-confirm`, {
        body: { entity_ids: ids },
      });

      if (apiError) {
        throw new Error('Failed to bulk confirm locations');
      }

      setSelectedIds([]);
      await fetchLocations(1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectId, fetchLocations]);

  const mergeLocation = useCallback(async (sourceId: string, targetId: string): Promise<void> => {
    try {
      const { error: apiError } = await client.POST(`/api/projects/${projectId}/kb/location/${sourceId}/merge`, {
        body: { merge_with_id: targetId },
      });

      if (apiError) {
        throw new Error('Failed to merge locations');
      }

      await fetchLocations(1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectId, fetchLocations]);

  const fetchReferences = useCallback(async (id: string): Promise<KBLocationReferences | null> => {
    try {
      const { data, error: apiError } = await client.GET(`/api/projects/${projectId}/kb/location/${id}/references`);

      if (apiError) {
        throw new Error('Failed to fetch references');
      }

      return data as KBLocationReferences;
    } catch {
      return null;
    }
  }, [projectId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchLocations(page + 1, true);
  }, [hasMore, loading, page, fetchLocations]);

  const refetch = useCallback(async () => {
    await fetchLocations(1, false);
  }, [fetchLocations]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleTypeFilterChange = useCallback((value: LocationType | undefined) => {
    setLocationType(value);
  }, []);

  const handleConfirm = useCallback((id: string) => {
    setPendingConfirmId(id);
    setConfirmDialogOpen(true);
  }, []);

  const handleReject = useCallback(async (id: string) => {
    await rejectLocation(id);
  }, [rejectLocation]);

  const handleBulkConfirm = useCallback((ids: string[]) => {
    setPendingBulkConfirmIds(ids);
    setBulkConfirmDialogOpen(true);
  }, []);

  const handleMerge = useCallback((sourceId: string) => {
    setPendingMergeSourceId(sourceId);
    setMergeDialogOpen(true);
  }, []);

  return {
    locations,
    tree,
    loading,
    error,
    hasMore,
    search,
    locationType,
    confirmed,
    selectedIds,
    confirmDialogOpen,
    bulkConfirmDialogOpen,
    mergeDialogOpen,
    pendingConfirmId,
    pendingBulkConfirmIds,
    pendingMergeSourceId,
    locationsMap,
    setSearch,
    setLocationType,
    setConfirmed,
    setSelectedIds,
    createLocation,
    updateLocation,
    deleteLocation,
    confirmLocation,
    rejectLocation,
    bulkConfirm,
    mergeLocation,
    fetchReferences,
    loadMore,
    refetch,
    setConfirmDialogOpen,
    setBulkConfirmDialogOpen,
    setMergeDialogOpen,
    setPendingConfirmId,
    setPendingBulkConfirmIds,
    setPendingMergeSourceId,
    handleSearchChange,
    handleTypeFilterChange,
    handleConfirm,
    handleReject,
    handleBulkConfirm,
    handleMerge,
  };
}
