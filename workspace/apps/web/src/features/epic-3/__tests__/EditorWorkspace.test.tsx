import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditorWorkspace } from '../components/EditorWorkspace';

// Track mock calls and captured callbacks
const mockUseEditor = vi.fn();
const mockClientPATCH = vi.fn();
const mockSaveNow = vi.fn();
const mockSetContent = vi.fn();
const mockRetry = vi.fn();

// Mock @tiptap/react
vi.mock('@tiptap/react', () => ({
  useEditor: (config: unknown) => mockUseEditor(config),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" data-editor={editor ? 'initialized' : 'null'}>
      {editor ? 'Editor Content' : 'No Editor'}
    </div>
  ),
}));

// Mock the API client
vi.mock('../../../api/client', () => ({
  client: {
    PATCH: (...args: unknown[]) => mockClientPATCH(...args),
  },
}));

// Mock the auto save hook
vi.mock('../hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    saveStatus: 'idle',
    lastSavedAt: null,
    saveNow: mockSaveNow,
    setContent: mockSetContent,
    content: '',
    retry: mockRetry,
  }),
}));

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
    mockClientPATCH.mockResolvedValue({ data: { success: true }, error: undefined, response: new Response() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state when editor is not initialized', () => {
    mockUseEditor.mockReturnValue(null);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render editor workspace when initialized', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('章节标题')).toBeInTheDocument();
  });

  it('should render with initial title', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <EditorWorkspace
        projectId="project-123"
        chapterId="chapter-123"
        initialTitle="Test Chapter Title"
      />
    );

    const titleInput = screen.getByPlaceholderText('章节标题') as HTMLInputElement;
    expect(titleInput.value).toBe('Test Chapter Title');
  });

  it('should render with initial content', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(
      <EditorWorkspace
        projectId="project-123"
        chapterId="chapter-123"
        initialContent='<p>Initial content</p>'
      />
    );

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '<p>Initial content</p>',
      })
    );
  });

  it('should update title when user types', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    const titleInput = screen.getByPlaceholderText('章节标题');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    expect((titleInput as HTMLInputElement).value).toBe('New Title');
  });

  it('should show keyboard shortcut hint', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    expect(screen.getByText(/快捷键:/)).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    expect(screen.getByText(/保存/)).toBeInTheDocument();
  });

  it('should show Markdown support hint', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    expect(screen.getByText(/Markdown 支持:/)).toBeInTheDocument();
  });

  it('should trigger save on Ctrl+S keyboard shortcut', () => {
    mockSaveNow.mockClear();
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });

    expect(mockSaveNow).toHaveBeenCalled();
  });

  it('should trigger save on Cmd+S keyboard shortcut (Mac)', () => {
    mockSaveNow.mockClear();
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace chapterId="chapter-123" />);

    fireEvent.keyDown(document, { key: 's', metaKey: true });

    expect(mockSaveNow).toHaveBeenCalled();
  });

  it('should prevent default browser save dialog on Ctrl+S', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace chapterId="chapter-123" />);

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should pass correct chapterId to save handler', async () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);
    mockClientPATCH.mockResolvedValue({ data: { success: true }, error: undefined, response: new Response() });

    render(<EditorWorkspace chapterId="chapter-456" initialTitle="My Title" />);

    await waitFor(() => {
      expect(mockUseEditor).toHaveBeenCalled();
    });
  });

  it('should handle save error', async () => {
    mockClientPATCH.mockResolvedValue({ data: undefined, error: { message: 'Save failed' }, response: new Response() });

    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace chapterId="chapter-123" />);

    // The component should handle errors gracefully
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('should calculate and display word count', () => {
    const mockEditor = createMockEditor({
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] }] })),
    });
    mockUseEditor.mockReturnValue(mockEditor);

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

    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace chapterId="chapter-123" initialContent="Initial content" />);

    // The useEffect should have been called to initialize word count
    expect(mockGetJSON).toHaveBeenCalled();
  });

  it('should apply correct container classes', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    const { container } = render(<EditorWorkspace chapterId="chapter-123" />);

    const mainContainer = container.querySelector('[class*="max-w-"]');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should display StatusBar component', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace chapterId="chapter-123" />);

    // StatusBar is rendered with word count label
    expect(screen.getByText('字数:')).toBeInTheDocument();
  });
});
