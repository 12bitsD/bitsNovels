import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProjectSettingsPage from '../components/ProjectSettingsPage';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';
import { client } from '../../../api/client';

const renderWithRouter = (ui: React.ReactElement, initialPath = '/projects/1/settings') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/projects/:projectId/settings" element={ui} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProjectSettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    const realGET = client.GET.bind(client) as typeof client.GET;
    const realPATCH = client.PATCH.bind(client) as typeof client.PATCH;

    vi.spyOn(client, 'GET').mockImplementation((path, options) => {
      if (typeof path === 'string' && path.includes('/ai-config')) {
        return Promise.resolve({
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
              parseDepth: { value: 'deep', source: 'system' },
            },
          },
          error: undefined,
          response: new Response(),
        });
      }
      return realGET(path, options);
    });

    vi.spyOn(client, 'PATCH').mockImplementation((path, options) => {
      if (typeof path === 'string' && path.includes('/ai-config')) {
        const body = (options as { body?: { model?: string; temperature?: number } } | undefined)?.body;
        return Promise.resolve({
          data: {
            projectConfig: {
              projectId: '1',
              model: body?.model ?? 'kimi2.5',
              temperature: body?.temperature ?? 0.7,
              useGlobalAsDefault: true,
              updatedAt: '2026-04-16T12:30:00.000Z',
            },
            resolvedConfig: {
              model: { value: body?.model ?? 'kimi2.5', source: 'project', fallbackValue: 'gpt-4.1-mini', fallbackSource: 'global' },
              temperature: { value: body?.temperature ?? 0.7, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
              maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
              parseDepth: { value: 'deep', source: 'system' },
            },
          },
          error: undefined,
          response: new Response(),
        });
      }
      return realPATCH(path, options);
    });
  });

  it('should render loading state initially', () => {
    renderWithRouter(<ProjectSettingsPage />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should render project settings with basic info tab by default', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/项目设置/)).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /基本信息/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /写作目标/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /AI 配置/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /备份与恢复/ })).toBeInTheDocument();

    expect(screen.getByLabelText(/项目名称/)).toBeInTheDocument();
    expect(screen.getByLabelText(/类型/)).toBeInTheDocument();
    expect(screen.getByLabelText(/题材标签/)).toBeInTheDocument();
    expect(screen.getByLabelText(/简介/)).toBeInTheDocument();
  });

  it('should display readonly project stats', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/卷数/)).toBeInTheDocument();
    });

    expect(screen.getByText('卷数')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('章数')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('总字数')).toBeInTheDocument();
    expect(screen.getByText('15,000')).toBeInTheDocument();
    expect(screen.getByText('知识库条目')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('should validate project name like US-1.3 with debounce', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/项目名称/)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/项目名称/);

    // Test empty name debounce validation
    fireEvent.change(nameInput, { target: { value: '   ' } });
    await waitFor(() => {
      expect(screen.getByText(/项目名称不能为空/)).toBeInTheDocument();
    }, { timeout: 1000 });

    // Test max length debounce validation
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });
    await waitFor(() => {
      expect(screen.getByText(/不能超过 50 个字符/)).toBeInTheDocument();
    }, { timeout: 1000 });

    // Test valid name clears error
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    await waitFor(() => {
      expect(screen.queryByText(/不能超过 50 个字符/)).not.toBeInTheDocument();
      expect(screen.queryByText(/项目名称不能为空/)).not.toBeInTheDocument();
    }, { timeout: 1000 });

    // The old test clicked "保存更改", let's test that too
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /保存更改/ }));
    expect(await screen.findByText(/项目名称不能为空/)).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });
    fireEvent.click(screen.getByRole('button', { name: /保存更改/ }));
    expect(await screen.findByText(/不能超过 50 个字符/)).toBeInTheDocument();
  });

  it('should switch tabs correctly', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /基本信息/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /写作目标/ }));
    expect(await screen.findByText(/每日写作目标/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /AI 配置/ }));
    expect(await screen.findByLabelText(/^模型选择$/)).toBeInTheDocument();
    expect(screen.getByText(/当前页仅作用于本项目/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /备份与恢复/ }));
    expect(await screen.findByRole('button', { name: '导出项目' })).toBeInTheDocument();
  });

  it('should handle form fields updates', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/类型/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/类型/), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/题材标签/), { target: { value: 'sci-fi, drama' } });
    fireEvent.change(screen.getByLabelText(/简介/), { target: { value: 'New description' } });

    fireEvent.click(screen.getByRole('tab', { name: /写作目标/ }));
    await waitFor(() => expect(screen.getByLabelText(/每日目标字数/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/每日目标字数/), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText(/总字数目标/), { target: { value: '200000' } });

    fireEvent.click(screen.getByRole('tab', { name: /AI 配置/ }));
    await waitFor(() => expect(screen.getByLabelText(/^模型选择$/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/^模型选择$/), { target: { value: 'doubao-pro-32k' } });
    fireEvent.change(screen.getByLabelText(/^Temperature$/), { target: { value: '0.45' } });
  });

  it('should close archive modal when cancel is clicked', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /归档项目/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /归档项目/ }));

    expect(await screen.findByText(/确定要归档项目/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取消/ }));

    await waitFor(() => {
      expect(screen.queryByText(/确定要归档项目/)).not.toBeInTheDocument();
    });
  });

  it('should show success toast after saving basic info', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/项目名称/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'Updated Novel Name' } });
    fireEvent.click(screen.getByRole('button', { name: /保存更改/ }));

    await waitFor(() => {
      expect(screen.getByText(/项目信息已更新/)).toBeInTheDocument();
    });
  });

  it('should show danger zone at bottom of page', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/危险操作区/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /归档项目/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /删除项目/ })).toBeInTheDocument();
  });

  it('should show archive confirmation and handle archive', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /归档项目/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /归档项目/ }));

    expect(await screen.findByText(/确定要归档项目/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /确认归档/ })).toBeInTheDocument();
  });

  it('should show delete confirmation with name input requirement', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /删除项目/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /删除项目/ }));

    expect(await screen.findByText(/输入项目名称以确认删除/)).toBeInTheDocument();
    expect(screen.getByLabelText(/项目名称确认/)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /确认删除/ });
    expect(deleteBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/项目名称确认/), { target: { value: 'Wrong Name' } });
    expect(deleteBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/项目名称确认/), { target: { value: 'The Great Novel' } });
    expect(deleteBtn).not.toBeDisabled();
  });

  it('should delete project and redirect to dashboard', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /删除项目/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /删除项目/ }));

    await waitFor(() => {
      expect(screen.getByLabelText(/项目名称确认/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/项目名称确认/), { target: { value: 'The Great Novel' } });
    fireEvent.click(screen.getByRole('button', { name: /确认删除/ }));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('should handle API error when saving', async () => {
    server.use(
      http.patch('/api/projects/1', () => {
        return new HttpResponse(JSON.stringify({ detail: '更新失败' }), { status: 500 });
      })
    );

    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/项目名称/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: /保存更改/ }));

    await waitFor(() => {
      expect(screen.getByText(/更新失败/)).toBeInTheDocument();
    });
  });

  it('should close modal when cancel is clicked', async () => {
    renderWithRouter(<ProjectSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /删除项目/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /删除项目/ }));

    await waitFor(() => {
      expect(screen.getByLabelText(/项目名称确认/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /取消/ }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/项目名称确认/)).not.toBeInTheDocument();
    });
  });
});
