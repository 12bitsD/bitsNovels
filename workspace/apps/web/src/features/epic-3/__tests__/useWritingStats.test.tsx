import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useWritingStats } from '../hooks/useWritingStats';

vi.mock('../../../api/client', () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from '../../../api/client';

const mockSummary = {
  todayChars: 1250,
  weekChars: 8750,
  monthChars: 42300,
  totalChars: 156789,
  dailyAvg: 2180,
  streakDays: 12,
  maxDaily: 5600,
};

const mockDaily = [
  { date: '2026-03-01', chars: 1200 },
  { date: '2026-03-02', chars: 2100 },
];

const mockWeekly = [
  { week: '2026-W08', chars: 14200 },
  { week: '2026-W09', chars: 16800 },
];

const mockHeatmap = [
  { hour: 8, chars: 2500 },
  { hour: 20, chars: 4200 },
];

const mockChapters = [
  { id: '1', title: '第一章', volumeName: '第一卷', charCount: 5200 },
  { id: '2', title: '第二章', volumeName: '第一卷', charCount: 4800 },
];

describe('useWritingStats', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches stats successfully', async () => {
    vi.mocked(fetchApi)
      .mockResolvedValueOnce(mockSummary)
      .mockResolvedValueOnce(mockDaily)
      .mockResolvedValueOnce(mockWeekly)
      .mockResolvedValueOnce(mockHeatmap)
      .mockResolvedValueOnce(mockChapters);

    const { result } = renderHook(() => useWritingStats('proj-1'), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.summary).toEqual(mockSummary);
    expect(result.current.data?.daily).toEqual(mockDaily);
    expect(result.current.data?.weekly).toEqual(mockWeekly);
    expect(result.current.data?.heatmap).toEqual(mockHeatmap);
    expect(result.current.error).toBe('');
  });

  it('handles API error', async () => {
    vi.mocked(fetchApi).mockRejectedValue(new Error('获取统计失败'));

    const { result } = renderHook(() => useWritingStats('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBe('获取统计失败');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('handles network error', async () => {
    vi.mocked(fetchApi).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWritingStats('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(result.current.loading).toBe(false);
  });

  it('calculates chapter percentages correctly', async () => {
    vi.mocked(fetchApi)
      .mockResolvedValueOnce(mockSummary)
      .mockResolvedValueOnce(mockDaily)
      .mockResolvedValueOnce(mockWeekly)
      .mockResolvedValueOnce(mockHeatmap)
      .mockResolvedValueOnce(mockChapters);

    const { result } = renderHook(() => useWritingStats('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    const chapters = result.current.data!.chapters;
    expect(chapters[0].percentage).toBe(52);
    expect(chapters[1].percentage).toBe(48);
  });

  it('handles empty projectId', async () => {
    const { result } = renderHook(() => useWritingStats(''), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('');
  });

  it('refetches stats', async () => {
    vi.mocked(fetchApi)
      .mockResolvedValueOnce(mockSummary)
      .mockResolvedValueOnce(mockDaily)
      .mockResolvedValueOnce(mockWeekly)
      .mockResolvedValueOnce(mockHeatmap)
      .mockResolvedValueOnce(mockChapters)
      .mockResolvedValueOnce(mockSummary)
      .mockResolvedValueOnce(mockDaily)
      .mockResolvedValueOnce(mockWeekly)
      .mockResolvedValueOnce(mockHeatmap)
      .mockResolvedValueOnce(mockChapters);

    const { result } = renderHook(() => useWritingStats('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetchApi).toHaveBeenCalledTimes(10);
  });

  it('handles chapters API error gracefully', async () => {
    vi.mocked(fetchApi)
      .mockResolvedValueOnce(mockSummary)
      .mockResolvedValueOnce(mockDaily)
      .mockResolvedValueOnce(mockWeekly)
      .mockResolvedValueOnce(mockHeatmap)
      .mockRejectedValueOnce(new Error('Error'));

    const { result } = renderHook(() => useWritingStats('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(result.current.data!.chapters).toEqual([]);
  });
});
