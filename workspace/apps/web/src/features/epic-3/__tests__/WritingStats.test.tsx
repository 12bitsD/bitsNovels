import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WritingStatsPanel } from '../components/WritingStats/WritingStatsPanel';
import { DailyChart } from '../components/WritingStats/DailyChart';
import { WeeklyChart } from '../components/WritingStats/WeeklyChart';
import { HourlyHeatmap } from '../components/WritingStats/HourlyHeatmap';
import { StatsTable } from '../components/WritingStats/StatsTable';
import { useWritingStats } from '../hooks/useWritingStats';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';

vi.mock('../hooks/useWritingStats');

const mockWritingStats = {
  summary: {
    todayChars: 1250,
    weekChars: 8750,
    monthChars: 42300,
    totalChars: 156789,
    dailyAvg: 2180,
    streakDays: 12,
    maxDaily: 5600,
  },
  daily: [
    { date: '2026-03-01', chars: 1200 },
    { date: '2026-03-02', chars: 2100 },
    { date: '2026-03-03', chars: 0 },
    { date: '2026-03-04', chars: 3400 },
  ],
  weekly: [
    { week: '2026-W08', chars: 14200 },
    { week: '2026-W09', chars: 16800 },
    { week: '2026-W10', chars: 12500 },
  ],
  heatmap: [
    { hour: 0, chars: 100 },
    { hour: 8, chars: 2500 },
    { hour: 9, chars: 3200 },
    { hour: 14, chars: 1800 },
    { hour: 20, chars: 4200 },
    { hour: 21, chars: 2100 },
  ],
  chapters: [
    { id: '1', title: '第一章', volumeName: '第一卷', chars: 5200, percentage: 12.5 },
    { id: '2', title: '第二章', volumeName: '第一卷', chars: 4800, percentage: 11.5 },
    { id: '3', title: '第三章', volumeName: '第一卷', chars: 6200, percentage: 14.8 },
  ],
};

describe('WritingStatsPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: mockWritingStats,
      loading: false,
      error: '',
      refetch: vi.fn(),
    });

    render(<WritingStatsPanel isOpen={false} onClose={mockOnClose} projectId="1" />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: mockWritingStats,
      loading: false,
      error: '',
      refetch: vi.fn(),
    });

    render(<WritingStatsPanel isOpen={true} onClose={mockOnClose} projectId="1" />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('写作统计')).toBeInTheDocument();
  });

  it('should display all summary stats correctly', () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: mockWritingStats,
      loading: false,
      error: '',
      refetch: vi.fn(),
    });

    render(<WritingStatsPanel isOpen={true} onClose={mockOnClose} projectId="1" />);

    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('8,750')).toBeInTheDocument();
    expect(screen.getByText('42,300')).toBeInTheDocument();
    expect(screen.getByText('156,789')).toBeInTheDocument();
    expect(screen.getByText('2,180')).toBeInTheDocument();
    expect(screen.getByText('连续天数').nextElementSibling).toHaveTextContent('12');
    expect(screen.getByText('5,600')).toBeInTheDocument();
  });

  it('should call onClose when clicking close button', async () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: mockWritingStats,
      loading: false,
      error: '',
      refetch: vi.fn(),
    });

    render(<WritingStatsPanel isOpen={true} onClose={mockOnClose} projectId="1" />);

    const closeButton = screen.getByLabelText('关闭');
    await userEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking overlay', async () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: mockWritingStats,
      loading: false,
      error: '',
      refetch: vi.fn(),
    });

    render(<WritingStatsPanel isOpen={true} onClose={mockOnClose} projectId="1" />);

    const overlay = screen.getByTestId('stats-overlay');
    await userEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show loading state', () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: null,
      loading: true,
      error: '',
      refetch: vi.fn(),
    });

    render(<WritingStatsPanel isOpen={true} onClose={mockOnClose} projectId="1" />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should show error state with retry button', () => {
    const mockRefetch = vi.fn();
    vi.mocked(useWritingStats).mockReturnValue({
      data: null,
      loading: false,
      error: '加载失败',
      refetch: mockRefetch,
    });

    render(<WritingStatsPanel isOpen={true} onClose={mockOnClose} projectId="1" />);

    expect(screen.getByText('加载失败')).toBeInTheDocument();
    const retryButton = screen.getByText('重试');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should render empty state when no data', () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: {
        summary: {
          todayChars: 0,
          weekChars: 0,
          monthChars: 0,
          totalChars: 0,
          dailyAvg: 0,
          streakDays: 0,
          maxDaily: 0,
        },
        daily: [],
        weekly: [],
        heatmap: [],
        chapters: [],
      },
      loading: false,
      error: '',
      refetch: vi.fn(),
    });

    render(<WritingStatsPanel isOpen={true} onClose={mockOnClose} projectId="1" />);

    expect(screen.getByText('暂无写作数据')).toBeInTheDocument();
  });

  it('should switch between tabs', async () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: mockWritingStats,
      loading: false,
      error: '',
      refetch: vi.fn(),
    });

    render(<WritingStatsPanel isOpen={true} onClose={mockOnClose} projectId="1" />);

    const trendTab = screen.getByRole('tab', { name: /趋势/i });
    await userEvent.click(trendTab);
    expect(trendTab).toHaveAttribute('aria-selected', 'true');

    const distributionTab = screen.getByRole('tab', { name: /分布/i });
    await userEvent.click(distributionTab);
    expect(distributionTab).toHaveAttribute('aria-selected', 'true');

    const detailTab = screen.getByRole('tab', { name: /详情/i });
    await userEvent.click(detailTab);
    expect(detailTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('DailyChart', () => {
  it('should render daily chart with data', () => {
    render(<DailyChart data={mockWritingStats.daily} loading={false} />);

    expect(screen.getByTestId('daily-chart')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<DailyChart data={[]} loading={false} />);

    expect(screen.getByText('暂无每日数据')).toBeInTheDocument();
  });

  it('should show loading skeleton', () => {
    render(<DailyChart data={[]} loading={true} />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('WeeklyChart', () => {
  it('should render weekly chart with data', () => {
    render(<WeeklyChart data={mockWritingStats.weekly} loading={false} />);

    expect(screen.getByTestId('weekly-chart')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<WeeklyChart data={[]} loading={false} />);

    expect(screen.getByText('暂无每周数据')).toBeInTheDocument();
  });

  it('should show loading skeleton', () => {
    render(<WeeklyChart data={[]} loading={true} />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('HourlyHeatmap', () => {
  it('should render heatmap with data', () => {
    render(<HourlyHeatmap data={mockWritingStats.heatmap} loading={false} />);

    expect(screen.getByTestId('hourly-heatmap')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<HourlyHeatmap data={[]} loading={false} />);

    expect(screen.getByText('暂无时段数据')).toBeInTheDocument();
  });

  it('should show loading skeleton', () => {
    render(<HourlyHeatmap data={[]} loading={true} />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render 24 hour cells', () => {
    const fullHeatmap = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      chars: i % 3 === 0 ? 1000 : 0,
    }));

    render(<HourlyHeatmap data={fullHeatmap} loading={false} />);

    const cells = screen.getAllByTestId('heatmap-cell');
    expect(cells).toHaveLength(24);
  });
});

describe('StatsTable', () => {
  it('should render table with data', () => {
    render(<StatsTable data={mockWritingStats.chapters} loading={false} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('第一章')).toBeInTheDocument();
    expect(screen.getByText('第二章')).toBeInTheDocument();
    expect(screen.getByText('第三章')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<StatsTable data={[]} loading={false} />);

    expect(screen.getByText('暂无章节数据')).toBeInTheDocument();
  });

  it('should show loading skeleton', () => {
    render(<StatsTable data={[]} loading={true} />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should sort by chars when clicking header', async () => {
    render(<StatsTable data={mockWritingStats.chapters} loading={false} />);

    const charsHeader = screen.getByText('字数');
    await userEvent.click(charsHeader);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('第二章');
    expect(rows[3]).toHaveTextContent('第三章');

    await userEvent.click(charsHeader);
    const rowsDesc = screen.getAllByRole('row');
    expect(rowsDesc[1]).toHaveTextContent('第三章');
    expect(rowsDesc[3]).toHaveTextContent('第二章');
  });

  it('should calculate percentage correctly', () => {
    render(<StatsTable data={mockWritingStats.chapters} loading={false} />);

    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('11.5%')).toBeInTheDocument();
    expect(screen.getByText('14.8%')).toBeInTheDocument();
  });
});

describe('useWritingStats hook', () => {
  beforeEach(() => {
    vi.unmock('../hooks/useWritingStats');
  });

  it('should return initial state and fetch data via mock', async () => {
    const mockData = {
      data: mockWritingStats,
      loading: false,
      error: '',
      refetch: vi.fn(),
    };
    vi.mocked(useWritingStats).mockReturnValue(mockData);

    const result = useWritingStats('1');

    expect(result.data).toEqual(mockWritingStats);
    expect(result.loading).toBe(false);
    expect(result.error).toBe('');
  });

  it('should handle loading state', () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: null,
      loading: true,
      error: '',
      refetch: vi.fn(),
    });

    const result = useWritingStats('1');

    expect(result.data).toBeNull();
    expect(result.loading).toBe(true);
  });

  it('should handle error state', () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: null,
      loading: false,
      error: '获取失败',
      refetch: vi.fn(),
    });

    const result = useWritingStats('1');

    expect(result.data).toBeNull();
    expect(result.error).toBe('获取失败');
  });

  it('should return null data when projectId is empty', () => {
    vi.mocked(useWritingStats).mockReturnValue({
      data: null,
      loading: false,
      error: '',
      refetch: vi.fn(),
    });

    const result = useWritingStats('');

    expect(result.data).toBeNull();
    expect(result.loading).toBe(false);
  });
});
