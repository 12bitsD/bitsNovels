import { render, screen } from '@testing-library/react';
import { LoadingButton } from '../LoadingButton';

describe('LoadingButton', () => {
  it('shows loading state with spinner and loadingText', () => {
    render(<LoadingButton loading loadingText="登录中...">登录</LoadingButton>);
    expect(screen.getByText('登录中...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows children when not loading', () => {
    render(<LoadingButton loading={false}>登录</LoadingButton>);
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('disables button when loading even if disabled prop is false', () => {
    render(<LoadingButton loading={true} disabled={false}>登录</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('uses variant primary by default', () => {
    const { container } = render(<LoadingButton loading={false}>Test</LoadingButton>);
    expect(container.querySelector('button')).toHaveClass('btn-primary');
  });

  it('uses variant secondary when specified', () => {
    const { container } = render(<LoadingButton loading={false} variant="secondary">Test</LoadingButton>);
    expect(container.querySelector('button')).toHaveClass('btn-secondary');
  });

  it('forwards className', () => {
    const { container } = render(<LoadingButton loading={false} className="mt-4">Test</LoadingButton>);
    expect(container.querySelector('button')).toHaveClass('mt-4');
  });

  it('uses type=submit by default', () => {
    render(<LoadingButton loading={false}>Test</LoadingButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('uses type=button when specified', () => {
    render(<LoadingButton loading={false} type="button">Test</LoadingButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
