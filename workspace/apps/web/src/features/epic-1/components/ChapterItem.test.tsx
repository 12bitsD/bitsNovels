import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterItem, type ChapterSummary } from './ChapterItem';

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
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

const mockChapter: ChapterSummary = {
  id: 'ch-1',
  projectId: 'proj-1',
  volumeId: 'vol-1',
  title: '第一章：启程',
  order: 0,
  chars: 5000,
  lastEditedAt: '2024-01-15T10:00:00Z',
  parserStatus: 'parsed',
};

const defaultProps = {
  chapter: mockChapter,
  isSelected: false,
  onSelect: vi.fn(),
  onDoubleClick: vi.fn(),
};

describe('ChapterItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chapter title correctly', () => {
    render(<ChapterItem {...defaultProps} />);
    expect(screen.getByText('第一章：启程')).toBeInTheDocument();
  });

  it('should render chapter character count', () => {
    render(<ChapterItem {...defaultProps} />);
    expect(screen.getByText('5,000字')).toBeInTheDocument();
  });

  it('should render last edited date', () => {
    render(<ChapterItem {...defaultProps} />);
    expect(screen.getByText(/1月15日/)).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    render(<ChapterItem {...defaultProps} />);
    const chapterItem = screen.getByTestId('chapter-item-ch-1');
    fireEvent.click(chapterItem);
    expect(defaultProps.onSelect).toHaveBeenCalledWith('ch-1', false, false);
  });

  it('should call onSelect with ctrlKey when Ctrl+clicked', () => {
    render(<ChapterItem {...defaultProps} />);
    const chapterItem = screen.getByTestId('chapter-item-ch-1');
    fireEvent.click(chapterItem, { ctrlKey: true });
    expect(defaultProps.onSelect).toHaveBeenCalledWith('ch-1', true, false);
  });

  it('should call onSelect with shiftKey when Shift+clicked', () => {
    render(<ChapterItem {...defaultProps} />);
    const chapterItem = screen.getByTestId('chapter-item-ch-1');
    fireEvent.click(chapterItem, { shiftKey: true });
    expect(defaultProps.onSelect).toHaveBeenCalledWith('ch-1', false, true);
  });

  it('should call onDoubleClick when double clicked', () => {
    render(<ChapterItem {...defaultProps} />);
    const chapterItem = screen.getByTestId('chapter-item-ch-1');
    fireEvent.doubleClick(chapterItem);
    expect(defaultProps.onDoubleClick).toHaveBeenCalledWith('ch-1');
  });

  it('should render selected state correctly', () => {
    render(<ChapterItem {...defaultProps} isSelected={true} />);
    const chapterItem = screen.getByTestId('chapter-item-ch-1');
    expect(chapterItem).toHaveClass('bg-amber-light/20');
  });

  it('should render unselected state correctly', () => {
    render(<ChapterItem {...defaultProps} isSelected={false} />);
    const chapterItem = screen.getByTestId('chapter-item-ch-1');
    expect(chapterItem).not.toHaveClass('bg-amber-light/20');
  });

  it('should render drag handle', () => {
    render(<ChapterItem {...defaultProps} />);
    expect(screen.getByTestId('chapter-drag-handle')).toBeInTheDocument();
  });

  it('should not render character count when chars is 0', () => {
    const chapterNoChars: ChapterSummary = { ...mockChapter, chars: 0 };
    render(<ChapterItem {...defaultProps} chapter={chapterNoChars} />);
    expect(screen.queryByText(/字/)).not.toBeInTheDocument();
  });

  it('should not render last edited date when not provided', () => {
    const chapterNoDate: ChapterSummary = { ...mockChapter, lastEditedAt: undefined };
    render(<ChapterItem {...defaultProps} chapter={chapterNoDate} />);
    expect(screen.queryByTestId('chapter-stats-ch-1')).toBeInTheDocument();
    expect(screen.queryByText(/月/)).not.toBeInTheDocument();
  });

  it('should render chapter stats with data-testid', () => {
    render(<ChapterItem {...defaultProps} />);
    expect(screen.getByTestId('chapter-stats-ch-1')).toBeInTheDocument();
  });

  it('should render chapter content', () => {
    render(<ChapterItem {...defaultProps} />);
    expect(screen.getByText('第一章：启程')).toBeInTheDocument();
  });
});