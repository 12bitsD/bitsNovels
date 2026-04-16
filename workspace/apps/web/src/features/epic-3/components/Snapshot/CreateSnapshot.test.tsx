import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CreateSnapshot } from './CreateSnapshot';

describe('CreateSnapshot', () => {
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    mockOnCreate.mockClear();
  });

  it('should render create snapshot button', () => {
    render(<CreateSnapshot onCreate={mockOnCreate} />);

    expect(screen.getByRole('button', { name: '创建快照' })).toBeInTheDocument();
  });

  it('should open modal when button is clicked', () => {
    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

    expect(screen.getByText('创建版本快照')).toBeInTheDocument();
    expect(screen.getByLabelText('标签/备注（可选）')).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', () => {
    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));
    expect(screen.getByText('创建版本快照')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(screen.queryByText('创建版本快照')).not.toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));
    expect(screen.getByText('创建版本快照')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));

    expect(screen.queryByText('创建版本快照')).not.toBeInTheDocument();
  });

  it('should close modal when overlay is clicked', () => {
    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));
    expect(screen.getByText('创建版本快照')).toBeInTheDocument();

    const overlay = screen.getByText('创建版本快照').closest('.fixed')?.querySelector('.absolute.inset-0');
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(screen.queryByText('创建版本快照')).not.toBeInTheDocument();
  });

  it('should call onCreate with label when submitted', async () => {
    mockOnCreate.mockResolvedValueOnce(undefined);

    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

    const textarea = screen.getByLabelText('标签/备注（可选）');
    fireEvent.change(textarea, { target: { value: 'My snapshot label' } });

    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.includes('创建快照') && b.className?.includes('bg-[#8B6914]'));
    await act(async () => {
      fireEvent.click(submitButton!);
    });

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith('My snapshot label');
    });
  });

  it('should call onCreate without label when submitted with empty label', async () => {
    mockOnCreate.mockResolvedValueOnce(undefined);

    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.includes('创建快照') && b.className?.includes('bg-[#8B6914]'));
    await act(async () => {
      fireEvent.click(submitButton!);
    });

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith(undefined);
    });
  });

  it('should trim label before submitting', async () => {
    mockOnCreate.mockResolvedValueOnce(undefined);

    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

    const textarea = screen.getByLabelText('标签/备注（可选）');
    fireEvent.change(textarea, { target: { value: '  Test label  ' } });

    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.includes('创建快照') && b.className?.includes('bg-[#8B6914]'));
    await act(async () => {
      fireEvent.click(submitButton!);
    });

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith('Test label');
    });
  });

  it('should show error when label exceeds 100 characters', async () => {
    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

    const textarea = screen.getByLabelText('标签/备注（可选）');
    fireEvent.change(textarea, { target: { value: 'a'.repeat(101) } });

    expect(screen.getByText('超过字数限制')).toBeInTheDocument();

    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.includes('创建快照') && b.className?.includes('bg-[#8B6914]'));
    await act(async () => {
      fireEvent.click(submitButton!);
    });

    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('should show error message when onCreate fails', async () => {
    mockOnCreate.mockRejectedValueOnce(new Error('Failed to create snapshot'));

    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.includes('创建快照') && b.className?.includes('bg-[#8B6914]'));
    await act(async () => {
      fireEvent.click(submitButton!);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to create snapshot')).toBeInTheDocument();
    });
  });

  it('should disable button when disabled prop is true', () => {
    render(<CreateSnapshot onCreate={mockOnCreate} disabled={true} />);

    expect(screen.getByRole('button', { name: '创建快照' })).toBeDisabled();
  });

  it('should show loading state while creating', async () => {
    let resolvePromise: (value?: unknown) => void;
    mockOnCreate.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.includes('创建快照') && b.className?.includes('bg-[#8B6914]'));
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText('创建中...')).toBeInTheDocument();
    });

    await act(async () => {
      resolvePromise();
    });
  });

  it('should close modal on Escape key', () => {
    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));
    expect(screen.getByText('创建版本快照')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText('标签/备注（可选）'), { key: 'Escape' });

    expect(screen.queryByText('创建版本快照')).not.toBeInTheDocument();
  });

  it('should show character count', () => {
    render(<CreateSnapshot onCreate={mockOnCreate} />);

    fireEvent.click(screen.getByRole('button', { name: '创建快照' }));

    const textarea = screen.getByLabelText('标签/备注（可选）');
    fireEvent.change(textarea, { target: { value: 'Hello' } });

    expect(screen.getByText('5/100 字')).toBeInTheDocument();
  });
});
