import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFocusMode } from '../hooks/useFocusMode';

describe('useFocusMode', () => {
  let requestFullscreenMock: ReturnType<typeof vi.fn>;
  let exitFullscreenMock: ReturnType<typeof vi.fn>;
  let fullscreenElementMock: { value: Element | null };

  beforeEach(() => {
    requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
    exitFullscreenMock = vi.fn().mockResolvedValue(undefined);

    fullscreenElementMock = { value: null };
    Object.defineProperty(document, 'fullscreenElement', {
      get: () => fullscreenElementMock.value,
      configurable: true,
    });

    Object.defineProperty(document, 'documentElement', {
      value: {
        requestFullscreen: requestFullscreenMock,
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(),
          toggle: vi.fn(),
        },
      },
      configurable: true,
    });

    Object.defineProperty(document, 'exitFullscreen', {
      value: exitFullscreenMock,
      configurable: true,
    });

    document.addEventListener = vi.fn();
    document.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with focus mode disabled', () => {
    const { result } = renderHook(() => useFocusMode());

    expect(result.current.isFocusMode).toBe(false);
  });

  it('should enter focus mode when enterFocusMode is called', async () => {
    const { result } = renderHook(() => useFocusMode());

    await act(async () => {
      await result.current.enterFocusMode();
    });

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(true);
    });
  });

  it('should exit focus mode when exitFocusMode is called', async () => {
    const { result } = renderHook(() => useFocusMode());

    await act(async () => {
      await result.current.enterFocusMode();
    });

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(true);
    });

    await act(async () => {
      await result.current.exitFocusMode();
    });

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(false);
    });
  });

  it('should toggle focus mode', async () => {
    const { result } = renderHook(() => useFocusMode());

    await act(async () => {
      await result.current.toggleFocusMode();
    });

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(true);
    });

    await act(async () => {
      await result.current.toggleFocusMode();
    });

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(false);
    });
  });

  it('should register F11 key handler on mount', () => {
    renderHook(() => useFocusMode());

    expect(document.addEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useFocusMode());
    
    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });

  it('should enter focus mode on F11 key press', async () => {
    const { result } = renderHook(() => useFocusMode());

    const keyHandler = vi.mocked(document.addEventListener).mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1] as (event: KeyboardEvent) => void;

    if (keyHandler) {
      await act(async () => {
        keyHandler(new KeyboardEvent('keydown', { key: 'F11' }));
      });
    }

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(true);
    });
  });

  it('should exit focus mode on Escape key press', async () => {
    const { result } = renderHook(() => useFocusMode());

    const keyHandler = vi.mocked(document.addEventListener).mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1] as (event: KeyboardEvent) => void;

    await act(async () => {
      await result.current.enterFocusMode();
    });

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(true);
    });

    if (keyHandler) {
      await act(async () => {
        keyHandler(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
    }

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(false);
    });
  });

  it('should handle fullscreen API errors gracefully', async () => {
    requestFullscreenMock.mockRejectedValue(new Error('Fullscreen denied'));

    const { result } = renderHook(() => useFocusMode());

    await act(async () => {
      await result.current.enterFocusMode();
    });

    await waitFor(() => {
      expect(result.current.isFocusMode).toBe(true);
    });
  });

  it('should provide isFocusMode, enterFocusMode, exitFocusMode, and toggleFocusMode', () => {
    const { result } = renderHook(() => useFocusMode());

    expect(result.current).toHaveProperty('isFocusMode');
    expect(result.current).toHaveProperty('enterFocusMode');
    expect(result.current).toHaveProperty('exitFocusMode');
    expect(result.current).toHaveProperty('toggleFocusMode');

    expect(typeof result.current.isFocusMode).toBe('boolean');
    expect(typeof result.current.enterFocusMode).toBe('function');
    expect(typeof result.current.exitFocusMode).toBe('function');
    expect(typeof result.current.toggleFocusMode).toBe('function');
  });
});
