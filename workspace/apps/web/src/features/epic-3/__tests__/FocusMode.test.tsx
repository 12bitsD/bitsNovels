import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FocusMode } from '../components/FocusMode/FocusMode';
import type { ReactNode } from 'react';

interface MockUseFocusModeReturn {
  isFocusMode: boolean;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  toggleFocusMode: () => void;
}

// @ts-expect-error typecheck fix
const mockUseFocusMode = vi.fn<[], MockUseFocusModeReturn>();

vi.mock('../hooks/useFocusMode', () => ({
  // @ts-expect-error typecheck fix
  useFocusMode: () => mockUseFocusMode(),
}));

describe('FocusMode', () => {
  const mockEnterFocusMode = vi.fn();
  const mockExitFocusMode = vi.fn();
  const mockToggleFocusMode = vi.fn();

  const defaultMockReturn: MockUseFocusModeReturn = {
    isFocusMode: false,
    enterFocusMode: mockEnterFocusMode,
    exitFocusMode: mockExitFocusMode,
    toggleFocusMode: mockToggleFocusMode,
  };

  const MockEditorContent = (): ReactNode => (
    <div data-testid="editor-content">Editor Content</div>
  );

  const MockStatusBar = (): ReactNode => (
    <div data-testid="status-bar">Status Bar</div>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue(defaultMockReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children in normal mode', () => {
    render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
      />
    );

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  it('should not show focus mode overlay in normal mode', () => {
    render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
      />
    );

    expect(screen.queryByTestId('focus-mode-exit-button')).not.toBeInTheDocument();
  });

  it('should render focus mode overlay when in focus mode', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
      />
    );

    expect(screen.getByTestId('focus-mode-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  it('should show exit button in focus mode', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
      />
    );

    expect(screen.getByTestId('focus-mode-exit-button')).toBeInTheDocument();
  });

  it('should call exitFocusMode when exit button is clicked', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
      />
    );

    const exitButton = screen.getByTestId('focus-mode-exit-button');
    fireEvent.click(exitButton);

    expect(mockExitFocusMode).toHaveBeenCalled();
  });

  it('should apply correct CSS classes for focus mode', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    const { container } = render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
      />
    );

    const overlay = container.querySelector('[data-testid="focus-mode-overlay"]');
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50');
  });

  it('should apply light theme background class by default', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    const { container } = render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
        theme="light"
      />
    );

    const overlay = container.querySelector('[data-testid="focus-mode-overlay"]');
    expect(overlay).toHaveClass('bg-[#F5F0E8]');
  });

  it('should apply dark theme background class', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    const { container } = render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
        theme="dark"
      />
    );

    const overlay = container.querySelector('[data-testid="focus-mode-overlay"]');
    expect(overlay).toHaveClass('bg-[#1A1714]');
  });

  it('should apply sepia theme background class', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    const { container } = render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
        theme="sepia"
      />
    );

    const overlay = container.querySelector('[data-testid="focus-mode-overlay"]');
    expect(overlay).toHaveClass('bg-[#F5F0E8]');
  });

  it('should center editor content in focus mode', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    const { container } = render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
      />
    );

    const editorContainer = container.querySelector('[data-testid="focus-mode-editor-container"]');
    expect(editorContainer).toHaveClass('max-w-[800px]', 'mx-auto');
  });

  it('should show status bar with low contrast styling', () => {
    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    const { container } = render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
        theme="dark"
      />
    );

    const statusContainer = container.querySelector('[data-testid="focus-mode-status-container"]');
    expect(statusContainer).toHaveClass('opacity-60');
  });

  it('should handle keyboard shortcuts during focus mode', async () => {
    const mockKeyDown = vi.fn();

    // @ts-expect-error typecheck fix
    mockUseFocusMode.mockReturnValue({
      ...defaultMockReturn,
      isFocusMode: true,
    });

    render(
      <FocusMode
        editorContent={<MockEditorContent />}
        statusBar={<MockStatusBar />}
        onKeyDown={mockKeyDown}
      />
    );

    const overlay = screen.getByTestId('focus-mode-overlay');
    fireEvent.keyDown(overlay, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(mockKeyDown).toHaveBeenCalled();
    });
  });
});
