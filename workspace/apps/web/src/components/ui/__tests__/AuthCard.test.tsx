import { render, screen } from '@testing-library/react';
import { AuthCard } from '../AuthCard';
import { PenLine } from 'lucide-react';

describe('AuthCard', () => {
  it('renders icon, title, description', () => {
    render(
      <AuthCard
        icon={<PenLine data-testid="icon" />}
        title="欢迎回来"
        description="登录您的账号"
      >
        <form>Form content</form>
      </AuthCard>
    );
    expect(screen.getByText('欢迎回来')).toBeInTheDocument();
    expect(screen.getByText('登录您的账号')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Form content')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <AuthCard icon={<PenLine />} title="Test" footer={<div data-testid="footer">Footer</div>}>
        Content
      </AuthCard>
    );
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('applies className to inner card', () => {
    const { container } = render(
      <AuthCard icon={<PenLine />} title="Test" className="custom-class">
        Content
      </AuthCard>
    );
    const cardDiv = container.querySelector('[class*="bg-white"]');
    expect(cardDiv).toHaveClass('custom-class');
  });

  it('does not render footer when not provided', () => {
    const { container } = render(
      <AuthCard icon={<PenLine />} title="Test">
        Content
      </AuthCard>
    );
    expect(container.querySelectorAll('[class*="mt-8"]')).toHaveLength(0);
  });
});
