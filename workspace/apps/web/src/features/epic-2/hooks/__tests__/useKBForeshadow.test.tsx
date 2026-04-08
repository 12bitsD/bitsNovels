import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKBForeshadow } from '../useKBForeshadow';
import type { KBForeshadow } from '../../components/KBForeshadow/types';

vi.mock('../../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
}));

import { client } from '../../../../api/client';

const createForeshadow = (id: string, overrides: Partial<KBForeshadow> = {}): KBForeshadow => ({
  id,
  projectId: 'project1',
  type: 'foreshadow',
  source: 'manual',
  confirmed: true,
  name: `伏笔${id}`,
  summary: `摘要${id}`,
  plantedChapterId: 'chapter-1',
  quote: '埋下的原文',
  status: 'unresolved',
  aiSuggestions: [],
  notifyState: { reminded: false, warned: false },
  createdAt: '2026-04-07T10:00:00Z',
  updatedAt: '2026-04-07T10:00:00Z',
  ...overrides,
});

describe('useKBForeshadow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches foreshadows on mount', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({
      data: { items: [createForeshadow('1')], total: 1 },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBForeshadow({ projectId: 'project1' }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(client.GET).toHaveBeenCalledWith('/api/projects/project1/kb/foreshadow?groupBy=status');
    expect(result.current.foreshadows).toHaveLength(1);
    expect(result.current.foreshadows[0].name).toBe('伏笔1');
  });

  it('refetches when search and status filter change', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: [], total: 0 },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBForeshadow({ projectId: 'project1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearch('玉佩');
    });

    await waitFor(() => {
      expect(client.GET).toHaveBeenLastCalledWith(
        '/api/projects/project1/kb/foreshadow?groupBy=status&query=%E7%8E%89%E4%BD%A9',
      );
    });

    act(() => {
      result.current.setStatusFilter('resolved');
    });

    await waitFor(() => {
      expect(client.GET).toHaveBeenLastCalledWith(
        '/api/projects/project1/kb/foreshadow?groupBy=status&status=resolved&query=%E7%8E%89%E4%BD%A9',
      );
    });
  });

  it('loads detail when selecting a foreshadow', async () => {
    const item = createForeshadow('1');
    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: [item], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { foreshadow: { ...item, quote: '详情中的原文' } },
        error: undefined,
        response: new Response(),
      });

    const { result } = renderHook(() => useKBForeshadow({ projectId: 'project1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.selectForeshadow('1');
    });

    expect(client.GET).toHaveBeenLastCalledWith('/api/projects/project1/kb/foreshadow/1');
    expect(result.current.selectedForeshadow?.quote).toBe('详情中的原文');
  });

  it('creates a foreshadow with manual form data', async () => {
    const created = createForeshadow('created', {
      name: '血玉反噬',
      expectedResolveChapterId: 'chapter-3',
    });

    vi.mocked(client.GET).mockResolvedValueOnce({
      data: { items: [], total: 0 },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.POST).mockResolvedValueOnce({
      data: { foreshadow: created },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBForeshadow({ projectId: 'project1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.createForeshadow({
        name: '血玉反噬',
        summary: '血玉在后续会反噬主人',
        plantedChapterId: 'chapter-1',
        quote: '那枚血玉在月光下像活物般跳动。',
        expectedResolveChapterId: 'chapter-3',
      });
    });

    expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/foreshadow', {
      body: {
        name: '血玉反噬',
        summary: '血玉在后续会反噬主人',
        plantedChapterId: 'chapter-1',
        quote: '那枚血玉在月光下像活物般跳动。',
        expectedResolveChapterId: 'chapter-3',
      },
    });
    expect(result.current.foreshadows[0].name).toBe('血玉反噬');
  });

  it('updates status and clears overdue highlight from returned detail', async () => {
    const item = createForeshadow('1', {
      notifyState: { reminded: true, warned: true },
    });
    const resolved = createForeshadow('1', {
      status: 'resolved',
      resolvedChapterId: 'chapter-2',
      resolveNote: '主角破解了机关',
      notifyState: { reminded: false, warned: false },
    });

    vi.mocked(client.GET)
      .mockResolvedValueOnce({
        data: { items: [item], total: 1 },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: { foreshadow: item },
        error: undefined,
        response: new Response(),
      });
    vi.mocked(client.PATCH).mockResolvedValueOnce({
      data: { foreshadow: resolved },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBForeshadow({ projectId: 'project1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.selectForeshadow('1');
    });

    await act(async () => {
      await result.current.updateForeshadowStatus('1', {
        status: 'resolved',
        resolvedChapterId: 'chapter-2',
        resolveNote: '主角破解了机关',
      });
    });

    expect(client.PATCH).toHaveBeenCalledWith('/api/projects/project1/kb/foreshadow/1', {
      body: {
        status: 'resolved',
        resolvedChapterId: 'chapter-2',
        resolveNote: '主角破解了机关',
      },
    });
    expect(result.current.selectedForeshadow?.status).toBe('resolved');
    expect(result.current.selectedForeshadow?.notifyState.warned).toBe(false);
  });

  it('updates expected resolve chapter through patch endpoint', async () => {
    const item = createForeshadow('1');
    const updated = createForeshadow('1', { expectedResolveChapterId: 'chapter-6' });

    vi.mocked(client.GET).mockResolvedValueOnce({
      data: { items: [item], total: 1 },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.PATCH).mockResolvedValueOnce({
      data: { foreshadow: updated },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useKBForeshadow({ projectId: 'project1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateExpectedResolveChapter('1', 'chapter-6');
    });

    expect(client.PATCH).toHaveBeenCalledWith('/api/projects/project1/kb/foreshadow/1', {
      body: {
        expectedResolveChapterId: 'chapter-6',
      },
    });
    expect(result.current.foreshadows[0].expectedResolveChapterId).toBe('chapter-6');
  });
});
