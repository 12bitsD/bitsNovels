/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExportTaskManager } from '../useExportTaskManager';
import { client } from '../../../../api/client';

vi.mock('../../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
  }
}));

describe('useExportTaskManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default config and loads history', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { items: [] }, error: null } as any);

    const { result } = renderHook(() => useExportTaskManager('p1'));

    expect(result.current.config.format).toBe('docx');
    expect(result.current.loadingHistory).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });

    expect(client.GET).toHaveBeenCalledWith('/api/projects/p1/exports');
  });

  it('updates config correctly', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { items: [] }, error: null } as any);
    const { result } = renderHook(() => useExportTaskManager('p1'));
    await waitFor(() => expect(result.current.loadingHistory).toBe(false));

    act(() => {
      result.current.updateConfig({ format: 'pdf', font: 'SimHei' });
    });

    expect(result.current.config.format).toBe('pdf');
    expect(result.current.config.font).toBe('SimHei');
  });

  it('applies template correctly', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { items: [] }, error: null } as any);
    const { result } = renderHook(() => useExportTaskManager('p1'));
    await waitFor(() => expect(result.current.loadingHistory).toBe(false));

    act(() => {
      result.current.applyTemplate({
        id: 't1',
        name: 'T1',
        format: 'txt',
        options: { txtEncoding: 'gbk', txtSeparator: 'blank' }
      } as any);
    });

    expect(result.current.config.format).toBe('txt');
    expect(result.current.config.txtEncoding).toBe('gbk');
    expect(result.current.config.txtSeparator).toBe('blank');
  });

  it('handles export and polling', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { items: [] }, error: null } as any); // initial fetch
    vi.mocked(client.POST).mockResolvedValueOnce({ data: { taskId: 'task-1', status: 'generating' }, error: null } as any);
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { task: { id: 'task-1', status: 'generating' } }, error: null } as any); // first poll
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { task: { id: 'task-1', status: 'done' } }, error: null } as any); // second poll
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { items: [{ id: 'task-1' }] }, error: null } as any); // history fetch after done

    const { result } = renderHook(() => useExportTaskManager('p1'));

    await waitFor(() => expect(result.current.loadingHistory).toBe(false));

    act(() => {
      result.current.handleExport();
    });

    expect(result.current.exporting).toBe(true);

    // Initial POST and first immediate poll
    await waitFor(() => {
      expect(client.POST).toHaveBeenCalled();
      expect(client.GET).toHaveBeenCalledWith('/api/projects/p1/exports/task-1');
    });

    await waitFor(() => {
      expect(result.current.currentTask?.status).toBe('done');
    }, { timeout: 3000 });
  });

  it('handles export failure', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { items: [] }, error: null } as any);
    vi.mocked(client.POST).mockResolvedValueOnce({ error: { detail: 'Network error' } } as any);

    const { result } = renderHook(() => useExportTaskManager('p1'));

    await waitFor(() => expect(result.current.loadingHistory).toBe(false));

    await act(async () => {
      await result.current.handleExport();
    });

    expect(result.current.exportError).toBe('Network error');
    expect(result.current.exporting).toBe(false);
  });

  it('handles download', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ data: { items: [] }, error: null } as any);
    const { result } = renderHook(() => useExportTaskManager('p1'));
    await waitFor(() => expect(result.current.loadingHistory).toBe(false));

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    result.current.handleDownload('task-1');

    expect(openSpy).toHaveBeenCalledWith('/api/projects/p1/exports/task-1/download', '_blank');
    openSpy.mockRestore();
  });
});
