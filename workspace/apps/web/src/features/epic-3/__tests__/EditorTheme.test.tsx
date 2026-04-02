import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorTheme } from '../components/EditorTheme/EditorTheme';

const mockUseEditorTheme = vi.fn();

vi.mock('../hooks/useEditorTheme', () => ({
  useEditorTheme: () => mockUseEditorTheme(),
}));

describe('EditorTheme', () => {
  const mockSetThemeMode = vi.fn();
  const mockSetFontFamily = vi.fn();
  const mockSetFontSize = vi.fn();
  const mockSetLineSpacing = vi.fn();
  const mockSetFollowSystem = vi.fn();
  const mockResetToDefaults = vi.fn();

  const defaultMockReturn = {
    themeMode: 'light' as const,
    fontFamily: 'system' as const,
    fontSize: 16,
    lineSpacing: 1.75 as const,
    followSystem: false,
    setThemeMode: mockSetThemeMode,
    setFontFamily: mockSetFontFamily,
    setFontSize: mockSetFontSize,
    setLineSpacing: mockSetLineSpacing,
    setFollowSystem: mockSetFollowSystem,
    resetToDefaults: mockResetToDefaults,
    styles: { '--editor-font-size': '16px', '--editor-line-height': '1.75' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEditorTheme.mockReturnValue(defaultMockReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render theme selector', () => {
    render(<EditorTheme />);
    expect(screen.getByLabelText('主题')).toBeInTheDocument();
  });

  it('should render font selector', () => {
    render(<EditorTheme />);
    expect(screen.getByLabelText('字体')).toBeInTheDocument();
  });

  it('should render font size control', () => {
    render(<EditorTheme />);
    expect(screen.getByLabelText('字号')).toBeInTheDocument();
  });

  it('should render line spacing control', () => {
    render(<EditorTheme />);
    expect(screen.getByLabelText('行间距')).toBeInTheDocument();
  });

  it('should render follow system checkbox', () => {
    render(<EditorTheme />);
    expect(screen.getByLabelText('跟随系统')).toBeInTheDocument();
  });

  it('should call setThemeMode when theme is changed', () => {
    render(<EditorTheme />);

    const themeSelect = screen.getByLabelText('主题');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });

  it('should call setFontFamily when font is changed', () => {
    render(<EditorTheme />);

    const fontSelect = screen.getByLabelText('字体');
    fireEvent.change(fontSelect, { target: { value: 'serif' } });

    expect(mockSetFontFamily).toHaveBeenCalledWith('serif');
  });

  it('should call setFontSize when font size is changed', () => {
    render(<EditorTheme />);

    const fontSizeInput = screen.getByLabelText('字号');
    fireEvent.change(fontSizeInput, { target: { value: '18' } });

    expect(mockSetFontSize).toHaveBeenCalledWith(18);
  });

  it('should call setLineSpacing when line spacing is changed', () => {
    render(<EditorTheme />);

    const lineSpacingSelect = screen.getByLabelText('行间距');
    fireEvent.change(lineSpacingSelect, { target: { value: '2.0' } });

    expect(mockSetLineSpacing).toHaveBeenCalledWith(2.0);
  });

  it('should call setFollowSystem when checkbox is toggled', () => {
    render(<EditorTheme />);

    const followSystemCheckbox = screen.getByLabelText('跟随系统');
    fireEvent.click(followSystemCheckbox);

    expect(mockSetFollowSystem).toHaveBeenCalledWith(true);
  });

  it('should disable theme select when followSystem is true', () => {
    mockUseEditorTheme.mockReturnValue({
      ...defaultMockReturn,
      followSystem: true,
    });

    render(<EditorTheme />);

    const themeSelect = screen.getByLabelText('主题');
    expect(themeSelect).toBeDisabled();
  });

  it('should render reset button', () => {
    render(<EditorTheme />);
    expect(screen.getByText('恢复默认')).toBeInTheDocument();
  });

  it('should call resetToDefaults when reset button is clicked', () => {
    render(<EditorTheme />);

    const resetButton = screen.getByText('恢复默认');
    fireEvent.click(resetButton);

    expect(mockResetToDefaults).toHaveBeenCalled();
  });

  it('should display current font size value', () => {
    render(<EditorTheme />);

    expect(screen.getByText('16px')).toBeInTheDocument();
  });

  it('should show all theme options', () => {
    render(<EditorTheme />);

    const themeSelect = screen.getByLabelText('主题');
    expect(themeSelect.querySelector('option[value="light"]')).toBeInTheDocument();
    expect(themeSelect.querySelector('option[value="dark"]')).toBeInTheDocument();
    expect(themeSelect.querySelector('option[value="sepia"]')).toBeInTheDocument();
  });

  it('should show all font options', () => {
    render(<EditorTheme />);

    const fontSelect = screen.getByLabelText('字体');
    expect(fontSelect.querySelector('option[value="system"]')).toBeInTheDocument();
    expect(fontSelect.querySelector('option[value="serif"]')).toBeInTheDocument();
    expect(fontSelect.querySelector('option[value="sans"]')).toBeInTheDocument();
    expect(fontSelect.querySelector('option[value="kai"]')).toBeInTheDocument();
    expect(fontSelect.querySelector('option[value="mono"]')).toBeInTheDocument();
  });

  it('should show all line spacing options', () => {
    render(<EditorTheme />);

    const lineSpacingSelect = screen.getByLabelText('行间距');
    expect(lineSpacingSelect.querySelector('option[value="1.5"]')).toBeInTheDocument();
    expect(lineSpacingSelect.querySelector('option[value="1.75"]')).toBeInTheDocument();
    expect(lineSpacingSelect.querySelector('option[value="2"]')).toBeInTheDocument();
  });

  it('should apply panel styling', () => {
    const { container } = render(<EditorTheme />);

    const panel = container.querySelector('[data-testid="editor-theme-panel"]');
    expect(panel).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-lg');
  });
});
