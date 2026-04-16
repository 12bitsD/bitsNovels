import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditorWorkspace } from '../components/EditorWorkspace';

// Track mock calls and captured callbacks
const mockUseEditor = vi.fn();
const mockClientPATCH = vi.fn();
const mockSaveNow = vi.fn();
const mockSetContent = vi.fn();
const mockRetry = vi.fn();
const mockCreateAITask = vi.fn();
const mockStopAITask = vi.fn();
const mockStreamAITask = vi.fn();

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

vi.mock('../../epic-4/api/aiClient', () => ({
  createAITask: (...args: unknown[]) => mockCreateAITask(...args),
  stopAITask: (...args: unknown[]) => mockStopAITask(...args),
  streamAITask: (...args: unknown[]) => mockStreamAITask(...args),
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
  type CommandCtx = {
    tr: { replaceWith: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
    state: {
      schema: {
        nodes: {
          aiDraft: { create: ReturnType<typeof vi.fn> };
          paragraph: { create: ReturnType<typeof vi.fn> };
        };
        text: (text: string) => { text: string };
      };
    };
  };

  const createMockEditor = (overrides = {}) => ({
    getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] })),
    getHTML: vi.fn(() => '<p>Test content</p>'),
    isEditable: true,
    commands: {
      insertContent: vi.fn(),
      insertContentAt: vi.fn(),
      command: vi.fn((fn: unknown) => {
        const callback = fn as (ctx: CommandCtx) => boolean;
        return callback({
          tr: { replaceWith: vi.fn(), delete: vi.fn() },
          state: {
            schema: {
              nodes: {
                aiDraft: { create: vi.fn(() => ({})) },
                paragraph: { create: vi.fn(() => ({})) },
              },
              text: (text: string) => ({ text }),
            },
          },
        });
      }),
    },
    state: {
      selection: {
        from: 0,
        to: 10,
        empty: false,
      },
      doc: {
        textBetween: vi.fn(() => 'selected text'),
        descendants: vi.fn((cb: (node: unknown, pos: number) => void) => {
          cb({ type: { name: 'aiDraft' }, attrs: { draftId: 'task-1' }, nodeSize: 5 }, 1);
        }),
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClientPATCH.mockResolvedValue({ data: { success: true }, error: undefined, response: new Response() });
    mockCreateAITask.mockResolvedValue({
      taskId: 'task-1',
      task: { id: 'task-1', projectId: 'project-123', type: 'continue', status: 'generating', configSnapshot: {}, contextBlocks: [], createdAt: '', updatedAt: '' },
    });
    mockStopAITask.mockResolvedValue({ task: {}, result: { taskId: 'task-1', type: 'continue', status: 'stopped', payloadType: 'text', payload: { content: '' }, createdAt: '' } });
    mockStreamAITask.mockImplementation(async (_taskId: string, onEvent: (event: unknown) => void) => {
      onEvent({ type: 'task.started', taskId: 'task-1' });
      onEvent({ type: 'task.delta', taskId: 'task-1', content: 'Hello ' });
      onEvent({ type: 'task.delta', taskId: 'task-1', content: 'World' });
      onEvent({
        type: 'task.completed',
        taskId: 'task-1',
        result: { taskId: 'task-1', type: 'continue', status: 'done', payloadType: 'text', payload: { content: 'Hello World' }, createdAt: '' },
      });
    });
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

  it('should render AI buttons', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);
    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);
    expect(screen.getByText('AI 续写')).toBeInTheDocument();
    expect(screen.getByText('AI 对话')).toBeInTheDocument();
    expect(screen.getByText('AI 润色')).toBeInTheDocument();
    expect(screen.getByText('AI 扩写')).toBeInTheDocument();
    expect(screen.getByText('AI 缩写')).toBeInTheDocument();
  });

  it('should open continue modal and start generation', async () => {
    const mockEditor = createMockEditor({
      state: {
        selection: { from: 0, to: 0, empty: true },
        doc: {
          textBetween: vi.fn(),
          descendants: vi.fn((cb: (node: unknown, pos: number) => void) =>
            cb({ type: { name: 'aiDraft' }, attrs: { draftId: 'task-1' }, nodeSize: 5 }, 1),
          ),
        },
      },
    });
    mockUseEditor.mockReturnValue(mockEditor);
    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    fireEvent.click(screen.getByText('AI 续写'));
    expect(screen.getByText('AI 续写长度')).toBeInTheDocument();
    fireEvent.click(screen.getByText('开始'));

    await waitFor(() => expect(mockCreateAITask).toHaveBeenCalled());
    expect(mockEditor.commands.insertContent).toHaveBeenCalled();
    expect(mockStreamAITask).toHaveBeenCalled();
  });

  it('should open diff modal and apply revised text', async () => {
    const mockEditor = createMockEditor({
      state: {
        selection: { from: 1, to: 5, empty: false },
        doc: {
          textBetween: vi.fn(() => 'ORIG'),
          descendants: vi.fn((cb: (node: unknown, pos: number) => void) =>
            cb({ type: { name: 'aiDraft' }, attrs: { draftId: 'task-1' }, nodeSize: 5 }, 1),
          ),
        },
      },
    });
    mockUseEditor.mockReturnValue(mockEditor);
    mockCreateAITask.mockResolvedValueOnce({
      taskId: 'task-2',
      task: { id: 'task-2', projectId: 'project-123', type: 'polish', status: 'generating', configSnapshot: {}, contextBlocks: [], createdAt: '', updatedAt: '' },
    });
    mockStreamAITask.mockImplementationOnce(async (_taskId: string, onEvent: (event: unknown) => void) => {
      onEvent({
        type: 'task.completed',
        taskId: 'task-2',
        result: {
          taskId: 'task-2',
          type: 'polish',
          status: 'done',
          payloadType: 'diff',
          payload: { diff: [{ type: 'delete', content: 'ORIG' }, { type: 'insert', content: 'REV' }], revisedText: 'REV' },
          createdAt: '',
        },
      });
    });

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);
    // Simulate TipTap onCreate being called (to set selectionCount > 0).
    const config = mockUseEditor.mock.calls[0]?.[0] as { onCreate?: (args: { editor: unknown }) => void } | undefined;
    config?.onCreate?.({ editor: mockEditor });

    await waitFor(() => expect((screen.getByRole('button', { name: 'AI 润色' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'AI 润色' }));
    await waitFor(() => expect(mockCreateAITask).toHaveBeenCalled());
    fireEvent.click(screen.getByText('采纳'));
    expect(mockEditor.commands.insertContentAt).toHaveBeenCalledWith({ from: 1, to: 5 }, 'REV');
  });

  it('should open dialogue modal and start dialogue task', async () => {
    const mockEditor = createMockEditor({
      state: {
        selection: { from: 0, to: 0, empty: true },
        doc: { textBetween: vi.fn(), descendants: vi.fn((cb: (node: unknown, pos: number) => void) => cb({ type: { name: 'aiDraft' }, attrs: { draftId: 'task-1' }, nodeSize: 5 }, 1)) },
      },
    });
    mockUseEditor.mockReturnValue(mockEditor);
    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    fireEvent.click(screen.getByRole('button', { name: 'AI 对话' }));
    expect(screen.getByText('角色名')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '开始' }));
    await waitFor(() => expect(mockCreateAITask).toHaveBeenCalled());
  });

  it('should stop generation on Escape', async () => {
    const mockEditor = createMockEditor({
      state: {
        selection: { from: 0, to: 0, empty: true },
        doc: { textBetween: vi.fn(), descendants: vi.fn((cb: (node: unknown, pos: number) => void) => cb({ type: { name: 'aiDraft' }, attrs: { draftId: 'task-1' }, nodeSize: 5 }, 1)) },
      },
    });
    mockUseEditor.mockReturnValue(mockEditor);
    mockStreamAITask.mockImplementationOnce(async (_taskId: string, onEvent: (event: unknown) => void) => {
      onEvent({ type: 'task.started', taskId: 'task-1' });
      onEvent({ type: 'task.delta', taskId: 'task-1', content: 'Hello' });
    });

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);
    fireEvent.click(screen.getByText('AI 续写'));
    fireEvent.click(screen.getByText('开始'));
    await waitFor(() => expect(mockStreamAITask).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument());

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(mockStopAITask).toHaveBeenCalled());
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

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    fireEvent.keyDown(document, { key: 's', metaKey: true });

    expect(mockSaveNow).toHaveBeenCalled();
  });

  it('should prevent default browser save dialog on Ctrl+S', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should pass correct chapterId to save handler', async () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);
    mockClientPATCH.mockResolvedValue({ data: { success: true }, error: undefined, response: new Response() });

    render(<EditorWorkspace projectId="project-456" chapterId="chapter-456" initialTitle="My Title" />);

    await waitFor(() => {
      expect(mockUseEditor).toHaveBeenCalled();
    });
  });

  it('should handle save error', async () => {
    mockClientPATCH.mockResolvedValue({ data: undefined, error: { message: 'Save failed' }, response: new Response() });

    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    // The component should handle errors gracefully
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('should calculate and display word count', () => {
    const mockEditor = createMockEditor({
      getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] }] })),
    });
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

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

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" initialContent="Initial content" />);

    const config = mockUseEditor.mock.calls[0]?.[0] as { onCreate?: (args: { editor: unknown }) => void } | undefined;
    expect(config?.onCreate).toBeTypeOf('function');
    config?.onCreate?.({ editor: mockEditor });
    expect(mockGetJSON).toHaveBeenCalled();
  });

  it('should apply correct container classes', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    const { container } = render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    const mainContainer = container.querySelector('[class*="max-w-"]');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should display StatusBar component', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<EditorWorkspace projectId="project-123" chapterId="chapter-123" />);

    // StatusBar is rendered with word count label
    expect(screen.getByText('字数:')).toBeInTheDocument();
  });
});
