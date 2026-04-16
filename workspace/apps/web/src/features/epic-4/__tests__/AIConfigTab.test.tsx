import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '../../../api/client';
import { AIConfigTab } from '../components/AIConfigTab';

describe('AIConfigTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Epic 4 AI config fields and source badges', async () => {
    vi.spyOn(client, 'GET').mockResolvedValue({
      data: {
        projectConfig: {
          projectId: '1',
          model: 'kimi2.5',
          temperature: 0.7,
          useGlobalAsDefault: true,
          updatedAt: '2026-04-16T12:00:00.000Z',
        },
        resolvedConfig: {
          model: { value: 'kimi2.5', source: 'project', fallbackValue: 'kimi2.5', fallbackSource: 'system' },
          temperature: { value: 0.7, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
          maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
          parseDepth: { value: 'standard', source: 'system' },
        },
      },
      error: undefined,
      response: new Response(),
    });

    render(<AIConfigTab projectId="1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('模型选择')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Temperature')).toBeInTheDocument();
    expect(screen.getByLabelText('单次生成最大长度')).toBeInTheDocument();
    expect(screen.getByLabelText('解析深度')).toBeInTheDocument();
    expect(screen.getByText('当前页仅作用于本项目，未设置时将继承全局偏好或系统默认。')).toBeInTheDocument();
    expect(screen.getAllByText('项目设置').length).toBeGreaterThan(0);
    expect(screen.getAllByText('全局偏好').length).toBeGreaterThan(0);
    expect(screen.getByText('系统默认')).toBeInTheDocument();
  });

  it('resets overridden fields and submits null payload to follow global config', async () => {
    let requestBody: unknown = null;

    vi.spyOn(client, 'GET').mockResolvedValue({
      data: {
        projectConfig: {
          projectId: '1',
          model: 'kimi2.5',
          temperature: 0.7,
          useGlobalAsDefault: true,
          updatedAt: '2026-04-16T12:00:00.000Z',
        },
        resolvedConfig: {
          model: { value: 'kimi2.5', source: 'project', fallbackValue: 'gpt-4.1-mini', fallbackSource: 'global' },
          temperature: { value: 0.7, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
          maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
          parseDepth: { value: 'standard', source: 'system' },
        },
      },
      error: undefined,
      response: new Response(),
    });

    vi.spyOn(client, 'PATCH').mockImplementation(async (_path: string, options?: { body?: unknown }) => {
      requestBody = options?.body ?? null;
      return {
        data: {
          projectConfig: {
            projectId: '1',
            temperature: 0.7,
            useGlobalAsDefault: true,
            updatedAt: '2026-04-16T12:30:00.000Z',
          },
          resolvedConfig: {
            model: { value: 'gpt-4.1-mini', source: 'global', fallbackValue: 'gpt-4.1', fallbackSource: 'system' },
            temperature: { value: 0.7, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
            maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
            parseDepth: { value: 'deep', source: 'system' },
          },
        },
        error: undefined,
        response: new Response(),
      };
    });

    render(<AIConfigTab projectId="1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重置模型选择为跟随全局' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '重置模型选择为跟随全局' }));
    fireEvent.click(screen.getByRole('button', { name: '保存 AI 配置' }));

    await waitFor(() => {
      expect(screen.getByText('AI 配置已更新')).toBeInTheDocument();
    });

    expect(requestBody).toMatchObject({
      model: null,
    });
  });

  it('shows API errors inside the tab', async () => {
    vi.spyOn(client, 'GET').mockResolvedValueOnce({
      data: {
        projectConfig: {
          projectId: '1',
          model: 'kimi2.5',
          temperature: 0.7,
          useGlobalAsDefault: true,
          updatedAt: '2026-04-16T12:00:00.000Z',
        },
        resolvedConfig: {
          model: { value: 'kimi2.5', source: 'project', fallbackValue: 'gpt-4.1-mini', fallbackSource: 'global' },
          temperature: { value: 0.7, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
          maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
          parseDepth: { value: 'standard', source: 'system' },
        },
      },
      error: undefined,
      response: new Response(),
    });
    vi.spyOn(client, 'PATCH').mockResolvedValueOnce({
      data: undefined,
      error: { detail: 'AI 服务暂不可用' },
      response: new Response('', { status: 500 }),
    });

    render(<AIConfigTab projectId="1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Temperature')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Temperature'), {
      target: { value: '0.4' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存 AI 配置' }));

    await waitFor(() => {
      expect(screen.getByText('AI 服务暂不可用')).toBeInTheDocument();
    });
  });
});
