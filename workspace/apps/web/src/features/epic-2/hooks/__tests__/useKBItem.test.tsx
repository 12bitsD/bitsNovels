import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useKBItem } from '../useKBItem';
import type { KBItem } from '../../components/KBItem/types';

vi.mock('../../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
}));

import { client } from '../../../../api/client';

const createKBItem = (id: string, overrides: Partial<KBItem> = {}): KBItem => ({
  id,
  projectId: 'project1',
  type: 'item',
  source: 'ai',
  confirmed: false,
  name: `道具${id}`,
  aliases: [],
  itemType: 'weapon',
  summary: '道具摘要',
  ownerCharacterId: 'char-li',
  ownershipHistory: [],
  chapterIds: ['chapter-1'],
  createdAt: '2026-04-07T08:00:00Z',
  updatedAt: '2026-04-07T08:00:00Z',
  ...overrides,
});

describe('useKBItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches items on mount with initial filters', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({
      data: { items: [], total: 0 },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBItem('project1', { search: '剑', itemType: 'weapon' }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(client.GET).toHaveBeenCalledWith('/api/projects/project1/kb/item?query=%E5%89%91&itemType=weapon');
    expect(result.current.search).toBe('剑');
    expect(result.current.itemType).toBe('weapon');
  });

  it('loads selected item detail', async () => {
    const item = createKBItem('1');
    const detailedItem = createKBItem('1', {
      summary: '玄铁剑可破灵气护体。',
      ownershipHistory: [
        {
          fromCharacterId: 'char-zhang',
          toCharacterId: 'char-li',
          chapterId: 'chapter-9',
          note: '擂台获胜所得',
          createdAt: '2026-04-07T10:00:00Z',
        },
      ],
    });

    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: [item], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { item: detailedItem },
        error: undefined,
        response: new Response(),
      });

    const { result } = renderHook(() => useKBItem('project1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSelectedItemId('1');
    });

    await waitFor(() => expect(result.current.detailLoading).toBe(false));

    expect(client.GET).toHaveBeenLastCalledWith('/api/projects/project1/kb/item/1');
    expect(result.current.selectedItem?.summary).toBe('玄铁剑可破灵气护体。');
    expect(result.current.selectedItem?.ownershipHistory).toHaveLength(1);
  });

  it('confirms an item and refreshes the list', async () => {
    const item = createKBItem('1', { confirmed: false, source: 'ai' });
    const confirmedItem = createKBItem('1', { confirmed: true, source: 'manual' });

    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: [item], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { items: [confirmedItem], total: 1 },
        error: undefined,
        response: new Response(),
      });

    vi.mocked(client.POST).mockResolvedValueOnce({
      data: { item: confirmedItem },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBItem('project1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.confirmItem('1');
    });

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/item/1/confirm');
    expect(result.current.items[0]?.confirmed).toBe(true);
    expect(result.current.items[0]?.source).toBe('manual');
  });

  it('marks an item as not-item and removes it from the list', async () => {
    const item = createKBItem('1');

    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: [item], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { items: [], total: 0 },
        error: undefined,
        response: new Response(),
      });

    vi.mocked(client.POST).mockResolvedValueOnce({
      data: { item: { ...item, deletedAt: '2026-04-07T09:00:00Z' } },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBItem('project1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markAsNotItem('1');
    });

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/item/1/reject', {
      body: {},
    });
    expect(result.current.items).toEqual([]);
  });

  it('batch confirms selected items and clears the current selection', async () => {
    const pendingItems = [
      createKBItem('1', { confirmed: false }),
      createKBItem('2', { confirmed: false, itemType: 'token' }),
    ];
    const confirmedItems = pendingItems.map((item) => ({
      ...item,
      confirmed: true,
      source: 'manual' as const,
    }));

    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: pendingItems, total: 2 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { items: confirmedItems, total: 2 },
        error: undefined,
        response: new Response(),
      });

    vi.mocked(client.POST).mockResolvedValueOnce({
      data: { ok: true, confirmedCount: 2 },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBItem('project1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSelectedIds(['1', '2']);
    });

    await act(async () => {
      await result.current.batchConfirm(['1', '2']);
    });

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/item/bulk-confirm', {
      body: { entityIds: ['1', '2'] },
    });
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.items.every((item) => item.confirmed)).toBe(true);
  });

  it('supports create, update, and delete item mutations', async () => {
    const createdItem = createKBItem('1', { name: '玄铁剑' });
    const updatedItem = createKBItem('1', { name: '玄铁重剑', summary: '已重新锻造' });

    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: [], total: 0 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { items: [createdItem], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { items: [updatedItem], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { items: [], total: 0 },
        error: undefined,
        response: new Response(),
      });

    vi.mocked(client.POST).mockResolvedValueOnce({
      data: { item: createdItem },
      error: undefined,
      response: new Response(),
    });

    vi.mocked(client.PATCH).mockResolvedValueOnce({
      data: { item: updatedItem },
      error: undefined,
      response: new Response(),
    });

    vi.mocked(client.DELETE).mockResolvedValueOnce({
      data: { ok: true },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBItem('project1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createItem({
        name: '玄铁剑',
        aliases: ['黑剑'],
        itemType: 'weapon',
        summary: '初次出场于卷一',
      });
    });

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/item', {
      body: {
        name: '玄铁剑',
        aliases: ['黑剑'],
        itemType: 'weapon',
        summary: '初次出场于卷一',
      },
    });
    expect(result.current.items[0]?.name).toBe('玄铁剑');

    await act(async () => {
      await result.current.updateItem('1', { name: '玄铁重剑', summary: '已重新锻造' });
    });

    expect(client.PATCH).toHaveBeenCalledWith('/api/projects/project1/kb/item/1', {
      body: { name: '玄铁重剑', summary: '已重新锻造' },
    });
    expect(result.current.items[0]?.name).toBe('玄铁重剑');

    await act(async () => {
      await result.current.deleteItem('1');
    });

    expect(client.DELETE).toHaveBeenCalledWith('/api/projects/project1/kb/item/1');
    expect(result.current.items).toEqual([]);
  });

  it('surfaces request errors', async () => {
    vi.mocked(client.GET).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useKBItem('project1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
  });
});
