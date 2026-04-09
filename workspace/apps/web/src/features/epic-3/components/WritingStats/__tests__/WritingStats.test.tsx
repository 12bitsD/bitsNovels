/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WritingStatsPanel } from '../WritingStatsPanel';
import * as useWritingStatsModule from '../../../hooks/useWritingStats';

vi.mock('../../../hooks/useWritingStats', () => ({
  useWritingStats: vi.fn(),
}));

// Mock Recharts to avoid ResizeObserver errors in JSDOM
vi.mock('recharts', async () => {
  const OriginalModule = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 600 }}>{children}</div>
    ),
  };
});

describe('WritingStatsPanel', () => {
  it('should render loading state', () => {
    vi.spyOn(useWritingStatsModule, 'useWritingStats').mockReturnValue({
      data: null,
      loading: true,
      error: '',
      refetch: vi.fn(),
    });
    render(<WritingStatsPanel projectId="p1" isOpen={true} onClose={vi.fn()} />);
  });

  it('should render content', () => {
    vi.spyOn(useWritingStatsModule, 'useWritingStats').mockReturnValue({
      data: {
        summary: { todayChars: 100, weekChars: 500, monthChars: 2000, totalChars: 10000, dailyAvg: 50, streakDays: 3, maxDaily: 1000 },
        daily: [{ date: '2023-01-01', chars: 100 }],
        weekly: [{ week: '2023-W1', chars: 1000 }],
        heatmap: [{ hour: 1, chars: 5 }],
        chapters: [{ id: 'c1', title: 'C1', volumeName: 'V1', chars: 100, percentage: 1 }],
      } as any,
      loading: false,
      error: '',
      refetch: vi.fn(),
    });
    render(<WritingStatsPanel projectId="p1" isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('写作统计')).toBeInTheDocument();
  });
});
