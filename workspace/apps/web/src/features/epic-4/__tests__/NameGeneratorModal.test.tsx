import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NameGeneratorModal } from '../components/NameGeneratorModal';
import * as aiClient from '../api/aiClient';

vi.mock('../api/aiClient');

describe('NameGeneratorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 10 generated candidates and supports fill callback', async () => {
    const onFill = vi.fn();
    vi.mocked(aiClient.createAITask).mockResolvedValue({
      taskId: 'task-1',
      task: {
        id: 'task-1',
        projectId: 'project-1',
        type: 'name_gen',
        status: 'completed',
        configSnapshot: {},
        contextBlocks: [],
        createdAt: '2026-04-16T00:00:00Z',
        updatedAt: '2026-04-16T00:00:00Z',
      },
    });
    vi.mocked(aiClient.streamAITask).mockImplementation(async (_taskId, onEvent) => {
      onEvent({
        type: 'task.completed',
        taskId: 'task-1',
        result: {
          taskId: 'task-1',
          type: 'name_gen',
          status: 'done',
          payloadType: 'names',
          payload: {
            names: ['沈砚', '顾澜', '林朔', '闻舟', '迟月', '陆辞', '唐野', '苏砚', '江临', '谢宁'],
          },
          createdAt: '2026-04-16T00:00:00Z',
        },
      });
    });

    render(
      <NameGeneratorModal
        isOpen
        onClose={vi.fn()}
        projectId="project-1"
        nameType="character"
        onFill={onFill}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '生成 10 个候选' }));

    await waitFor(() => {
      expect(screen.getByText('沈砚')).toBeInTheDocument();
      expect(screen.getByText('谢宁')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('button', { name: '填入' })).toHaveLength(10);
    fireEvent.click(screen.getAllByRole('button', { name: '填入' })[0]!);
    expect(onFill).toHaveBeenCalledWith('沈砚');
  });
});
