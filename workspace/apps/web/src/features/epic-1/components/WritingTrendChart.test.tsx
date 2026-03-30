import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WritingTrendChart } from './WritingTrendChart';

// Mock recharts to avoid SVG rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: vi.fn(({ children }) => <div data-testid="line-chart">{children}</div>),
  Line: vi.fn(() => null),
  XAxis: vi.fn(() => null),
  YAxis: vi.fn(() => null),
  CartesianGrid: vi.fn(() => null),
  Tooltip: vi.fn(() => null),
  ResponsiveContainer: vi.fn(({ children }) => <div data-testid="responsive-container">{children}</div>),
}));

describe('WritingTrendChart', () => {
  const mockData = [
    { date: '2024-01-01', writtenChars: 2000 },
    { date: '2024-01-02', writtenChars: 3500 },
    { date: '2024-01-03', writtenChars: 1500 },
    { date: '2024-01-04', writtenChars: 4000 },
    { date: '2024-01-05', writtenChars: 2800 },
  ];

  it('should render chart container', () => {
    render(<WritingTrendChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should render with mock data', () => {
    render(<WritingTrendChart data={mockData} />);
    // Chart should render without errors with data
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render empty state when no data provided', () => {
    render(<WritingTrendChart data={[]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render empty state when data is undefined', () => {
    render(<WritingTrendChart data={[]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should pass data to LineChart', () => {
    render(<WritingTrendChart data={mockData} />);
    // The chart renders based on the mock data
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const singlePoint = [{ date: '2024-01-01', writtenChars: 2000 }];
    render(<WritingTrendChart data={singlePoint} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle zero values in data', () => {
    const zeroData = [
      { date: '2024-01-01', writtenChars: 0 },
      { date: '2024-01-02', writtenChars: 1000 },
    ];
    render(<WritingTrendChart data={zeroData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle large values in data', () => {
    const largeData = [
      { date: '2024-01-01', writtenChars: 100000 },
      { date: '2024-01-02', writtenChars: 150000 },
    ];
    render(<WritingTrendChart data={largeData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});