import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormInput } from '../FormInput';

describe('FormInput', () => {
  it('renders label and input', () => {
    render(<FormInput id="email" label="邮箱" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
  });

  it('shows error message with aria-live', () => {
    render(<FormInput id="email" label="邮箱" value="" onChange={() => {}} error="邮箱格式不正确" />);
    const errorEl = screen.getByText('邮箱格式不正确');
    expect(errorEl).toHaveAttribute('aria-live', 'polite');
  });

  it('connects aria-describedby to error', () => {
    render(<FormInput id="email" label="邮箱" value="" onChange={() => {}} error="错误" />);
    const input = screen.getByLabelText('邮箱');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('calls onChange on each keystroke', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormInput id="email" label="邮箱" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('邮箱'), 'ab');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('shows hint when provided and no error', () => {
    render(<FormInput id="email" label="邮箱" value="" onChange={() => {}} hint="用于找回密码" />);
    expect(screen.getByText('用于找回密码')).toBeInTheDocument();
  });

  it('does not show hint when error is present', () => {
    render(<FormInput id="email" label="邮箱" value="" onChange={() => {}} hint="hint text" error="error text" />);
    expect(screen.queryByText('hint text')).not.toBeInTheDocument();
  });
});
