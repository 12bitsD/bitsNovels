import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GoalProgressRing } from './GoalProgressRing';

// Mock recharts to avoid SVG rendering issues in tests
vi.mock('recharts', () => ({
  PieChart: vi.fn(() => <div data-testid="pie-chart" />),
  Pie: vi.fn(() => null),
  Cell: vi.fn(() => null),
  ResponsiveContainer: vi.fn(({ children }) => <div data-testid="responsive-container">{children}</div>),
}));

describe('GoalProgressRing', () => {
  it('should render with 50% progress', () => {
    render(<GoalProgressRing current={5000} target={10000} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should render with 0% progress', () => {
    render(<GoalProgressRing current={0} target={10000} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should render with 100% progress', () => {
    render(<GoalProgressRing current={10000} target={10000} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should cap progress at 100% when exceeding target', () => {
    render(<GoalProgressRing current={15000} target={10000} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should display current and target values', () => {
    render(<GoalProgressRing current={5000} target={10000} />);
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('/ 10,000')).toBeInTheDocument();
  });

  it('should display correct characters unit', () => {
    render(<GoalProgressRing current={5000} target={10000} />);
    expect(screen.getByText('字')).toBeInTheDocument();
  });

  it('should render with default size', () => {
    render(<GoalProgressRing current={5000} target={10000} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with custom size', () => {
    render(<GoalProgressRing current={5000} target={10000} size={200} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle zero target gracefully', () => {
    render(<GoalProgressRing current={0} target={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should display completion label', () => {
    render(<GoalProgressRing current={5000} target={10000} />);
    expect(screen.getByText('完成度')).toBeInTheDocument();
  });

  it('should render pie chart component', () => {
    render(<GoalProgressRing current={5000} target={10000} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should format large numbers with locale string', () => {
    render(<GoalProgressRing current={1000000} target={5000000} />);
    expect(screen.getByText('1,000,000')).toBeInTheDocument();
    expect(screen.getByText('/ 5,000,000')).toBeInTheDocument();
  });

  it('should show progress slightly above 0% when very small progress', () => {
    render(<GoalProgressRing current={1} target={10000} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should round to nearest integer percentage', () => {
    render(<GoalProgressRing current={3333} target={10000} />);
    expect(screen.getByText('33%')).toBeInTheDocument();
  });
});