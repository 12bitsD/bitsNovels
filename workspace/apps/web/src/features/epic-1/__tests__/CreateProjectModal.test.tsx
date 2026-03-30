import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreateProjectModal from '../components/CreateProjectModal';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('CreateProjectModal', () => {
  it('should render step 1 with required fields', () => {
    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    
    expect(screen.getByText(/基本信息/)).toBeInTheDocument();
    expect(screen.getByLabelText(/项目名称/)).toBeInTheDocument();
    expect(screen.getByLabelText(/类型/)).toBeInTheDocument();
    expect(screen.getByLabelText(/题材标签/)).toBeInTheDocument();
    expect(screen.getByLabelText(/简介/)).toBeInTheDocument();
  });

  it('should validate name length and prevent next step if empty', async () => {
    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    
    const nextBtn = screen.getByRole('button', { name: /下一步/i });
    fireEvent.click(nextBtn);
    
    // Should not move to step 2
    expect(screen.getByText(/基本信息/)).toBeInTheDocument();
    expect(screen.getByText(/项目名称不能为空/i)).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/项目名称/);
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });
    fireEvent.click(nextBtn);
    expect(screen.getByText(/不能超过 50 个字符/i)).toBeInTheDocument();
  });

  it('should navigate through steps and submit on step 3', async () => {
    let requestBody: unknown;
    server.use(
      http.post('/api/projects', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ id: 'new-id' }, { status: 201 });
      })
    );

    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    
    // Step 1
    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'My New Novel' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));

    // Step 2
    expect(await screen.findByText(/项目结构/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));

    // Step 3
    expect(await screen.findByText(/知识库初始化/)).toBeInTheDocument();
    
    // Click Skip/Create
    fireEvent.click(screen.getByRole('button', { name: /跳过并创建/i }));

    await waitFor(() => {
      expect(requestBody).toEqual({
        name: 'My New Novel',
        type: 'novel',
        tags: []
      });
    });
  });

  it('should show error when project name conflicts', async () => {
    server.use(
      http.post('/api/projects', () => {
        return new HttpResponse(JSON.stringify({ detail: '已有同名项目，请修改名称' }), { status: 409 });
      })
    );

    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    
    // Fill required
    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'Conflict Project' } });
    
    // Skip to end
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    fireEvent.click(screen.getByRole('button', { name: /跳过并创建/i }));

    expect(await screen.findByText(/已有同名项目，请修改名称/)).toBeInTheDocument();
  });

  it('should go back from step 2 to step 1', async () => {
    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    
    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'My Novel' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    expect(await screen.findByText(/项目结构/)).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /返回上一步/i }));
    expect(await screen.findByText(/基本信息/)).toBeInTheDocument();
  });

  it('should select template structure mode', async () => {
    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    
    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'My Novel' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    const templateOption = screen.getByText(/从模板开始/i).closest('div');
    fireEvent.click(templateOption!);
  });

  it('should show error when API returns non-409 error', async () => {
    server.use(
      http.post('/api/projects', () => {
        return new HttpResponse(JSON.stringify({ detail: '服务器内部错误' }), { status: 500 });
      })
    );

    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    
    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: 'Test Project' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    fireEvent.click(screen.getByRole('button', { name: /跳过并创建/i }));

    await waitFor(() => {
      expect(screen.getByText(/服务器内部错误/i)).toBeInTheDocument();
    });
  });

  it('should show validation error when name is only whitespace', async () => {
    renderWithRouter(<CreateProjectModal onClose={() => {}} />);
    
    fireEvent.change(screen.getByLabelText(/项目名称/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    expect(await screen.findByText(/项目名称不能为空/i)).toBeInTheDocument();
  });
});
