import { XCircleIcon, XIcon } from 'lucide-react';

interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorAlert({ error, onDismiss, className = '' }: ErrorAlertProps) {
  return (
    <div
      aria-live="polite"
      className={`bg-error/10 text-error p-3 rounded-md text-sm border border-error/20 shadow-sm flex items-start gap-2 ${className}`}
    >
      <XCircleIcon size={16} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{error}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-error/70 hover:text-error transition-colors" aria-label="关闭提示">
          <XIcon size={14} />
        </button>
      )}
    </div>
  );
}
