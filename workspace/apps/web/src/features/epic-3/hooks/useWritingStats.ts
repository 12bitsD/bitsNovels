import { useState, useEffect, useCallback } from 'react';
import { client } from '../../../api/client';
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
  const [data, setData] = useState<WritingStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    if (!projectId) {
      setData(null);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [summaryRes, dailyRes, weeklyRes, heatmapRes] = await Promise.all([
        client.GET(`/api/projects/${projectId}/writing-stats/summary`),
        client.GET(`/api/projects/${projectId}/writing-stats/daily?range=30d`),
        client.GET(`/api/projects/${projectId}/writing-stats/weekly?range=12w`),
        client.GET(`/api/projects/${projectId}/writing-stats/heatmap`),
      ]);

      if (summaryRes.error) {
        const msg = (summaryRes.error as { detail?: string }).detail || '获取统计失败';
        setError(msg);
        setData(null);
        return;
      }

      const summary = summaryRes.data as WritingStatsSummary;
      const daily = (dailyRes.data as DailyData[]) || [];
      const weekly = (weeklyRes.data as WeeklyData[]) || [];
      const heatmap = (heatmapRes.data as HeatmapData[]) || [];

      const chaptersRes = await client.GET(`/api/projects/${projectId}/chapters`);
      let chapters: ChapterStat[] = [];

      if (!chaptersRes.error && Array.isArray(chaptersRes.data)) {
        const chapterList = chaptersRes.data as Array<{
          id: string;
          title: string;
          volumeName?: string;
          charCount: number;
        }>;

        const totalChars = chapterList.reduce((sum, ch) => sum + (ch.charCount || 0), 0);

        chapters = chapterList.map((ch) => ({
          id: ch.id,
          title: ch.title,
          volumeName: ch.volumeName || '未分类',
          chars: ch.charCount || 0,
          percentage: totalChars > 0 ? Math.round(((ch.charCount || 0) / totalChars) * 1000) / 10 : 0,
        }));
      }

      setData({
        summary,
        daily,
        weekly,
        heatmap,
        chapters,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '获取统计失败';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    loading,
    error,
    refetch: fetchStats,
  };
}
