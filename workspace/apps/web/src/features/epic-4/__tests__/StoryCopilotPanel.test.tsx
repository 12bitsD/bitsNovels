import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '../../../api/client';
import { StoryCopilotPanel } from '../components/StoryCopilotPanel';
import type { StoryCopilotSession } from '../types';

vi.mock('../../../api/client', async () => {
  const actual = await vi.importActual('../../../api/client');
  return {
    ...actual,
    client: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
  };
});

const sessions: StoryCopilotSession[] = [
  {
    id: 'copilot-session-1',
    projectId: 'project-1',
    mode: 'worldbuild',
    title: '世界观会话',
    status: 'active',
    createdAt: '2026-04-16T00:00:00Z',
    updatedAt: '2026-04-16T00:00:00Z',
  },
];

describe('StoryCopilotPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads replay after selecting a session', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({
      data: {
        session: sessions[0],
        events: [
          {
            id: 'evt-1',
            type: 'message',
            createdAt: '2026-04-16T00:00:00Z',
            message: { id: 'msg-1', role: 'user', content: '你好' },
          },
        ],
      },
      error: undefined,
    } as never);

    render(
      <StoryCopilotPanel
        projectId="project-1"
        isOpen
        onClose={vi.fn()}
        activeMode="worldbuild"
        onModeChange={vi.fn()}
        state={{ headline: '设定', description: 'desc', cards: [] }}
        sessions={sessions}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /世界观会话/ }));

    await waitFor(() => {
      expect(client.GET).toHaveBeenCalledWith('/api/copilot/sessions/copilot-session-1');
    });
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('creates session then sends turn request', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({
      data: {
        session: {
          ...sessions[0],
          id: 'copilot-session-new',
        },
        events: [],
      },
      error: undefined,
    } as never);

    vi.mocked(client.POST)
      .mockResolvedValueOnce({
        data: {
          session: {
            ...sessions[0],
            id: 'copilot-session-new',
          },
        },
        error: undefined,
      } as never)
      .mockResolvedValueOnce({
        data: {
          events: [
            {
              id: 'evt-user',
              type: 'message',
              createdAt: '2026-04-16T00:00:00Z',
              message: { id: 'msg-user', role: 'user', content: '帮我设定帝国' },
            },
            {
              id: 'evt-assistant',
              type: 'message',
              createdAt: '2026-04-16T00:00:01Z',
              message: { id: 'msg-assistant', role: 'assistant', content: '好的，我给你两条草稿。' },
            },
          ],
        },
        error: undefined,
      } as never);

    render(
      <StoryCopilotPanel
        projectId="project-1"
        chapterId="chapter-1"
        isOpen
        onClose={vi.fn()}
        activeMode="worldbuild"
        onModeChange={vi.fn()}
        state={{ headline: '设定', description: 'desc', cards: [] }}
        sessions={[]}
        reloadSessions={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('输入你的问题或指令…'), {
      target: { value: '帮我设定帝国' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    await waitFor(() => {
      expect(client.POST).toHaveBeenNthCalledWith(
        1,
        '/api/projects/project-1/copilot/sessions',
        expect.objectContaining({
          body: expect.objectContaining({ mode: 'worldbuild' }),
        }),
      );
    });

    await waitFor(() => {
      expect(client.POST).toHaveBeenNthCalledWith(
        2,
        '/api/copilot/sessions/copilot-session-new/turn',
        {
          body: { content: '帮我设定帝国', chapterId: 'chapter-1' },
        },
      );
    });

    expect(screen.getByText('好的，我给你两条草稿。')).toBeInTheDocument();
  });
});
