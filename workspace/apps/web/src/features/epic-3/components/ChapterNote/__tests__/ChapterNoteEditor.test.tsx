import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChapterNoteEditor } from '../ChapterNoteEditor';

// Mock TipTap editor
const mockUseEditor = vi.fn();

vi.mock('@tiptap/react', () => ({
  useEditor: (...args: unknown[]) => mockUseEditor(...args),
  EditorContent: ({ editor, className }: { editor: unknown; className?: string }) => (
    <div data-testid="note-editor-content" data-editor={editor ? 'initialized' : 'null'} className={className}>
      {editor ? <div className="ProseMirror">Note Editor Content</div> : 'No Editor'}
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

describe('ChapterNoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render editor with initial content', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNoteEditor
        initialContent='{"type":"doc","content":[{"type":"paragraph"}]}'
        onChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('note-editor-content')).toBeInTheDocument();
    expect(screen.getByText('Note Editor Content')).toBeInTheDocument();
  });

  it('should call onChange when content updates', async () => {
    const mockOnChange = vi.fn();
    let capturedOnUpdate: ((props: { editor: { getJSON: () => unknown } }) => void) | undefined;

    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    mockUseEditor.mockImplementation((options) => {
      capturedOnUpdate = options?.onUpdate;
      return mockEditor;
    });

    render(<ChapterNoteEditor initialContent="" onChange={mockOnChange} />);

    if (capturedOnUpdate) {
      capturedOnUpdate({
        editor: {
          getJSON: () => ({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New note' }] }],
          }),
        },
      });
    }

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"New note"}]}]}'
      );
    });
  });

  it('should pass editable=false when disabled', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNoteEditor initialContent="" onChange={vi.fn()} disabled={true} />
    );

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({ editable: false })
    );
  });

  it('should apply correct styling classes', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <ChapterNoteEditor initialContent="" onChange={vi.fn()} />
    );

    const editorContainer = document.querySelector('.bg-parchment');
    expect(editorContainer).toBeInTheDocument();
  });

  it('should render with empty initialContent', () => {
    const mockEditor = {
      getHTML: vi.fn(() => ''),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<ChapterNoteEditor initialContent="" onChange={vi.fn()} />);

    expect(screen.getByTestId('note-editor-content')).toBeInTheDocument();
  });

  it('should not call onChange if not provided when content updates', async () => {
    let capturedOnUpdate: ((props: { editor: { getJSON: () => unknown } }) => void) | undefined;

    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test note</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    mockUseEditor.mockImplementation((options) => {
      capturedOnUpdate = options?.onUpdate;
      return mockEditor;
    });

    render(<ChapterNoteEditor initialContent="" />);

    expect(() => {
      if (capturedOnUpdate) {
        capturedOnUpdate({
          editor: {
            getJSON: () => ({ type: 'doc', content: [] }),
          },
        });
      }
    }).not.toThrow();
  });

  it('should show placeholder when content is empty', () => {
    const mockEditor = {
      getHTML: vi.fn(() => ''),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<ChapterNoteEditor initialContent="" onChange={vi.fn()} />);

    expect(screen.getByTestId('note-editor-content')).toBeInTheDocument();
  });
});