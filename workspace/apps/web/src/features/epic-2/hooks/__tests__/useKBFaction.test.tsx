import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKBFaction } from '../useKBFaction';
import { client } from '../../../../api/client';

vi.mock('../../../../api/client');

const createFaction = (id: string): any => ({
  id,
  projectId: 'project1',
  type: 'faction',
  source: 'ai',
  confirmed: false,
  name: `势力${id}`,
  aliases: [],
  factionType: 'sect',
  memberCharacterIds: ['char1'],
  allyFactionIds: [],
  rivalFactionIds: [],
  chapterIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('useKBFaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: [], has_more: false },
      error: undefined,
      response: {} as Response,
    });

    const { result } = renderHook(() => useKBFaction({ projectId: 'project1' }));

    expect(result.current.factions).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
    expect(result.current.search).toBe('');
    expect(result.current.typeFilter).toBe('all');
    expect(result.current.selectedFaction).toBeNull();
  });

  it('should have setSearch function', () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: [], has_more: false },
      error: undefined,
      response: {} as Response,
    });

    const { result } = renderHook(() => useKBFaction({ projectId: 'project1' }));

    expect(result.current.setSearch).toBeDefined();
    expect(typeof result.current.setSearch).toBe('function');
  });

  it('should have setTypeFilter function', () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: [], has_more: false },
      error: undefined,
      response: {} as Response,
    });

    const { result } = renderHook(() => useKBFaction({ projectId: 'project1' }));

    expect(result.current.setTypeFilter).toBeDefined();
    expect(typeof result.current.setTypeFilter).toBe('function');
  });

  it('should confirm a faction', async () => {
    const mockFaction = { ...createFaction('1'), confirmed: false };
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: [mockFaction], has_more: false },
      error: undefined,
      response: {} as Response,
    });

    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: undefined,
      response: {} as Response,
    });

    const { result } = renderHook(() => useKBFaction({ projectId: 'project1' }));

    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.confirmFaction('1');

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/knowledge-base/factions/1/confirm');
  });

  it('should reject a faction', async () => {
    const mockFaction = createFaction('1');
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: [mockFaction], has_more: false },
      error: undefined,
      response: {} as Response,
    });

    vi.mocked(client.DELETE).mockResolvedValue({
      data: undefined,
      error: undefined,
      response: {} as Response,
    });

    const { result } = renderHook(() => useKBFaction({ projectId: 'project1' }));

    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.rejectFaction('1');

    expect(client.DELETE).toHaveBeenCalledWith('/api/projects/project1/knowledge-base/factions/1');
  });

  it('should handle API error', async () => {
    vi.mocked(client.GET).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useKBFaction({ projectId: 'project1' }));

    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
  });
});