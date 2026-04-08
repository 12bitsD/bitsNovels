import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKBCharacter } from '../useKBCharacter';
import type { KBCharacter } from '../../components/KBCharacter/types';

vi.mock('../../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    PATCH: vi.fn(),
    POST: vi.fn(),
  },
}));

import { client } from '../../../../api/client';

const createCharacter = (overrides: Partial<KBCharacter> = {}): KBCharacter => ({
  id: 'char-1',
  projectId: 'project-1',
  type: 'character',
  source: 'ai',
  confirmed: false,
  name: '沈墨',
  aliases: [],
  occupation: '巡夜人',
  personalityTags: [],
  chapterIds: ['ch-1'],
  firstAppearanceChapterId: 'ch-1',
  lastAppearanceChapterId: 'ch-1',
  appearanceCount: 1,
  createdAt: '2026-04-07T10:00:00Z',
  updatedAt: '2026-04-07T10:00:00Z',
  ...overrides,
});

describe('useKBCharacter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches characters on mount with query and sort options', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({
      data: { items: [createCharacter()], total: 1 },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() =>
      useKBCharacter({
        projectId: 'project-1',
        initialQuery: '沈',
        initialSortBy: 'appearanceCount',
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(client.GET).toHaveBeenCalledWith(
      '/api/projects/project-1/kb/character?query=%E6%B2%88&sortBy=appearanceCount',
    );
    expect(result.current.characters).toHaveLength(1);
  });

  it('loads character detail when selecting a character', async () => {
    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: [createCharacter()], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { character: createCharacter({ appearance: '黑衣、瘦高' }) },
        error: undefined,
        response: new Response(),
      });

    const { result } = renderHook(() => useKBCharacter({ projectId: 'project-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.selectCharacter('char-1');
    });

    expect(client.GET).toHaveBeenLastCalledWith('/api/projects/project-1/kb/character/char-1');
    expect(result.current.selectedCharacter?.appearance).toBe('黑衣、瘦高');
  });

  it('updates a character through patch endpoint', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: [createCharacter()], total: 1 },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.PATCH).mockResolvedValueOnce({
      data: { character: createCharacter({ name: '沈砚' }) },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBCharacter({ projectId: 'project-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateCharacter('char-1', { name: '沈砚' });
    });

    expect(client.PATCH).toHaveBeenCalledWith('/api/projects/project-1/kb/character/char-1', {
      body: { name: '沈砚' },
    });
  });

  it('confirms and batch confirms characters', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: {
        items: [createCharacter({ id: 'char-1' }), createCharacter({ id: 'char-2', name: '顾砚' })],
        total: 2,
      },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.POST)
      .mockResolvedValueOnce({
        data: { character: createCharacter({ id: 'char-1', confirmed: true, source: 'manual' }) },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { confirmedCount: 2 },
        error: undefined,
        response: new Response(),
      });

    const { result } = renderHook(() => useKBCharacter({ projectId: 'project-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedIds(['char-1', 'char-2']);
    });

    await act(async () => {
      await result.current.confirmCharacter('char-1');
      await result.current.batchConfirmCharacters(['char-1', 'char-2']);
    });

    expect(client.POST).toHaveBeenNthCalledWith(1, '/api/projects/project-1/kb/character/char-1/confirm');
    expect(client.POST).toHaveBeenNthCalledWith(2, '/api/projects/project-1/kb/character/bulk-confirm', {
      body: { entityIds: ['char-1', 'char-2'] },
    });
    expect(result.current.selectedIds).toEqual([]);
  });

  it('marks a character as not-character and clears selected detail', async () => {
    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: [createCharacter()], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { character: createCharacter() },
        error: undefined,
        response: new Response(),
      });
    vi.mocked(client.POST).mockResolvedValueOnce({
      data: { character: createCharacter({ deletedAt: '2026-04-07T12:00:00Z' }) },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBCharacter({ projectId: 'project-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.selectCharacter('char-1');
      await result.current.markCharacterNotCharacter('char-1');
    });

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project-1/kb/character/char-1/not-character');
    expect(result.current.selectedCharacter).toBeNull();
  });
});
