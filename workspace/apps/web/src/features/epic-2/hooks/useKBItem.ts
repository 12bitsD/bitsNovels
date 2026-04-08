import { useCallback, useEffect, useState } from 'react';
import { client } from '../../../api/client';
import type { KBItem, KBItemListResponse, ItemType } from '../components/KBItem/types';

interface UseKBItemOptions {
  search?: string;
  itemType?: ItemType | 'all';
}

interface CreateKBItemInput {
  name: string;
  aliases?: string[];
  itemType?: ItemType;
  summary?: string;
  ownerCharacterId?: string;
  chapterIds?: string[];
}

interface UpdateKBItemInput {
  name?: string;
  aliases?: string[];
  itemType?: ItemType;
  summary?: string;
  ownerCharacterId?: string;
  ownershipNote?: string;
  ownershipChapterId?: string;
  chapterIds?: string[];
  remark?: string;
}

export interface UseKBItemReturn {
  items: KBItem[];
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  search: string;
  itemType: ItemType | 'all';
  selectedIds: string[];
  selectedItemId: string | null;
  selectedItem: KBItem | null;
  setSearch: (value: string) => void;
  setItemType: (value: ItemType | 'all') => void;
  setSelectedIds: (ids: string[]) => void;
  setSelectedItemId: (id: string | null) => void;
  createItem: (input: CreateKBItemInput) => Promise<KBItem | null>;
  updateItem: (id: string, input: UpdateKBItemInput) => Promise<KBItem | null>;
  deleteItem: (id: string) => Promise<void>;
  confirmItem: (id: string) => Promise<void>;
  markAsNotItem: (id: string) => Promise<void>;
  batchConfirm: (ids: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

function buildListPath(projectId: string, search: string, itemType: ItemType | 'all'): string {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.append('query', search.trim());
  }

  if (itemType !== 'all') {
    params.append('itemType', itemType);
  }

  const queryString = params.toString();
  return queryString ? `/api/projects/${projectId}/kb/item?${queryString}` : `/api/projects/${projectId}/kb/item`;
}

export function useKBItem(projectId: string, options: UseKBItemOptions = {}): UseKBItemReturn {
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(options.search ?? '');
  const [itemType, setItemType] = useState<ItemType | 'all'>(options.itemType ?? 'all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<KBItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: apiError } = await client.GET(buildListPath(projectId, search, itemType));

      if (apiError) {
        throw new Error('Failed to fetch items');
      }

      const response = data as KBItemListResponse;
      setItems(response.items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId, search, itemType]);

  const fetchItemDetail = useCallback(
    async (id: string) => {
      try {
        setDetailLoading(true);
        const { data, error: apiError } = await client.GET(`/api/projects/${projectId}/kb/item/${id}`);

        if (apiError) {
          throw new Error('Failed to fetch item detail');
        }

        setSelectedItem((data as { item: KBItem }).item);
      } catch (requestError) {
        setSelectedItem(null);
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      } finally {
        setDetailLoading(false);
      }
    },
    [projectId],
  );

  const refetch = useCallback(async () => {
    await fetchItems();
  }, [fetchItems]);

  const createItem = useCallback(
    async (input: CreateKBItemInput): Promise<KBItem | null> => {
      try {
        setError(null);
        const { data, error: apiError } = await client.POST(`/api/projects/${projectId}/kb/item`, {
          body: input,
        });

        if (apiError) {
          throw new Error('Failed to create item');
        }

        await fetchItems();
        return (data as { item: KBItem }).item;
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
        return null;
      }
    },
    [projectId, fetchItems],
  );

  const updateItem = useCallback(
    async (id: string, input: UpdateKBItemInput): Promise<KBItem | null> => {
      try {
        setError(null);
        const { data, error: apiError } = await client.PATCH(`/api/projects/${projectId}/kb/item/${id}`, {
          body: input,
        });

        if (apiError) {
          throw new Error('Failed to update item');
        }

        await fetchItems();
        if (selectedItemId === id) {
          setSelectedItem((data as { item: KBItem }).item);
        }
        return (data as { item: KBItem }).item;
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
        return null;
      }
    },
    [projectId, fetchItems, selectedItemId],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const { error: apiError } = await client.DELETE(`/api/projects/${projectId}/kb/item/${id}`);

        if (apiError) {
          throw new Error('Failed to delete item');
        }

        if (selectedItemId === id) {
          setSelectedItemId(null);
          setSelectedItem(null);
        }

        await fetchItems();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      }
    },
    [projectId, fetchItems, selectedItemId],
  );

  const confirmItem = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const { data, error: apiError } = await client.POST(`/api/projects/${projectId}/kb/item/${id}/confirm`);

        if (apiError) {
          throw new Error('Failed to confirm item');
        }

        if (selectedItemId === id) {
          setSelectedItem((data as { item: KBItem }).item);
        }

        await fetchItems();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      }
    },
    [projectId, fetchItems, selectedItemId],
  );

  const markAsNotItem = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const { error: apiError } = await client.POST(`/api/projects/${projectId}/kb/item/${id}/reject`, {
          body: {},
        });

        if (apiError) {
          throw new Error('Failed to reject item');
        }

        if (selectedItemId === id) {
          setSelectedItemId(null);
          setSelectedItem(null);
        }

        await fetchItems();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      }
    },
    [projectId, fetchItems, selectedItemId],
  );

  const batchConfirm = useCallback(
    async (ids: string[]) => {
      try {
        setError(null);
        const { error: apiError } = await client.POST(`/api/projects/${projectId}/kb/item/bulk-confirm`, {
          body: { entityIds: ids },
        });

        if (apiError) {
          throw new Error('Failed to batch confirm items');
        }

        setSelectedIds([]);
        await fetchItems();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      }
    },
    [projectId, fetchItems],
  );

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      return;
    }

    void fetchItemDetail(selectedItemId);
  }, [selectedItemId, fetchItemDetail]);

  return {
    items,
    loading,
    detailLoading,
    error,
    search,
    itemType,
    selectedIds,
    selectedItemId,
    selectedItem,
    setSearch,
    setItemType,
    setSelectedIds,
    setSelectedItemId,
    createItem,
    updateItem,
    deleteItem,
    confirmItem,
    markAsNotItem,
    batchConfirm,
    refetch,
  };
}
