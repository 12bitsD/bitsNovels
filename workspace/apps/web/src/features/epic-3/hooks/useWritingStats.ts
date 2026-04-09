import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api/client';
import type { ChapterStat } from '@bitsnovels/api-types';

export interface WritingStatsSummary {
  todayChars: number;
  weekChars: number;
  monthChars: number;
  totalChars: number;
  dailyAvg: number;
  streakDays: number;
  maxDaily: number;
}

export interface DailyData {
  date: string;
  chars: number;
}

export interface WeeklyData {
  week: string;
  chars: number;
}

export interface HeatmapData {
  hour: number;
  chars: number;
}

export interface WritingStatsData {
  summary: WritingStatsSummary;
  daily: DailyData[];
  weekly: WeeklyData[];
  heatmap: HeatmapData[];
  chapters: ChapterStat[];
}

export interface UseWritingStatsResult {
  data: WritingStatsData | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export function useWritingStats(projectId: string): UseWritingStatsResult {
  const enabled = Boolean(projectId);

  const query = useQuery({
    queryKey: ['writingStats', projectId],
    enabled,
    queryFn: async (): Promise<WritingStatsData> => {
      const [summary, daily, weekly, heatmap] = await Promise.all([
        fetchApi<WritingStatsSummary>('GET', `/api/projects/${projectId}/writing-stats/summary`),
        fetchApi<DailyData[]>('GET', `/api/projects/${projectId}/writing-stats/daily?range=30d`),
        fetchApi<WeeklyData[]>('GET', `/api/projects/${projectId}/writing-stats/weekly?range=12w`),
        fetchApi<HeatmapData[]>('GET', `/api/projects/${projectId}/writing-stats/heatmap`),
      ]);

      type ChapterListItem = {
        id: string;
        title: string;
        volumeName?: string;
        charCount: number;
      };

      let chapters: ChapterStat[] = [];
      try {
        const chapterList = await fetchApi<ChapterListItem[]>('GET', `/api/projects/${projectId}/chapters`);
        const totalChars = chapterList.reduce((sum, ch) => sum + (ch.charCount || 0), 0);
        chapters = chapterList.map((ch) => ({
          id: ch.id,
          title: ch.title,
          volumeName: ch.volumeName || '未分类',
          chars: ch.charCount || 0,
          percentage: totalChars > 0 ? Math.round(((ch.charCount || 0) / totalChars) * 1000) / 10 : 0,
        }));
      } catch {
        chapters = [];
      }

      return {
        summary,
        daily: daily || [],
        weekly: weekly || [],
        heatmap: heatmap || [],
        chapters,
      };
    },
    refetchOnMount: true,
  });

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    data: enabled ? (query.data ?? null) : null,
    loading: enabled ? query.isLoading || query.isFetching : false,
    error: enabled ? (query.error instanceof Error ? query.error.message : '') : '',
    refetch,
  };
}
