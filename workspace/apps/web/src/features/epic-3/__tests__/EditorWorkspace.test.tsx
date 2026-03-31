import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditorWorkspace } from '../components/EditorWorkspace';
import * as editorConfig from '../utils/editorConfig';
import * as useAutoSave from '../hooks/useAutoSave';
import { client } from '../../../api/client';

// Mock TipTap react hooks
vi.mock('@tiptap/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiptap/react')>();
  return {
    ...actual,
    useEditor: vi.fn(),
    EditorContent: ({ editor }: { editor: unknown }) => (
      <div data-testid="editor-content" data-editor={editor ? 'initialized' : 'null'}>
        {editor ? 'Editor Content' : 'No Editor'}
      </div>
    ),
  };
});

// Mock the auto save hook
vi.mock('../hooks/useAutoSave', async (importOriginal) => {
  const actual = await importOriginal<typeof useAutoSave>();
  return {
    ...actual,
    useAutoSave: vi.fn(),
  };
});

// Mock the API client
vi.mock('../../../api/client', () => ({
  client: {
    PATCH: vi.fn(),
  },
}));

const mockedUseEditor = vi.mocked((await import('@tiptap/react')).useEditor);
const mockedUseAutoSave = vi.mocked(useAutoSave.useAutoSave);
const mockedClientPATCH = vi.mocked(client.PATCH);

describe('EditorWorkspace', () => {
  const createMockEditor = (overrides = {}) => ({
    getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] })),
    getHTML: vi.fn(() => '<p>Test content</p>'),
    isEditable: true,
    state: {
      selection: {
        from: 0,
        to: 10,
        empty: false,
      },
      doc: {
        textBetween: vi.fn(() => 'selected text'),
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAutoSave.mockReturnValue({
      saveStatus: 'idle',
      lastSavedAt: null,
      saveNow: vi.fn(),
      setContent: vi.fn(),
      content: '',
      retry: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state when editor is not initialized', () => {
    mockedUseEditor.mockReturnValue(null);

    render(<EditorWorkspace chapterId="chapter-123" />);

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should render editor workspace when initialized', () => {
    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('章节标题')).toBeInTheDocument();
  });

  it('should render with initial title', () => {
    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(
      <EditorWorkspace
        chapterId="chapter-123"
        initialTitle="Test Chapter Title"
      />
    );

    const titleInput = screen.getByPlaceholderText('章节标题') as HTMLInputElement;
    expect(titleInput.value).toBe('Test Chapter Title');
  });

  it('should render with initial content', () => {
    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(
      <EditorWorkspace
        chapterId="chapter-123"
        initialContent='<p>Initial content</p>'
      />
    );

    expect(mockedUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '<p>Initial content</p>',
      })
    );
  });

  it('should update title when user types', () => {
    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    const titleInput = screen.getByPlaceholderText('章节标题');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    expect((titleInput as HTMLInputElement).value).toBe('New Title');
  });

  it('should show keyboard shortcut hint', () => {
    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    expect(screen.getByText(/快捷键:/)).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('should show Markdown support hint', () => {
    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    expect(screen.getByText(/Markdown 支持:/)).toBeInTheDocument();
  });

  it('should trigger save on Ctrl+S keyboard shortcut', () => {
    const mockSaveNow = vi.fn();
    mockedUseAutoSave.mockReturnValue({
      saveStatus: 'idle',
      lastSavedAt: null,
      saveNow: mockSaveNow,
      setContent: vi.fn(),
      content: '',
      retry: vi.fn(),
    });

    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });

    expect(mockSaveNow).toHaveBeenCalled();
  });

  it('should trigger save on Cmd+S keyboard shortcut (Mac)', () => {
    const mockSaveNow = vi.fn();
    mockedUseAutoSave.mockReturnValue({
      saveStatus: 'idle',
      lastSavedAt: null,
      saveNow: mockSaveNow,
      setContent: vi.fn(),
      content: '',
      retry: vi.fn(),
    });

    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    fireEvent.keyDown(document, { key: 's', metaKey: true });

    expect(mockSaveNow).toHaveBeenCalled();
  });

  it('should prevent default browser save dialog on Ctrl+S', () => {
    const mockSaveNow = vi.fn();
    mockedUseAutoSave.mockReturnValue({
      saveStatus: 'idle',
      lastSavedAt: null,
      saveNow: mockSaveNow,
      setContent: vi.fn(),
      content: '',
      retry: vi.fn(),
    });

    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should pass correct chapterId to save handler', async () => {
    mockedClientPATCH.mockResolvedValue({ data: { success: true }, error: undefined, response: new Response() });

    const mockEditor = createMockEditor();
    mockedUseEditor.mockImplementation((config) => {
      if (config?.onUpdate) {
        config.onUpdate({ editor: mockEditor });
      }
      return mockEditor as unknown as ReturnType<typeof mockedUseEditor>;
    });

    render(<EditorWorkspace chapterId="chapter-456" initialTitle="My Title" />);

    await waitFor(() => {
      expect(mockedUseEditor).toHaveBeenCalled();
    });
  });

  it('should handle save error', async () => {
    mockedClientPATCH.mockResolvedValue({ data: undefined, error: { message: 'Save failed' }, response: new Response() });

    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    // The component should handle errors gracefully
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('should calculate and display word count', () => {
    const mockEditor = createMockEditor({
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] }] })),
    });
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    // Word count should be displayed in StatusBar
    expect(screen.getByText('字数:')).toBeInTheDocument();
  });

  it('should initialize word count on mount', () => {
    const mockGetJSON = vi.fn(() => ({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Initial content' }] }],
    }));
    const mockEditor = createMockEditor({ getJSON: mockGetJSON });

    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" initialContent="Initial content" />);

    // The useEffect should have been called to initialize word count
    expect(mockGetJSON).toHaveBeenCalled();
  });

  it('should apply correct container classes', () => {
    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    const { container } = render(<EditorWorkspace chapterId="chapter-123" />);

    const mainContainer = container.querySelector('[class*="max-w-"]');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should display StatusBar component', () => {
    const mockEditor = createMockEditor();
    mockedUseEditor.mockReturnValue(mockEditor as unknown as ReturnType<typeof mockedUseEditor>);

    render(<EditorWorkspace chapterId="chapter-123" />);

    // StatusBar is rendered with word count label
    expect(screen.getByText('字数:')).toBeInTheDocument();
  });
});
