import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VolumeItem, type Volume } from './VolumeItem';
import { ChapterSummary } from './ChapterItem';

// Mock @dnd-kit modules
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  SortableContext: vi.fn(({ children }) => children),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

const mockChapters: ChapterSummary[] = [
  {
    id: 'ch-1',
    projectId: 'proj-1',
    volumeId: 'vol-1',
    title: '第一章：启程',
    order: 0,
    chars: 5000,
    lastEditedAt: '2024-01-15T10:00:00Z',
    parserStatus: 'parsed',
  },
  {
    id: 'ch-2',
    projectId: 'proj-1',
    volumeId: 'vol-1',
    title: '第二章：相遇',
    order: 1,
    chars: 5500,
    parserStatus: 'pending',
  },
];

const mockVolume: Volume = {
  id: 'vol-1',
  projectId: 'proj-1',
  name: '第一卷：序章',
  description: '故事的开端',
  order: 0,
  chapterCount: 2,
  totalChars: 10500,
  chapters: mockChapters,
};

const defaultProps = {
  volume: mockVolume,
  isExpanded: false,
  onToggle: vi.fn(),
  selectedChapters: new Set<string>(),
  onChapterSelect: vi.fn(),
  onChapterDoubleClick: vi.fn(),
  onAddChapter: vi.fn(),
  onRenameVolume: vi.fn(),
  onDeleteVolume: vi.fn(),
};

describe('VolumeItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render volume name correctly', () => {
    render(<VolumeItem {...defaultProps} />);
    expect(screen.getByText('第一卷：序章')).toBeInTheDocument();
  });

  it('should render volume statistics correctly', () => {
    render(<VolumeItem {...defaultProps} />);
    const stats = screen.getByTestId('volume-stats-vol-1');
    expect(stats).toHaveTextContent('2章');
    expect(stats).toHaveTextContent('10,500字');
  });

  it('should call onToggle when expand/collapse button is clicked', () => {
    render(<VolumeItem {...defaultProps} />);
    const toggleBtn = screen.getByRole('button', { name: /展开第一卷/i });
    fireEvent.click(toggleBtn);
    expect(defaultProps.onToggle).toHaveBeenCalledWith('vol-1');
  });

  it('should show edit input when double clicking volume row', async () => {
    render(<VolumeItem {...defaultProps} />);
    const volumeRow = screen.getByText('第一卷：序章');
    fireEvent.doubleClick(volumeRow);

    await waitFor(() => {
      expect(screen.getByDisplayValue('第一卷：序章')).toBeInTheDocument();
    });
  });

  it('should call onRenameVolume when rename is submitted', async () => {
    render(<VolumeItem {...defaultProps} />);
    const volumeRow = screen.getByText('第一卷：序章');
    fireEvent.doubleClick(volumeRow);

    await waitFor(() => {
      const input = screen.getByDisplayValue('第一卷：序章') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '新卷名' } });
      fireEvent.blur(input);
    });

    expect(defaultProps.onRenameVolume).toHaveBeenCalledWith('vol-1', '新卷名');
  });

  it('should call onDeleteVolume when delete button is clicked', () => {
    render(<VolumeItem {...defaultProps} />);
    const volumeRow = screen.getByText('第一卷：序章').closest('div[class*="group"]');
    if (volumeRow) {
      fireEvent.mouseEnter(volumeRow);
    }
    const deleteBtn = screen.getByRole('button', { name: /删除卷/i });
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDeleteVolume).toHaveBeenCalledWith('vol-1');
  });

  it('should call onAddChapter when add chapter button is clicked', () => {
    render(<VolumeItem {...defaultProps} />);
    const volumeRow = screen.getByText('第一卷：序章').closest('div[class*="group"]');
    if (volumeRow) {
      fireEvent.mouseEnter(volumeRow);
    }
    const addBtn = screen.getByRole('button', { name: /添加章节/i });
    fireEvent.click(addBtn);
    expect(defaultProps.onAddChapter).toHaveBeenCalledWith('vol-1');
  });

  it('should show action buttons on hover', () => {
    render(<VolumeItem {...defaultProps} />);
    const volumeRow = screen.getByText('第一卷：序章').closest('div[class*="group"]');
    if (volumeRow) {
      fireEvent.mouseEnter(volumeRow);
    }
    expect(screen.getByRole('button', { name: /添加章节/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重命名/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /删除卷/i })).toBeInTheDocument();
  });

  it('should render chapters when expanded', () => {
    render(<VolumeItem {...defaultProps} isExpanded={true} />);
    expect(screen.getByText('第一章：启程')).toBeInTheDocument();
    expect(screen.getByText('第二章：相遇')).toBeInTheDocument();
  });

  it('should not render chapters when collapsed', () => {
    render(<VolumeItem {...defaultProps} isExpanded={false} />);
    expect(screen.queryByText('第一章：启程')).not.toBeInTheDocument();
  });

  it('should show drag handle with correct data-testid', () => {
    render(<VolumeItem {...defaultProps} />);
    expect(screen.getByTestId('volume-drag-handle-vol-1')).toBeInTheDocument();
  });

  it('should handle escape key to cancel editing', async () => {
    render(<VolumeItem {...defaultProps} />);
    const volumeRow = screen.getByText('第一卷：序章');
    fireEvent.doubleClick(volumeRow);

    await waitFor(() => {
      expect(screen.getByDisplayValue('第一卷：序章')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('第一卷：序章');
    fireEvent.change(input, { target: { value: '新名称' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByDisplayValue('新名称')).not.toBeInTheDocument();
    });

    // After Escape, the component should show the original name in a span, not an input
    expect(screen.getByText('第一卷：序章')).toBeInTheDocument();
  });
});