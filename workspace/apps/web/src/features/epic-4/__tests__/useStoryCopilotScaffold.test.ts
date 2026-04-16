import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '../../../api/client';
import { useStoryCopilotScaffold } from '../hooks/useStoryCopilotScaffold';

describe('useStoryCopilotScaffold', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads sessions when opened', async () => {
    vi.spyOn(client, 'GET').mockResolvedValueOnce({
      data: {
        sessions: [
          {
            id: 'copilot-session-1',
            projectId: 'project-a-1',
            mode: 'worldbuild',
            title: '世界观设定',
            status: 'active',
            createdAt: '2026-04-16T09:00:00Z',
            updatedAt: '2026-04-16T09:00:00Z',
          },
        ],
      },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useStoryCopilotScaffold('project-a-1'));

    act(() => {
      result.current.open();
    });

    await waitFor(() => {
      expect(result.current.sessionsLoading).toBe(false);
    });

    expect(client.GET).toHaveBeenCalledWith(
      '/api/projects/project-a-1/copilot/sessions?mode=worldbuild&limit=10',
    );
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0]?.mode).toBe('worldbuild');
    expect(result.current.sessionsError).toBe('');
  });

  it('reloads sessions when switching mode while open', async () => {
    vi.spyOn(client, 'GET')
      .mockResolvedValueOnce({
        data: { sessions: [] },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: {
          sessions: [
            {
              id: 'copilot-session-2',
              projectId: 'project-a-1',
              mode: 'plot_derive_lite',
              title: '剧情推演',
              status: 'active',
              createdAt: '2026-04-16T09:00:00Z',
              updatedAt: '2026-04-16T09:00:00Z',
            },
          ],
        },
        error: undefined,
        response: new Response(),
      });

    const { result } = renderHook(() => useStoryCopilotScaffold('project-a-1'));

    act(() => {
      result.current.open();
    });

    await waitFor(() => {
      expect(result.current.sessionsLoading).toBe(false);
    });

    act(() => {
      result.current.setActiveMode('plot_derive_lite');
    });

    await waitFor(() => {
      expect(result.current.sessions[0]?.mode).toBe('plot_derive_lite');
    });

    expect(client.GET).toHaveBeenNthCalledWith(
      2,
      '/api/projects/project-a-1/copilot/sessions?mode=plot_derive_lite&limit=10',
    );
  });

  it('surfaces load failures', async () => {
    vi.spyOn(client, 'GET').mockResolvedValueOnce({
      data: undefined,
      error: { detail: '加载失败' },
      response: new Response('', { status: 500 }),
    });

    const { result } = renderHook(() => useStoryCopilotScaffold('project-a-1'));

    act(() => {
      result.current.open();
    });

    await waitFor(() => {
      expect(result.current.sessionsLoading).toBe(false);
    });

    expect(result.current.sessionsError).toBe('加载失败');
    expect(result.current.sessions).toEqual([]);
  });
});

