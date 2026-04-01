import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Editor } from '../components/Editor';

// Mock @tiptap/react - must be before any imports that use it
const mockUseEditor = vi.fn();

vi.mock('@tiptap/react', () => ({
  useEditor: (...args: unknown[]) => mockUseEditor(...args),
  EditorContent: ({ editor, className }: { editor: unknown; className?: string }) => (
    <div data-testid="editor-content" data-editor={editor ? 'initialized' : 'null'} className={className}>
      {editor ? <div className="ProseMirror">Editor Content</div> : 'No Editor'}
    </div>
  ),
}));

// Mock editorConfig
vi.mock('../utils/editorConfig', () => ({
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

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading skeleton when editor is not initialized', () => {
    mockUseEditor.mockReturnValue(null);

    render(<Editor />);

    // Loading state should be visible (skeleton has animate-pulse class)
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render editor when initialized', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test content</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] })),
      isEditable: true,
    };

    mockUseEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    // Editor content should be rendered
    expect(document.querySelector('.ProseMirror')).toBeInTheDocument();
  });

  it('should pass initialContent to useTipTapEditor', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Initial content</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Initial content' }] }] })),
    };

    mockUseEditor.mockReturnValue(mockEditor);
    const initialContent = '<p>Initial content</p>';

    render(<Editor initialContent={initialContent} />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        content: initialContent,
      })
    );
  });

  it('should pass editable prop to useTipTapEditor', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Content</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    mockUseEditor.mockReturnValue(mockEditor);

    render(<Editor editable={false} />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        editable: false,
      })
    );
  });

  it('should call onChange when content updates', async () => {
    const mockOnChange = vi.fn();
    let capturedOnUpdate: (({ editor }: { editor: { getJSON: () => unknown } }) => void) | undefined;

    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test content</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] })),
    };

    mockUseEditor.mockImplementation((options) => {
      capturedOnUpdate = options?.onUpdate;
      return mockEditor;
    });

    render(<Editor onChange={mockOnChange} />);

    // Simulate content update
    if (capturedOnUpdate) {
      capturedOnUpdate({ 
        editor: { 
          getJSON: () => ({ 
            type: 'doc', 
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated content' }] }] 
          }) 
        } 
      });
    }

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Updated content"}]}]}'
      );
    });
  });

  it('should use default initialContent when not provided', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p></p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    mockUseEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '',
      })
    );
  });

  it('should use default editable value when not provided', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p></p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    mockUseEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        editable: true,
      })
    );
  });

  it('should not call onChange if not provided when content updates', async () => {
    let capturedOnUpdate: (({ editor }: { editor: { getJSON: () => unknown } }) => void) | undefined;

    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test content</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] })),
    };

    mockUseEditor.mockImplementation((options) => {
      capturedOnUpdate = options?.onUpdate;
      return mockEditor;
    });

    // Should not throw when onChange is not provided
    render(<Editor />);

    // Simulate content update
    if (capturedOnUpdate) {
      expect(() => {
        capturedOnUpdate!({ editor: { getJSON: () => ({ type: 'doc', content: [] }) } });
      }).not.toThrow();
    }
  });

  it('should apply correct CSS classes to editor container', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }] })),
    };

    mockUseEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    const container = document.querySelector('.bg-white');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('rounded-lg', 'border', 'border-gray-200', 'shadow-sm');
  });

  it('should have min-height class on editor content', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test</p>'),
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }] })),
    };

    mockUseEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    const editorContent = document.querySelector('[class*="min-h-"]');
    expect(editorContent).toBeInTheDocument();
  });
});
