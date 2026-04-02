import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StorageStats } from './StorageStats';

describe('StorageStats', () => {
  it('should render snapshot count', () => {
    render(
      <StorageStats
        totalSizeBytes={1024 * 1024}
        snapshotCount={5}
      />
    );

    expect(screen.getByText('快照数量')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render total size in MB', () => {
    render(
      <StorageStats
        totalSizeBytes={2.5 * 1024 * 1024}
        snapshotCount={5}
      />
    );

    expect(screen.getByText('总大小')).toBeInTheDocument();
    expect(screen.getByText('2.50 MB')).toBeInTheDocument();
  });

  it('should render 0 MB when size is 0', () => {
    render(
      <StorageStats
        totalSizeBytes={0}
        snapshotCount={0}
      />
    );

    expect(screen.getByText('0 MB')).toBeInTheDocument();
  });

  it('should show < 0.01 MB for very small sizes', () => {
    render(
      <StorageStats
        totalSizeBytes={100}
        snapshotCount={1}
      />
    );

    expect(screen.getByText('< 0.01 MB')).toBeInTheDocument();
  });

  it('should call onCleanup when cleanup button is clicked', () => {
    const mockOnCleanup = vi.fn();

    render(
      <StorageStats
        totalSizeBytes={1024 * 1024}
        snapshotCount={5}
        onCleanup={mockOnCleanup}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '清理旧快照' }));

    expect(mockOnCleanup).toHaveBeenCalled();
  });

  it('should disable cleanup button when snapshot count is 0', () => {
    render(
      <StorageStats
        totalSizeBytes={0}
        snapshotCount={0}
        onCleanup={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '清理旧快照' })).toBeDisabled();
  });

  it('should show loading state when isCleaning is true', () => {
    render(
      <StorageStats
        totalSizeBytes={1024 * 1024}
        snapshotCount={5}
        onCleanup={vi.fn()}
        isCleaning={true}
      />
    );

    expect(screen.getByText('清理中...')).toBeInTheDocument();
  });

  it('should disable cleanup button when cleaning', () => {
    render(
      <StorageStats
        totalSizeBytes={1024 * 1024}
        snapshotCount={5}
        onCleanup={vi.fn()}
        isCleaning={true}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not render cleanup button when onCleanup is not provided', () => {
    render(
      <StorageStats
        totalSizeBytes={1024 * 1024}
        snapshotCount={5}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
