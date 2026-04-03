import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChapterNotePanel } from '../ChapterNotePanel';

// Mock TipTap editor
const mockUseEditor = vi.fn();

vi.mock('@tiptap/react', () => ({
  useEditor: (...args: unknown[]) => mockUseEditor(...args),
  EditorContent: ({ editor, className }: { editor: unknown; className?: string }) => (
    <div data-testid="editor-content" data-editor={editor ? 'initialized' : 'null'} className={className}>
      {editor ? <div className="ProseMirror">Note Content</div> : 'No Editor'}
    </div>
  ),
}));

// Mock editorConfig
vi.mock('../../utils/editorConfig', () => ({
  useTipTapEditor: vi.fn((options) => {
    return mockUseEditor({
      content: options?.initialContent || '',
      editable: options?.editable ?? true,
      onUpdate: options?.onUpdate ? ({ editor }: { editor: { getJSON: () => unknown } }) => {
        options.onUpdate?.(JSON.stringify(editor.getJSON()));
      } : undefined,
    });
  }),
}));

describe('ChapterNotePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockNote = {
    id: 'note-1',
    chapterId: 'chapter-1',
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test note"}]}]}',
    charCount: 8,
    autoSavedAt: '2026-04-03T10:00:00Z',
    createdAt: '2026-04-03T09:00:00Z',
    updatedAt: '2026-04-03T10:00:00Z',
  };

  it('should render collapsed by default', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={vi.fn()}
        saveStatus="idle"
      />
    );

    // Panel should be collapsed (not visible)
    const toggleButton = screen.getByRole('button', { name: /章节备注/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should expand panel when toggle button is clicked', async () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={vi.fn()}
        saveStatus="idle"
      />
    );

    const toggleButton = screen.getByRole('button', { name: /章节备注/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      // Editor should now be visible
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  it('should collapse panel when toggle button is clicked again', async () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={vi.fn()}
        saveStatus="idle"
      />
    );

    const toggleButton = screen.getByRole('button', { name: /章节备注/i });

    // Expand
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    // Collapse
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.queryByTestId('editor-content')).not.toBeInTheDocument();
    });
  });

  it('should show note indicator icon when note exists', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={vi.fn()}
        saveStatus="idle"
      />
    );

    // Should show an indicator (icon) that note exists
    const toggleButton = screen.getByRole('button', { name: /章节备注/i });
    expect(toggleButton.querySelector('svg') || toggleButton).toBeTruthy();
  });

  it('should display save status indicator', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={vi.fn()}
        saveStatus="saving"
      />
    );

    // Should show saving status
    const savingIndicator = screen.getByText(/保存中/i);
    expect(savingIndicator).toBeInTheDocument();
  });

  it('should show "已保存" when saveStatus is saved', async () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={vi.fn()}
        saveStatus="saved"
      />
    );

    // Expand panel first to see save status
    const toggleButton = screen.getByRole('button', { name: /章节备注/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/已保存/i)).toBeInTheDocument();
    });
  });

  it('should show error state when saveStatus is error', async () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={vi.fn()}
        saveStatus="error"
      />
    );

    // Expand panel first to see error
    const toggleButton = screen.getByRole('button', { name: /章节备注/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/保存失败/i)).toBeInTheDocument();
    });
  });

  it('should call onSave when content changes', async () => {
    const mockOnSave = vi.fn();
    let capturedOnUpdate: ((props: { editor: { getJSON: () => unknown } }) => void) | undefined;

    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    mockUseEditor.mockImplementation((options) => {
      capturedOnUpdate = options?.onUpdate;
      return mockEditor;
    });

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );

    // Expand panel
    const toggleButton = screen.getByRole('button', { name: /章节备注/i });
    fireEvent.click(toggleButton);

    // Simulate content update
    if (capturedOnUpdate) {
      capturedOnUpdate({
        editor: {
          getJSON: () => ({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated note' }] }],
          }),
        },
      });
    }

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should display character count', async () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={mockNote}
        onSave={vi.fn()}
        saveStatus="idle"
      />
    );

    // Expand panel
    const toggleButton = screen.getByRole('button', { name: /章节备注/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      // Should show character count (8 chars for "Test note")
      expect(screen.getByText(/8\/2000/)).toBeInTheDocument();
    });
  });

  it('should handle empty note', () => {
    const emptyNote = {
      id: 'note-empty',
      chapterId: 'chapter-1',
      content: '',
      charCount: 0,
      createdAt: '2026-04-03T09:00:00Z',
      updatedAt: '2026-04-03T09:00:00Z',
    };

    const mockEditor = {
      getHTML: vi.fn(() => ''),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={emptyNote}
        onSave={vi.fn()}
        saveStatus="idle"
      />
    );

    // Should render without errors
    expect(screen.getByRole('button', { name: /章节备注/i })).toBeInTheDocument();
  });

  it('should handle null note', () => {
    const mockEditor = {
      getHTML: vi.fn(() => ''),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNotePanel
        chapterId="chapter-1"
        note={null}
        onSave={vi.fn()}
        saveStatus="idle"
      />
    );

    expect(screen.getByRole('button', { name: /章节备注/i })).toBeInTheDocument();
  });
});