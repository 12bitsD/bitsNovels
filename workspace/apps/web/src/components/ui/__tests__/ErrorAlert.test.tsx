import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorAlert } from '../ErrorAlert';

describe('ErrorAlert', () => {
  it('renders error message with aria-live="polite"', () => {
    render(<ErrorAlert error="登录失败，请检查邮箱和密码" />);
    const el = screen.getByText('登录失败，请检查邮箱和密码');
    expect(el.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows dismiss button when onDismiss provided', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorAlert error="错误" onDismiss={onDismiss} />);
    const btn = screen.getByRole('button', { name: '关闭提示' });
    await user.click(btn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does not show dismiss button when onDismiss not provided', () => {
    render(<ErrorAlert error="错误" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(<ErrorAlert error="错误" className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
