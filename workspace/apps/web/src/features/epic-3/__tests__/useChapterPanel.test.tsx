import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChapterPanel } from '../hooks/useChapterPanel';

vi.mock('../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
}));

import { client } from '../../../api/client';

const mockVolumes = [
  {
    id: 'vol-1',
    projectId: 'proj-1',
    name: '第一卷',
    order: 1,
    chapterCount: 2,
    totalChars: 15000,
    chapters: [
      {
        id: 'ch-1',
        projectId: 'proj-1',
        volumeId: 'vol-1',
        title: '第一章',
        charCount: 8000,
        parserStatus: 'parsed',
        order: 1,
        hasNote: false,
        createdAt: '2026-03-30T10:00:00Z',
        updatedAt: '2026-03-30T10:00:00Z',
      },
    ],
  },
];

describe('useChapterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches outline on mount', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.volumes).toEqual(mockVolumes);
    expect(client.GET).toHaveBeenCalledWith('/api/projects/proj-1/outline');
  });

  it('handles fetch error', async () => {
    vi.mocked(client.GET).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.error).toBe('加载失败，请重试');
    });

    expect(result.current.loading).toBe(false);
  });

  it('creates chapter successfully', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: 'ch-new', title: '新章节' },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdChapter;
    await act(async () => {
      createdChapter = await result.current.createChapter({ volumeId: 'vol-1', title: '新章节' });
    });

    expect(createdChapter).toEqual({ id: 'ch-new', title: '新章节' });
    expect(client.POST).toHaveBeenCalledWith('/api/projects/proj-1/chapters', {
      body: { volumeId: 'vol-1', title: '新章节' },
    });
  });

  it('handles create chapter error', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: { detail: 'Error' },
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdChapter;
    await act(async () => {
      createdChapter = await result.current.createChapter({ volumeId: 'vol-1' });
    });

    expect(createdChapter).toBeNull();
  });

  it('renames chapter successfully', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.PATCH).mockResolvedValue({
      data: {},
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.renameChapter('ch-1', '新标题');
    });

    expect(success).toBe(true);
    expect(client.PATCH).toHaveBeenCalledWith('/api/projects/proj-1/chapters/ch-1', {
      body: { title: '新标题' },
    });
  });

  it('handles rename chapter error', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.PATCH).mockResolvedValue({
      data: undefined,
      error: { detail: 'Error' },
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.renameChapter('ch-1', '新标题');
    });

    expect(success).toBe(false);
  });

  it('deletes chapter successfully', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.DELETE).mockResolvedValue({
      data: {},
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteChapter('ch-1');
    });

    expect(success).toBe(true);
    expect(client.DELETE).toHaveBeenCalledWith('/api/projects/proj-1/chapters/ch-1');
  });

  it('handles delete chapter error', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.DELETE).mockResolvedValue({
      data: undefined,
      error: { detail: 'Error' },
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteChapter('ch-1');
    });

    expect(success).toBe(false);
  });

  it('reorders chapter successfully', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });
    vi.mocked(client.POST).mockResolvedValue({
      data: {},
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.reorderChapter({
        chapterId: 'ch-1',
        targetVolumeId: 'vol-2',
        targetOrder: 1,
      });
    });

    expect(success).toBe(true);
    expect(client.POST).toHaveBeenCalledWith('/api/projects/proj-1/chapters/reorder', {
      body: { chapterId: 'ch-1', targetVolumeId: 'vol-2', targetOrder: 1 },
    });
  });

  it('refetches outline', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { volumes: mockVolumes },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useChapterPanel({ projectId: 'proj-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.mocked(client.GET).mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(client.GET).toHaveBeenCalledWith('/api/projects/proj-1/outline');
  });
});
