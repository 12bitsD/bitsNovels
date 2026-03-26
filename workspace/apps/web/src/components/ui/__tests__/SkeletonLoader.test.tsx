import { render, screen } from '@testing-library/react';
import { SkeletonLoader } from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders text variant with correct classes', () => {
    render(<SkeletonLoader variant="text" />);
    const el = screen.getByRole('presentation', { hidden: true });
    expect(el).toHaveClass('animate-pulse', 'h-4', 'w-full');
  });

  it('renders card variant', () => {
    render(<SkeletonLoader variant="card" />);
    const el = screen.getByRole('presentation', { hidden: true });
    expect(el).toHaveClass('h-32', 'w-full');
  });

  it('renders avatar variant', () => {
    render(<SkeletonLoader variant="avatar" />);
    const el = screen.getByRole('presentation', { hidden: true });
    expect(el).toHaveClass('h-12', 'w-12', 'rounded-full');
  });

  it('renders button variant', () => {
    render(<SkeletonLoader variant="button" />);
    const el = screen.getByRole('presentation', { hidden: true });
    expect(el).toHaveClass('h-10', 'w-24');
  });

  it('renders with aria-hidden', () => {
    render(<SkeletonLoader variant="text" />);
    expect(screen.getByRole('presentation', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom width/height via style', () => {
    render(<SkeletonLoader variant="text" width="200px" height="24px" />);
    const el = screen.getByRole('presentation', { hidden: true });
    expect(el).toHaveStyle({ width: '200px', height: '24px' });
  });

  it('applies className', () => {
    render(<SkeletonLoader variant="text" className="mb-4" />);
    expect(screen.getByRole('presentation', { hidden: true })).toHaveClass('mb-4');
  });
});
