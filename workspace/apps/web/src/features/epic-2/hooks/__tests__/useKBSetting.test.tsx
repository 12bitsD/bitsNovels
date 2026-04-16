import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '../../../../api/client';
import { useKBSetting } from '../useKBSetting';

vi.mock('../../../../api/client', async () => {
  const actual = await vi.importActual('../../../../api/client');
  return {
    ...actual,
    client: {
      GET: vi.fn(),
      POST: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    },
  };
});

const setting = {
  id: 'setting-1',
  projectId: 'project-1',
  type: 'setting',
  source: 'ai',
  confirmed: true,
  createdAt: '2026-04-16T00:00:00Z',
  updatedAt: '2026-04-16T00:00:00Z',
  title: '帝国纪年体系',
  category: '历史',
  content: '奠基纪/扩张纪/裂变纪。',
  order: 0,
  relatedEntityRefs: [],
};

describe('useKBSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches list and detail', async () => {
    vi.mocked(client.GET)
      .mockResolvedValueOnce({ data: { items: [setting], total: 1 }, error: undefined } as never)
      .mockResolvedValueOnce({ data: { setting }, error: undefined } as never);

    const { result } = renderHook(() => useKBSetting('project-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.setSelectedSettingId('setting-1');
    });

    await waitFor(() => {
      expect(result.current.selectedSetting?.id).toBe('setting-1');
    });
  });

  it('creates, updates and deletes setting', async () => {
    vi.mocked(client.GET)
      .mockResolvedValueOnce({ data: { items: [], total: 0 }, error: undefined } as never)
      .mockResolvedValueOnce({ data: { items: [setting], total: 1 }, error: undefined } as never)
      .mockResolvedValueOnce({ data: { items: [setting], total: 1 }, error: undefined } as never)
      .mockResolvedValueOnce({ data: { items: [], total: 0 }, error: undefined } as never);
    vi.mocked(client.POST).mockResolvedValueOnce({ data: { setting }, error: undefined } as never);
    vi.mocked(client.PATCH).mockResolvedValueOnce({
      data: { setting: { ...setting, title: '新标题' } },
      error: undefined,
    } as never);
    vi.mocked(client.DELETE).mockResolvedValueOnce({ error: undefined } as never);

    const { result } = renderHook(() => useKBSetting('project-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.createSetting({
        title: '帝国纪年体系',
        category: '历史',
        content: '奠基纪/扩张纪/裂变纪。',
      });
    });

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project-1/kb/settings', {
      body: {
        title: '帝国纪年体系',
        category: '历史',
        content: '奠基纪/扩张纪/裂变纪。',
      },
    });

    await act(async () => {
      await result.current.updateSetting('setting-1', { title: '新标题' });
    });
    expect(client.PATCH).toHaveBeenCalledWith('/api/projects/project-1/kb/settings/setting-1', {
      body: { title: '新标题' },
    });

    await act(async () => {
      await result.current.deleteSetting('setting-1');
    });
    expect(client.DELETE).toHaveBeenCalledWith('/api/projects/project-1/kb/settings/setting-1');
  });
});

