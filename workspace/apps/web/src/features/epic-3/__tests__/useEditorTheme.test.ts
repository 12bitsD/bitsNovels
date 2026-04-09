import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditorTheme } from '../hooks/useEditorTheme';

describe('useEditorTheme', () => {
  let localStorageData: Record<string, string> = {};

  const matchMediaMock = {
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  beforeEach(() => {
    localStorageData = {};

    const localStorageMock = {
      getItem: vi.fn((key: string) => localStorageData[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageData[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageData[key];
      }),
    };

    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(matchMediaMock));

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should initialize with default theme settings', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light');
    });
    expect(result.current.fontFamily).toBe('system');
    expect(result.current.fontSize).toBe(16);
    expect(result.current.lineSpacing).toBe(1.75);
    expect(result.current.followSystem).toBe(false);
  });

  it('should set theme mode', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light');
    });

    act(() => {
      result.current.setThemeMode('dark');
    });

    expect(result.current.themeMode).toBe('dark');
    expect(localStorage.getItem('editor-theme-config')).toContain('dark');
  });

  it('should set font family', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.fontFamily).toBe('system');
    });

    act(() => {
      result.current.setFontFamily('mono');
    });

    expect(result.current.fontFamily).toBe('mono');
    expect(localStorage.getItem('editor-theme-config')).toContain('mono');
  });

  it('should set font size', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.fontSize).toBe(16);
    });

    act(() => {
      result.current.setFontSize(20);
    });

    expect(result.current.fontSize).toBe(20);
    expect(localStorage.getItem('editor-theme-config')).toContain('20');
  });

  it('should clamp font size within valid range', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.fontSize).toBe(16);
    });

    act(() => {
      result.current.setFontSize(10);
    });
    expect(result.current.fontSize).toBe(14);

    act(() => {
      result.current.setFontSize(30);
    });
    expect(result.current.fontSize).toBe(24);
  });

  it('should set line spacing', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.lineSpacing).toBe(1.75);
    });

    act(() => {
      result.current.setLineSpacing(2.0);
    });

    expect(result.current.lineSpacing).toBe(2.0);
    expect(localStorage.getItem('editor-theme-config')).toContain('2');
  });

  it('should toggle follow system mode', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.followSystem).toBe(false);
    });

    act(() => {
      result.current.setFollowSystem(true);
    });

    expect(result.current.followSystem).toBe(true);
    expect(localStorage.getItem('editor-theme-config')).toContain('true');
  });

  it('should provide CSS variable styles', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.styles).toBeDefined();
    });

    // @ts-expect-error typecheck fix
    expect(result.current.styles['--editor-font-size']).toBe('16px');
    // @ts-expect-error typecheck fix
    expect(result.current.styles['--editor-line-height']).toBe('1.75');
  });

  it('should provide theme colors based on mode', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.themeColors).toBeDefined();
    });

    expect(result.current.themeColors.background).toBeDefined();
    expect(result.current.themeColors.text).toBeDefined();

    act(() => {
      result.current.setThemeMode('dark');
    });

    expect(result.current.themeColors.background).toBeDefined();
    expect(result.current.themeColors.text).toBeDefined();
  });

  it('should listen to system color scheme changes when followSystem is enabled', async () => {
    localStorageData['editor-theme-config'] = JSON.stringify({ followSystem: true });

    renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
  });

  it('should reset to defaults', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light');
    });

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

  it('should support sepia theme mode', async () => {
    const { result } = renderHook(() => useEditorTheme());

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light');
    });

    act(() => {
      result.current.setThemeMode('sepia');
    });

    expect(result.current.themeMode).toBe('sepia');
    expect(result.current.themeColors.background).toBeDefined();
  });
});
