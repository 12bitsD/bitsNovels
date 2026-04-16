import { useCallback, useEffect, useState } from 'react';
import { client } from '../../../api/client';
import type { KBSetting, KBSettingListResponse } from '../components/KBSetting/types';

export interface UseKBSettingReturn {
  items: KBSetting[];
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  search: string;
  category: string;
  selectedSettingId: string | null;
  selectedSetting: KBSetting | null;
  setSearch: (value: string) => void;
  setCategory: (value: string) => void;
  setSelectedSettingId: (value: string | null) => void;
  createSetting: (input: { title: string; category: string; content: string }) => Promise<KBSetting | null>;
  updateSetting: (id: string, input: Partial<Pick<KBSetting, 'title' | 'category' | 'content'>>) => Promise<KBSetting | null>;
  deleteSetting: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

function buildListPath(projectId: string, search: string, category: string): string {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.append('query', search.trim());
  }
  if (category.trim()) {
    params.append('category', category.trim());
  }
  const qs = params.toString();
  return qs ? `/api/projects/${projectId}/kb/settings?${qs}` : `/api/projects/${projectId}/kb/settings`;
}

export function useKBSetting(projectId: string): UseKBSettingReturn {
  const [items, setItems] = useState<KBSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const [selectedSetting, setSelectedSetting] = useState<KBSetting | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: apiError } = await client.GET(buildListPath(projectId, search, category));
      if (apiError || !data) {
        throw new Error('Failed to fetch settings');
      }
      setItems((data as KBSettingListResponse).items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId, search, category]);

  const fetchSettingDetail = useCallback(
    async (id: string) => {
      try {
        setDetailLoading(true);
        const { data, error: apiError } = await client.GET(`/api/projects/${projectId}/kb/settings/${id}`);
        if (apiError || !data) {
          throw new Error('Failed to fetch setting detail');
        }
        setSelectedSetting((data as { setting: KBSetting }).setting);
      } catch (requestError) {
        setSelectedSetting(null);
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      } finally {
        setDetailLoading(false);
      }
    },
    [projectId],
  );

  const refetch = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const createSetting = useCallback(
    async (input: { title: string; category: string; content: string }) => {
      try {
        setError(null);
        const { data, error: apiError } = await client.POST(`/api/projects/${projectId}/kb/settings`, { body: input });
        if (apiError || !data) {
          throw new Error('Failed to create setting');
        }
        await fetchSettings();
        return (data as { setting: KBSetting }).setting;
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
        return null;
      }
    },
    [projectId, fetchSettings],
  );

  const updateSetting = useCallback(
    async (id: string, input: Partial<Pick<KBSetting, 'title' | 'category' | 'content'>>) => {
      try {
        setError(null);
        const { data, error: apiError } = await client.PATCH(`/api/projects/${projectId}/kb/settings/${id}`, {
          body: input,
        });
        if (apiError || !data) {
          throw new Error('Failed to update setting');
        }
        await fetchSettings();
        if (selectedSettingId === id) {
          setSelectedSetting((data as { setting: KBSetting }).setting);
        }
        return (data as { setting: KBSetting }).setting;
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
        return null;
      }
    },
    [projectId, fetchSettings, selectedSettingId],
  );

  const deleteSetting = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const { error: apiError } = await client.DELETE(`/api/projects/${projectId}/kb/settings/${id}`);
        if (apiError) {
          throw new Error('Failed to delete setting');
        }
        if (selectedSettingId === id) {
          setSelectedSettingId(null);
          setSelectedSetting(null);
        }
        await fetchSettings();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      }
    },
    [projectId, fetchSettings, selectedSettingId],
  );

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!selectedSettingId) {
      setSelectedSetting(null);
      return;
    }
    void fetchSettingDetail(selectedSettingId);
  }, [selectedSettingId, fetchSettingDetail]);

  return {
    items,
    loading,
    detailLoading,
    error,
    search,
    category,
    selectedSettingId,
    selectedSetting,
    setSearch,
    setCategory,
    setSelectedSettingId,
    createSetting,
    updateSetting,
    deleteSetting,
    refetch,
  };
}

