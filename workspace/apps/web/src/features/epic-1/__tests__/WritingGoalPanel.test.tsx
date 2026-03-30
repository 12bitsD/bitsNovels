import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WritingGoalPanel } from '../components/WritingGoalPanel';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

describe('WritingGoalPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<WritingGoalPanel projectId="1" />);
    expect(screen.getByText(/加载中.../)).toBeInTheDocument();
  });

  it('should render input fields after loading', async () => {
    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/总字数目标/)).toBeInTheDocument();
    expect(screen.getByLabelText(/截止日期/)).toBeInTheDocument();
  });

  it('should validate daily target range', async () => {
    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    const dailyInput = screen.getByLabelText(/每日字数目标/);
    fireEvent.change(dailyInput, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(screen.getByText(/每日字数需在/)).toBeInTheDocument();
    });
  });

  it('should validate daily target max', async () => {
    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    const dailyInput = screen.getByLabelText(/每日字数目标/);
    fireEvent.change(dailyInput, { target: { value: '60000' } });
    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(screen.getByText(/每日字数需在/)).toBeInTheDocument();
    });
  });

  it('should validate total target range', async () => {
    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    const totalInput = screen.getByLabelText(/总字数目标/);
    fireEvent.change(totalInput, { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(screen.getByText(/总字数需在/)).toBeInTheDocument();
    });
  });

  it('should validate total target max', async () => {
    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    const totalInput = screen.getByLabelText(/总字数目标/);
    fireEvent.change(totalInput, { target: { value: '6000000' } });
    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(screen.getByText(/总字数需在/)).toBeInTheDocument();
    });
  });

  it('should validate deadline must be in future', async () => {
    server.use(
      http.get('/api/projects/:projectId/goals', () => {
        return HttpResponse.json({});
      })
    );

    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    fireEvent.change(screen.getByLabelText(/截止日期/), { target: { value: yesterday } });
    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(screen.getByText(/截止日期必须晚于今天/)).toBeInTheDocument();
    });
  });

  it('should save goals with valid data', async () => {
    let requestBody: Record<string, unknown> = {};
    server.use(
      http.put('/api/projects/:projectId/goals', async ({ request }) => {
        requestBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(requestBody);
      })
    );

    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/每日字数目标/), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText(/总字数目标/), { target: { value: '500000' } });

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    fireEvent.change(screen.getByLabelText(/截止日期/), { target: { value: tomorrow } });

    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(requestBody).toEqual({
        dailyWordTarget: 3000,
        totalWordTarget: 500000,
        deadline: tomorrow
      });
    });
  });

  it('should show error when save fails', async () => {
    server.use(
      http.put('/api/projects/:projectId/goals', () => {
        return new HttpResponse(JSON.stringify({ detail: '保存失败' }), { status: 500 });
      })
    );

    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/每日字数目标/), { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(screen.getByText(/保存失败/)).toBeInTheDocument();
    });
  });

  it('should display writing stats after loading', async () => {
    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/今日进度/)).toBeInTheDocument();
    });

    expect(screen.getByText(/30天写作趋势/)).toBeInTheDocument();
    expect(screen.getByText(/总进度/)).toBeInTheDocument();
  });

  it('should show clear button when goals exist', async () => {
    server.use(
      http.get('/api/projects/:projectId/goals', () => {
        return HttpResponse.json({});
      })
    );

    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /清除/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/每日字数目标/), { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /清除/ })).toBeInTheDocument();
    });
  });

  it('should clear goals and reset fields', async () => {
    server.use(
      http.delete('/api/projects/:projectId/goals', () => {
        return HttpResponse.json({ message: 'Goals cleared' });
      })
    );

    render(<WritingGoalPanel projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/每日字数目标/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/每日字数目标/), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText(/总字数目标/), { target: { value: '500000' } });

    fireEvent.click(screen.getByRole('button', { name: /保存目标/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /清除/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /清除/ }));

    await waitFor(() => {
      expect((screen.getByLabelText(/每日字数目标/) as HTMLInputElement).value).toBe('');
    });
  });
});
