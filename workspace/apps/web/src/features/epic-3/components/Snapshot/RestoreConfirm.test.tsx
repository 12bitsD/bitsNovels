import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RestoreConfirm } from './RestoreConfirm';
import type { Snapshot } from '../../hooks/useSnapshots';

describe('RestoreConfirm', () => {
  const mockSnapshot: Snapshot = {
    id: 'snapshot-1',
    chapterId: 'chapter-1',
    content: 'content',
    charCount: 1000,
    type: 'manual',
    label: 'Important snapshot',
    createdAt: '2026-03-30T10:00:00Z',
  };

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  it('should not render when isOpen is false', () => {
    render(
      <RestoreConfirm
        snapshot={mockSnapshot}
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText('恢复到此版本')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <RestoreConfirm
        snapshot={mockSnapshot}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('恢复到此版本')).toBeInTheDocument();
    expect(screen.getByText('标签：Important snapshot')).toBeInTheDocument();
    expect(screen.getByText(/时间：/)).toBeInTheDocument();
    expect(screen.getByText('字数：1,000 字')).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <RestoreConfirm
        snapshot={mockSnapshot}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    mockOnConfirm.mockResolvedValueOnce(undefined);

    render(
      <RestoreConfirm
        snapshot={mockSnapshot}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  it('should close modal after successful restore', async () => {
    mockOnConfirm.mockResolvedValueOnce(undefined);

    render(
      <RestoreConfirm
        snapshot={mockSnapshot}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show error when restore fails', async () => {
    mockOnConfirm.mockRejectedValueOnce(new Error('Restore failed'));

    render(
      <RestoreConfirm
        snapshot={mockSnapshot}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }));

    await waitFor(() => {
      expect(screen.getByText('Restore failed')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should show loading state while restoring', async () => {
    let resolvePromise: (value?: unknown) => void;
    mockOnConfirm.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(
      <RestoreConfirm
        snapshot={mockSnapshot}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }));

    await waitFor(() => {
      expect(screen.getByText('恢复中...')).toBeInTheDocument();
    });

    resolvePromise!();
  });

  it('should render without label when snapshot has no label', () => {
    const snapshotWithoutLabel: Snapshot = {
      ...mockSnapshot,
      label: undefined,
    };

    render(
      <RestoreConfirm
        snapshot={snapshotWithoutLabel}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText(/标签：/)).not.toBeInTheDocument();
  });
});
