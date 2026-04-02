import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SnapshotList } from './SnapshotList';
import type { Snapshot } from '../../hooks/useSnapshots';

describe('SnapshotList', () => {
  const mockOnSelect = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnCompare = vi.fn();

  const mockSnapshots: Snapshot[] = [
    {
      id: '1',
      chapterId: 'chapter-1',
      content: 'content 1',
      charCount: 1000,
      type: 'manual',
      label: 'First draft',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      chapterId: 'chapter-1',
      content: 'content 2',
      charCount: 1200,
      type: 'auto',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      chapterId: 'chapter-1',
      content: 'content 3',
      charCount: 1500,
      type: 'daily',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: '4',
      chapterId: 'chapter-1',
      content: 'content 4',
      charCount: 1100,
      type: 'restore_backup',
      createdAt: new Date(Date.now() - 10000000).toISOString(),
    },
  ];

  it('should render empty state when no snapshots', () => {
    render(
      <SnapshotList
        snapshots={[]}
        selectedSnapshot={null}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    expect(screen.getByText('暂无版本快照')).toBeInTheDocument();
    expect(screen.getByText('创建快照以保存当前版本')).toBeInTheDocument();
  });

  it('should render snapshot list', () => {
    render(
      <SnapshotList
        snapshots={mockSnapshots}
        selectedSnapshot={null}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    expect(screen.getByText('First draft')).toBeInTheDocument();
    expect(screen.getByText('手动')).toBeInTheDocument();
    expect(screen.getByText('自动')).toBeInTheDocument();
    expect(screen.getByText('每日')).toBeInTheDocument();
    expect(screen.getByText('恢复备份')).toBeInTheDocument();
  });

  it('should call onSelect when snapshot is clicked', () => {
    render(
      <SnapshotList
        snapshots={mockSnapshots}
        selectedSnapshot={null}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    const snapshotItem = screen.getByText('First draft').closest('div')?.closest('[role="button"]') ||
                        screen.getByText('First draft').closest('div');
    fireEvent.click(snapshotItem!);

    expect(mockOnSelect).toHaveBeenCalledWith(mockSnapshots[0]);
  });

  it('should show selected state', () => {
    render(
      <SnapshotList
        snapshots={mockSnapshots}
        selectedSnapshot={mockSnapshots[0]}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    const selectedItem = screen.getByText('First draft').closest('div[class*="border-[#8B6914]"]');
    expect(selectedItem).toBeInTheDocument();
  });

  it('should call onCompare when compare button is clicked', () => {
    render(
      <SnapshotList
        snapshots={mockSnapshots}
        selectedSnapshot={null}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    const compareButtons = screen.getAllByLabelText('对比当前版本');
    fireEvent.click(compareButtons[0]);

    expect(mockOnCompare).toHaveBeenCalledWith(mockSnapshots[0]);
  });

  it('should call onDelete when delete button is clicked for manual snapshot', () => {
    render(
      <SnapshotList
        snapshots={mockSnapshots}
        selectedSnapshot={null}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    const deleteButton = screen.getByLabelText('删除快照');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should not show delete button for non-manual snapshots', () => {
    render(
      <SnapshotList
        snapshots={[mockSnapshots[1]]}
        selectedSnapshot={null}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    expect(screen.queryByLabelText('删除快照')).not.toBeInTheDocument();
  });

  it('should display word count', () => {
    render(
      <SnapshotList
        snapshots={mockSnapshots}
        selectedSnapshot={null}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    expect(screen.getByText('1,000 字')).toBeInTheDocument();
    expect(screen.getByText('1,200 字')).toBeInTheDocument();
  });

  it('should format date correctly', () => {
    const todaySnapshot: Snapshot = {
      id: 'today',
      chapterId: 'chapter-1',
      content: 'content',
      charCount: 100,
      type: 'manual',
      createdAt: new Date().toISOString(),
    };

    render(
      <SnapshotList
        snapshots={[todaySnapshot]}
        selectedSnapshot={null}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onCompare={mockOnCompare}
      />
    );

    expect(screen.getByText(/今天/)).toBeInTheDocument();
  });
});
