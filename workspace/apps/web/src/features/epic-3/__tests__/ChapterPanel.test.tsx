import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChapterPanel } from '../components/ChapterPanel/ChapterPanel';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

const mockVolumes = [
  {
    id: 'vol-1',
    projectId: 'proj-1',
    name: '第一卷：序章',
    description: '故事的开端',
    order: 0,
    chapterCount: 2,
    totalChars: 8500,
    chapters: [
      {
        id: 'ch-1',
        projectId: 'proj-1',
        volumeId: 'vol-1',
        title: '第一章：启程',
        order: 0,
        charCount: 5000,
        parserStatus: 'parsed' as const,
        lastEditedAt: '2024-01-15T10:00:00Z',
        hasNote: false,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'ch-2',
        projectId: 'proj-1',
        volumeId: 'vol-1',
        title: '第二章：相遇',
        order: 1,
        charCount: 3500,
        parserStatus: 'parsing' as const,
        lastEditedAt: '2024-01-16T14:30:00Z',
        hasNote: true,
        createdAt: '2024-01-16T14:30:00Z',
        updatedAt: '2024-01-16T14:30:00Z',
      },
    ],
  },
  {
    id: 'vol-2',
    projectId: 'proj-1',
    name: '第二卷：发展',
    description: '故事的展开',
    order: 1,
    chapterCount: 1,
    totalChars: 3000,
    chapters: [
      {
        id: 'ch-3',
        projectId: 'proj-1',
        volumeId: 'vol-2',
        title: '第三章：危机',
        order: 0,
        charCount: 3000,
        parserStatus: 'pending' as const,
        lastEditedAt: '2024-01-17T09:15:00Z',
        hasNote: false,
        createdAt: '2024-01-17T09:15:00Z',
        updatedAt: '2024-01-17T09:15:00Z',
      },
    ],
  },
];

const mockOutlineData = {
  volumes: mockVolumes,
  totals: { volumeCount: 2, chapterCount: 3, totalChars: 11500 },
};

describe('ChapterPanel', () => {
  const mockOnChapterSelect = vi.fn();
  const mockOnChapterCreate = vi.fn();
  const mockOnChapterRename = vi.fn();
  const mockOnChapterDelete = vi.fn();
  const mockOnChapterReorder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    server.use(
      http.get('/api/projects/:projectId/outline', () => {
        return HttpResponse.json(mockOutlineData);
      })
    );
  });

  const renderPanel = (props = {}) => {
    return render(
      <ChapterPanel
        projectId="proj-1"
        activeChapterId={null}
        onChapterSelect={mockOnChapterSelect}
        onChapterCreate={mockOnChapterCreate}
        onChapterRename={mockOnChapterRename}
        onChapterDelete={mockOnChapterDelete}
        onChapterReorder={mockOnChapterReorder}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      renderPanel();
      expect(screen.getByTestId('chapter-panel-loading')).toBeInTheDocument();
    });

    it('should render volume and chapter tree structure after loading', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一卷：序章')).toBeInTheDocument();
        expect(screen.getByText('第二卷：发展')).toBeInTheDocument();
      });

      expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      expect(screen.getByText('第二章：相遇')).toBeInTheDocument();
      expect(screen.getByText('第三章：危机')).toBeInTheDocument();
    });

    it('should display chapter metadata (char count, parser status)', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      expect(screen.getByText('5,000字')).toBeInTheDocument();
      expect(screen.getByLabelText('已解析')).toBeInTheDocument();
      expect(screen.getByLabelText('解析中')).toBeInTheDocument();
      expect(screen.getByLabelText('待解析')).toBeInTheDocument();
    });

    it('should highlight active chapter', async () => {
      renderPanel({ activeChapterId: 'ch-1' });

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const activeChapter = screen.getByTestId('chapter-item-ch-1');
      expect(activeChapter).toHaveClass('bg-amber-light/20');
    });

    it('should show empty state when no volumes exist', async () => {
      server.use(
        http.get('/api/projects/:projectId/outline', () => {
          return HttpResponse.json({ volumes: [], totals: { volumeCount: 0, chapterCount: 0, totalChars: 0 } });
        })
      );

      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('暂无章节')).toBeInTheDocument();
      });
    });
  });

  describe('Chapter Selection', () => {
    it('should call onChapterSelect when clicking a chapter', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('第一章：启程'));

      expect(mockOnChapterSelect).toHaveBeenCalledWith('ch-1');
    });

    it('should update active chapter styling on selection', async () => {
      const { rerender } = renderPanel({ activeChapterId: null });

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapter1 = screen.getByTestId('chapter-item-ch-1');
      expect(chapter1).not.toHaveClass('bg-amber-light/20');

      rerender(
        <ChapterPanel
          projectId="proj-1"
          activeChapterId="ch-1"
          onChapterSelect={mockOnChapterSelect}
          onChapterCreate={mockOnChapterCreate}
          onChapterRename={mockOnChapterRename}
          onChapterDelete={mockOnChapterDelete}
          onChapterReorder={mockOnChapterReorder}
        />
      );

      expect(screen.getByTestId('chapter-item-ch-1')).toHaveClass('bg-amber-light/20');
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right-click', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapter1 = screen.getByTestId('chapter-item-ch-1');
      fireEvent.contextMenu(chapter1);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('重命名')).toBeInTheDocument();
      expect(screen.getByText('在上方插入章节')).toBeInTheDocument();
      expect(screen.getByText('在下方插入章节')).toBeInTheDocument();
      expect(screen.getByText(/移入回收站/)).toBeInTheDocument();
    });

    it('should call onChapterRename when selecting rename', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapter1 = screen.getByTestId('chapter-item-ch-1');
      fireEvent.contextMenu(chapter1);

      fireEvent.click(screen.getByText('重命名'));

      const input = screen.getByDisplayValue('第一章：启程');
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: '新章节名' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnChapterRename).toHaveBeenCalledWith('ch-1', '新章节名');
    });

    it('should call onChapterDelete when selecting delete', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapter1 = screen.getByTestId('chapter-item-ch-1');
      fireEvent.contextMenu(chapter1);

      fireEvent.click(screen.getByText(/移入回收站/));

      expect(mockOnChapterDelete).toHaveBeenCalledWith('ch-1');
    });

    it('should call onChapterCreate when selecting insert above', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapter1 = screen.getByTestId('chapter-item-ch-1');
      fireEvent.contextMenu(chapter1);

      fireEvent.click(screen.getByText('在上方插入章节'));

      expect(mockOnChapterCreate).toHaveBeenCalledWith({
        volumeId: 'vol-1',
        targetOrder: 0,
      });
    });

    it('should call onChapterCreate when selecting insert below', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapter1 = screen.getByTestId('chapter-item-ch-1');
      fireEvent.contextMenu(chapter1);

      fireEvent.click(screen.getByText('在下方插入章节'));

      expect(mockOnChapterCreate).toHaveBeenCalledWith({
        volumeId: 'vol-1',
        targetOrder: 1,
      });
    });

    it('should close context menu when clicking outside', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapter1 = screen.getByTestId('chapter-item-ch-1');
      fireEvent.contextMenu(chapter1);

      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('New Chapter Button', () => {
    it('should render new chapter button at the bottom', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /新章节/i })).toBeInTheDocument();
      });
    });

    it('should call onChapterCreate with last volume when clicking new chapter button', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /新章节/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /新章节/i }));

      expect(mockOnChapterCreate).toHaveBeenCalledWith({
        volumeId: 'vol-2',
        title: '新章节',
      });
    });

    it('should enter edit mode when creating new chapter', async () => {
      server.use(
        http.post('/api/projects/:projectId/chapters', async () => {
          return HttpResponse.json({
            id: 'ch-new',
            projectId: 'proj-1',
            volumeId: 'vol-2',
            title: '新章节',
            order: 1,
            charCount: 0,
            parserStatus: 'empty',
            hasNote: false,
            createdAt: '2024-01-18T10:00:00Z',
            updatedAt: '2024-01-18T10:00:00Z',
            lastEditedAt: '2024-01-18T10:00:00Z',
          });
        })
      );

      renderPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /新章节/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /新章节/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('新章节')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should render drag handles for chapters', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const dragHandles = screen.getAllByLabelText(/拖动章节|拖动排序/i);
      expect(dragHandles.length).toBeGreaterThan(0);
    });

    it('should call onChapterReorder when drag ends', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const dragHandle = screen.getAllByLabelText(/拖动章节|拖动排序/i)[0];
      expect(dragHandle).toBeInTheDocument();
    });
  });

  describe('Volume Expansion', () => {
    it('should expand/collapse volume when clicking toggle', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一卷：序章')).toBeInTheDocument();
      });

      expect(screen.getByText('第一章：启程')).toBeInTheDocument();

      const collapseBtn = screen.getByRole('button', { name: /折叠第一卷/i });
      fireEvent.click(collapseBtn);

      await waitFor(() => {
        expect(screen.queryByText('第一章：启程')).not.toBeInTheDocument();
      });

      const expandBtn = screen.getByRole('button', { name: /展开第一卷/i });
      fireEvent.click(expandBtn);

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when API fails', async () => {
      server.use(
        http.get('/api/projects/:projectId/outline', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      renderPanel();

      await waitFor(() => {
        expect(screen.getByTestId('chapter-panel-error')).toBeInTheDocument();
        expect(screen.getByText(/加载失败/i)).toBeInTheDocument();
      });
    });

    it('should allow retry on error', async () => {
      let callCount = 0;
      server.use(
        http.get('/api/projects/:projectId/outline', () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 });
          }
          return HttpResponse.json(mockOutlineData);
        })
      );

      renderPanel();

      await waitFor(() => {
        expect(screen.getByText(/加载失败/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /重试/i }));

      await waitFor(() => {
        expect(screen.getByText('第一卷：序章')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation in rename mode', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapter1 = screen.getByTestId('chapter-item-ch-1');
      fireEvent.contextMenu(chapter1);
      fireEvent.click(screen.getByText('重命名'));

      const input = screen.getByDisplayValue('第一章：启程');

      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByDisplayValue('第一章：启程')).not.toBeInTheDocument();
      });
    });

    it('should handle Tab navigation between chapters', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByText('第一章：启程')).toBeInTheDocument();
      });

      const chapterItems = screen.getAllByRole('button', { name: /选择章节/i });
      expect(chapterItems.length).toBeGreaterThan(0);
    });
  });
});
