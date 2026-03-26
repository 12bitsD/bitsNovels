import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuccessView } from '../SuccessView';
import { CheckCircle } from 'lucide-react';

describe('SuccessView', () => {
  const defaultProps = {
    icon: <CheckCircle data-testid="icon" size={32} />,
    title: '注册成功',
    description: '请前往邮箱验证您的账号',
  };

  it('renders title and description', () => {
    render(<SuccessView {...defaultProps} />);
    expect(screen.getByText('注册成功')).toBeInTheDocument();
    expect(screen.getByText('请前往邮箱验证您的账号')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<SuccessView {...defaultProps} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders primary action button as type=button', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<SuccessView {...defaultProps} action={{ label: '去登录', onClick: onAction }} />);
    const btn = screen.getByRole('button', { name: '去登录' });
    expect(btn).toHaveAttribute('type', 'button');
    await user.click(btn);
    expect(onAction).toHaveBeenCalled();
  });

  it('renders secondary action as text link', () => {
    const onSecondary = vi.fn();
    render(<SuccessView {...defaultProps} secondaryAction={{ label: '重新发送', onClick: onSecondary }} />);
    expect(screen.getByText('重新发送')).toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(<SuccessView {...defaultProps} className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });

  it('does not render action when not provided', () => {
    render(<SuccessView {...defaultProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
