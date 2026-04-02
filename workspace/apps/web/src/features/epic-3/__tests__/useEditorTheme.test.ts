import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditorTheme, type ThemeMode, type FontOption, type LineSpacing } from '../hooks/useEditorTheme';

describe('useEditorTheme', () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };

  const matchMediaMock = {
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue(matchMediaMock),
      writable: true,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default theme settings', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light');
    });
    expect(result.current.fontFamily).toBe('system');
    expect(result.current.fontSize).toBe(16);
    expect(result.current.lineSpacing).toBe(1.75);
    expect(result.current.followSystem).toBe(false);
  });

  it('should load saved theme from localStorage', async () => {
    const savedConfig = JSON.stringify({
      themeMode: 'dark' as ThemeMode,
      fontFamily: 'serif' as FontOption,
      fontSize: 18,
      lineSpacing: 2.0 as LineSpacing,
      followSystem: true,
    });
    localStorageMock.getItem.mockReturnValue(savedConfig);

    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark');
    });
    expect(result.current.fontFamily).toBe('serif');
    expect(result.current.fontSize).toBe(18);
    expect(result.current.lineSpacing).toBe(2.0);
    expect(result.current.followSystem).toBe(true);
  });

  it('should set theme mode', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light');
    });

    act(() => {
      result.current.setThemeMode('dark');
    });

    expect(result.current.themeMode).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should set font family', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.fontFamily).toBe('system');
    });

    act(() => {
      result.current.setFontFamily('mono');
    });

    expect(result.current.fontFamily).toBe('mono');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should set font size', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.fontSize).toBe(16);
    });

    act(() => {
      result.current.setFontSize(20);
    });

    expect(result.current.fontSize).toBe(20);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should clamp font size within valid range', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    act(() => {
      result.current.setFontSize(10);
    });
    expect(result.current.fontSize).toBe(14);

    act(() => {
      result.current.setFontSize(30);
    });
    expect(result.current.fontSize).toBe(24);
  });

  it('should set line spacing', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    act(() => {
      result.current.setLineSpacing(2.0);
    });

    expect(result.current.lineSpacing).toBe(2.0);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should toggle follow system mode', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    act(() => {
      result.current.setFollowSystem(true);
    });

    expect(result.current.followSystem).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should provide CSS variable styles', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    expect(result.current.styles).toBeDefined();
    expect(result.current.styles['--editor-font-size']).toBe('16px');
    expect(result.current.styles['--editor-line-height']).toBe('1.75');
  });

  it('should provide theme colors based on mode', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    expect(result.current.themeColors).toBeDefined();
    expect(result.current.themeColors.background).toBeDefined();
    expect(result.current.themeColors.text).toBeDefined();

    act(() => {
      result.current.setThemeMode('dark');
    });

    expect(result.current.themeColors.background).toBeDefined();
    expect(result.current.themeColors.text).toBeDefined();
  });

  it('should listen to system color scheme changes when followSystem is enabled', () => {
    localStorageMock.getItem.mockReturnValue(null);

    renderHook(() => useEditorTheme());

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('should reset to defaults', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    act(() => {
      result.current.setThemeMode('dark');
      result.current.setFontSize(20);
    });

    expect(result.current.themeMode).toBe('dark');
    expect(result.current.fontSize).toBe(20);

    act(() => {
      result.current.resetToDefaults();
    });

    expect(result.current.themeMode).toBe('light');
    expect(result.current.fontSize).toBe(16);
    expect(result.current.fontFamily).toBe('system');
    expect(result.current.lineSpacing).toBe(1.75);
    expect(result.current.followSystem).toBe(false);
  });

  it('should support sepia theme mode', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useEditorTheme());

    act(() => {
      result.current.setThemeMode('sepia');
    });

    expect(result.current.themeMode).toBe('sepia');
    expect(result.current.themeColors.background).toBeDefined();
  });
});
