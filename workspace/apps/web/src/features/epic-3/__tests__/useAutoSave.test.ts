import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../hooks/useAutoSave';

describe('useAutoSave', () => {
  const mockSaveFn = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSaveFn.mockClear();
    mockSaveFn.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with idle status', () => {
    const { result } = renderHook(() => useAutoSave({
      content: 'test',
      onSave: mockSaveFn,
    }));

    expect(result.current.saveStatus).toBe('idle');
  });

  it('should debounce save after 3 seconds of inactivity', async () => {
    const { result } = renderHook(() => useAutoSave({
      content: 'initial content',
      onSave: mockSaveFn,
    }));

    act(() => {
      result.current.setContent('new content');
    });

    expect(result.current.saveStatus).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(mockSaveFn).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockSaveFn).toHaveBeenCalledTimes(1);
    });
  });

  it('should reset debounce timer on content change', async () => {
    const { result } = renderHook(() => useAutoSave({
      content: 'initial',
      onSave: mockSaveFn,
    }));

    act(() => {
      result.current.setContent('change 1');
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.setContent('change 2');
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockSaveFn).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockSaveFn).toHaveBeenCalledTimes(1);
    });
  });

  it('should support manual save with saveNow', async () => {
    const { result } = renderHook(() => useAutoSave({
      content: 'test content',
      onSave: mockSaveFn,
    }));

    act(() => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(mockSaveFn).toHaveBeenCalledWith('test content', 'manual');
    });
  });

  it('should show saving status during save', async () => {
    let resolveSave: (value: unknown) => void;
    mockSaveFn.mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));

    const { result } = renderHook(() => useAutoSave({
      content: 'test',
      onSave: mockSaveFn,
    }));

    act(() => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saving');
    });

    resolveSave!({ success: true });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });
  });

  it('should update lastSavedAt on successful save', async () => {
    const { result } = renderHook(() => useAutoSave({
      content: 'test',
      onSave: mockSaveFn,
    }));

    const beforeSave = Date.now();

    act(() => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });

    expect(result.current.lastSavedAt).toBeDefined();
    expect(result.current.lastSavedAt!.getTime()).toBeGreaterThanOrEqual(beforeSave);
  });

  it('should retry on failure up to maxRetries times', async () => {
    mockSaveFn
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useAutoSave({
      content: 'test',
      onSave: mockSaveFn,
      maxRetries: 2,
    }));

    act(() => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(mockSaveFn).toHaveBeenCalledTimes(3);
    }, { timeout: 5000 });

    expect(result.current.saveStatus).toBe('saved');
  });

  it('should show error status after max retries exceeded', async () => {
    mockSaveFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAutoSave({
      content: 'test',
      onSave: mockSaveFn,
      maxRetries: 1,
    }));

    act(() => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(mockSaveFn).toHaveBeenCalledTimes(2);
    }, { timeout: 5000 });

    expect(result.current.saveStatus).toBe('error');
  });

  it('should pass saveSource to onSave callback', async () => {
    const { result } = renderHook(() => useAutoSave({
      content: 'test',
      onSave: mockSaveFn,
    }));

    act(() => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(mockSaveFn).toHaveBeenCalledWith('test', 'manual');
    });
  });

  it('should pass auto as saveSource for debounced saves', async () => {
    const { result } = renderHook(() => useAutoSave({
      content: 'test',
      onSave: mockSaveFn,
    }));

    act(() => {
      result.current.setContent('new content');
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockSaveFn).toHaveBeenCalledWith('new content', 'auto');
    });
  });

  it('should expose retry function for manual retry after error', async () => {
    mockSaveFn
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useAutoSave({
      content: 'test',
      onSave: mockSaveFn,
      maxRetries: 1,
    }));

    act(() => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(mockSaveFn).toHaveBeenCalledTimes(2);
    }, { timeout: 5000 });

    expect(result.current.saveStatus).toBe('error');

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    }, { timeout: 3000 });

    expect(mockSaveFn).toHaveBeenCalledTimes(3);
  });
});
