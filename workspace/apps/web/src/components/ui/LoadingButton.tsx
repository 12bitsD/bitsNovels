import { Loader2Icon } from 'lucide-react';

interface LoadingButtonProps {
  children: React.ReactNode;
  loading: boolean;
  loadingText?: string;
  type?: 'submit' | 'button';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function LoadingButton({
  children, loading, loadingText = '加载中...',
  type = 'submit', variant = 'primary', disabled, onClick, className = ''
}: LoadingButtonProps) {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClass} ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2Icon size={16} className="animate-spin" />
          {loadingText}
        </span>
      ) : children}
    </button>
  );
}
