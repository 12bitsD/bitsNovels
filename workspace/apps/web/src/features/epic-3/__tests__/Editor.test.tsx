import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Editor } from '../components/Editor';
import * as editorConfig from '../utils/editorConfig';

// Mock the useTipTapEditor hook
vi.mock('../utils/editorConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof editorConfig>();
  return {
    ...actual,
    useTipTapEditor: vi.fn(),
  };
});

const mockedUseTipTapEditor = vi.mocked(editorConfig.useTipTapEditor);

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading skeleton when editor is not initialized', () => {
    mockedUseTipTapEditor.mockReturnValue(null);

    render(<Editor />);

    // Loading state should be visible
    const skeleton = screen.getByRole('status', { hidden: true });
    expect(skeleton).toBeInTheDocument();
  });

  it('should render editor when initialized', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test content</p>'),
      isEditable: true,
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    // Editor content should be rendered
    expect(document.querySelector('.ProseMirror')).toBeInTheDocument();
  });

  it('should pass initialContent to useTipTapEditor', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Initial content</p>'),
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockReturnValue(mockEditor);
    const initialContent = '<p>Initial content</p>';

    render(<Editor initialContent={initialContent} />);

    expect(mockedUseTipTapEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContent,
      })
    );
  });

  it('should pass editable prop to useTipTapEditor', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Content</p>'),
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockReturnValue(mockEditor);

    render(<Editor editable={false} />);

    expect(mockedUseTipTapEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        editable: false,
      })
    );
  });

  it('should call onChange when content updates', async () => {
    const mockOnChange = vi.fn();
    let updateCallback: ((content: string) => void) | undefined;

    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test content</p>'),
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockImplementation((options) => {
      updateCallback = options?.onUpdate;
      return mockEditor;
    });

    render(<Editor onChange={mockOnChange} />);

    // Simulate content update
    if (updateCallback) {
      updateCallback('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Updated content"}]}]}');
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
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    expect(mockedUseTipTapEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContent: '',
      })
    );
  });

  it('should use default editable value when not provided', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p></p>'),
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    expect(mockedUseTipTapEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        editable: true,
      })
    );
  });

  it('should not call onChange if not provided when content updates', async () => {
    let updateCallback: ((content: string) => void) | undefined;

    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test content</p>'),
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockImplementation((options) => {
      updateCallback = options?.onUpdate;
      return mockEditor;
    });

    // Should not throw when onChange is not provided
    render(<Editor />);

    // Simulate content update
    if (updateCallback) {
      expect(() => {
        updateCallback!('{"type":"doc","content":[]}');
      }).not.toThrow();
    }
  });

  it('should apply correct CSS classes to editor container', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test</p>'),
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    const container = document.querySelector('.bg-white');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('rounded-lg', 'border', 'border-gray-200', 'shadow-sm');
  });

  it('should have min-height class on editor content', () => {
    const mockEditor = {
      getHTML: vi.fn(() => '<p>Test</p>'),
    } as unknown as ReturnType<typeof editorConfig.useTipTapEditor>;

    mockedUseTipTapEditor.mockReturnValue(mockEditor);

    render(<Editor />);

    const editorContent = document.querySelector('.min-h-[300px]');
    expect(editorContent).toBeInTheDocument();
  });
});
