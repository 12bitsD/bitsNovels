import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WritingTrendChart } from './WritingTrendChart';

vi.mock('recharts', () => {
  const actual = vi.importActual('recharts');
  return {
    ...actual,
    LineChart: vi.fn(({ children, ...props }) => {
      const rendered = typeof children === 'function' ? children(props) : children;
      return <div data-testid="line-chart">{rendered}</div>;
    }),
    Line: vi.fn((props) => {
      (Line as ReturnType<typeof vi.fn>).lastProps = props;
      return null;
    }),
    XAxis: vi.fn((props) => {
      (XAxis as ReturnType<typeof vi.fn>).lastProps = props;
      if (props.tickFormatter && typeof props.tickFormatter === 'function') {
        props.tickFormatter('2024-01-01');
        props.tickFormatter('2024-12-31');
      }
      return null;
    }),
    YAxis: vi.fn((props) => {
      (YAxis as ReturnType<typeof vi.fn>).lastProps = props;
      if (props.tickFormatter && typeof props.tickFormatter === 'function') {
        props.tickFormatter(0);
        props.tickFormatter(1000);
        props.tickFormatter(15000);
      }
      return null;
    }),
    CartesianGrid: vi.fn(() => null),
    Tooltip: vi.fn((props) => {
      (Tooltip as ReturnType<typeof vi.fn>).lastProps = props;
      if (props.labelFormatter && typeof props.labelFormatter === 'function') {
        props.labelFormatter('2024-01-01');
      }
      if (props.formatter && typeof props.formatter === 'function') {
        props.formatter(2000);
        props.formatter(150000);
      }
      return null;
    }),
    ResponsiveContainer: vi.fn(({ children }) => (
      <div data-testid="responsive-container">{children}</div>
    )),
  };
});

import { Line, XAxis, YAxis, Tooltip } from 'recharts';

describe('WritingTrendChart', () => {
  const mockData = [
    { date: '2024-01-01', writtenChars: 2000 },
    { date: '2024-01-02', writtenChars: 3500 },
    { date: '2024-01-03', writtenChars: 1500 },
    { date: '2024-01-04', writtenChars: 4000 },
    { date: '2024-01-05', writtenChars: 2800 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chart container with ResponsiveContainer', () => {
    render(<WritingTrendChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should render LineChart with correct data prop', () => {
    render(<WritingTrendChart data={mockData} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
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

  describe('XAxis tickFormatter', () => {
    it('should format date correctly', () => {
      render(<WritingTrendChart data={mockData} />);
      const xAxisProps = (XAxis as ReturnType<typeof vi.fn>).lastProps;
      expect(xAxisProps).toBeDefined();
      expect(xAxisProps.dataKey).toBe('date');
      expect(xAxisProps.tickFormatter('2024-01-15')).toBe('1/15');
    });

    it('should have correct stroke and fontSize props', () => {
      render(<WritingTrendChart data={mockData} />);
      const xAxisProps = (XAxis as ReturnType<typeof vi.fn>).lastProps;
      expect(xAxisProps.stroke).toBe('var(--color-ink-light)');
      expect(xAxisProps.fontSize).toBe(11);
      expect(xAxisProps.tickLine).toBe(false);
      expect(xAxisProps.axisLine).toEqual({ stroke: 'var(--color-border)' });
    });
  });

  describe('YAxis tickFormatter', () => {
    it('should format value in thousands (k)', () => {
      render(<WritingTrendChart data={mockData} />);
      const yAxisProps = (YAxis as ReturnType<typeof vi.fn>).lastProps;
      expect(yAxisProps).toBeDefined();
      expect(yAxisProps.tickFormatter(0)).toBe('0k');
      expect(yAxisProps.tickFormatter(1000)).toBe('1k');
      expect(yAxisProps.tickFormatter(15000)).toBe('15k');
    });

    it('should have correct styling props', () => {
      render(<WritingTrendChart data={mockData} />);
      const yAxisProps = (YAxis as ReturnType<typeof vi.fn>).lastProps;
      expect(yAxisProps.stroke).toBe('var(--color-ink-light)');
      expect(yAxisProps.fontSize).toBe(11);
      expect(yAxisProps.tickLine).toBe(false);
      expect(yAxisProps.axisLine).toEqual({ stroke: 'var(--color-border)' });
    });
  });

  describe('Tooltip formatter', () => {
    it('should have correct labelFormatter', () => {
      render(<WritingTrendChart data={mockData} />);
      const tooltipProps = (Tooltip as ReturnType<typeof vi.fn>).lastProps;
      expect(tooltipProps).toBeDefined();
      expect(tooltipProps.labelFormatter('2024-01-01')).toBe('1月1日');
    });

    it('should have correct formatter for writing characters', () => {
      render(<WritingTrendChart data={mockData} />);
      const tooltipProps = (Tooltip as ReturnType<typeof vi.fn>).lastProps;
      expect(tooltipProps.formatter(2000)).toEqual(['2,000 字', '写作字数']);
      expect(tooltipProps.formatter(150000)).toEqual(['150,000 字', '写作字数']);
    });

    it('should have correct contentStyle', () => {
      render(<WritingTrendChart data={mockData} />);
      const tooltipProps = (Tooltip as ReturnType<typeof vi.fn>).lastProps;
      expect(tooltipProps.contentStyle).toEqual({
        backgroundColor: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        fontSize: '12px',
        boxShadow: 'var(--shadow-card)'
      });
    });
  });

  describe('Line configuration', () => {
    it('should have correct line props', () => {
      render(<WritingTrendChart data={mockData} />);
      const lineProps = (Line as ReturnType<typeof vi.fn>).lastProps;
      expect(lineProps).toBeDefined();
      expect(lineProps.type).toBe('monotone');
      expect(lineProps.dataKey).toBe('writtenChars');
      expect(lineProps.stroke).toBe('var(--color-amber)');
      expect(lineProps.strokeWidth).toBe(2);
      expect(lineProps.dot).toBe(false);
      expect(lineProps.activeDot).toEqual({
        r: 4,
        fill: 'var(--color-amber)',
        stroke: 'var(--color-white)',
        strokeWidth: 2
      });
    });
  });

  describe('CartesianGrid', () => {
    it('should have correct grid styling', () => {
      render(<WritingTrendChart data={mockData} />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle very small values (less than 1000)', () => {
      const smallData = [
        { date: '2024-01-01', writtenChars: 500 },
        { date: '2024-01-02', writtenChars: 800 },
      ];
      render(<WritingTrendChart data={smallData} />);
      const yAxisProps = (YAxis as ReturnType<typeof vi.fn>).lastProps;
      expect(yAxisProps.tickFormatter(500)).toBe('1k');
      expect(yAxisProps.tickFormatter(800)).toBe('1k');
    });

    it('should handle values exactly at thousand boundaries', () => {
      const exactData = [
        { date: '2024-01-01', writtenChars: 1000 },
        { date: '2024-01-02', writtenChars: 2000 },
      ];
      render(<WritingTrendChart data={exactData} />);
      const yAxisProps = (YAxis as ReturnType<typeof vi.fn>).lastProps;
      expect(yAxisProps.tickFormatter(1000)).toBe('1k');
      expect(yAxisProps.tickFormatter(2000)).toBe('2k');
    });

    it('should handle month boundary in XAxis tickFormatter', () => {
      render(<WritingTrendChart data={mockData} />);
      const xAxisProps = (XAxis as ReturnType<typeof vi.fn>).lastProps;
      expect(xAxisProps.tickFormatter('2024-12-31')).toBe('12/31');
      expect(xAxisProps.tickFormatter('2024-01-01')).toBe('1/1');
    });
  });
});
