import { LoadingButton } from './LoadingButton';

interface SuccessViewProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function SuccessView({
  icon, title, description, action, secondaryAction, className = ''
}: SuccessViewProps) {
  return (
    <div className={`text-center py-4 ${className}`}>
      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-success">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
      {description && <p className="text-ink-light text-sm mb-6">{description}</p>}
      {action && (
        <LoadingButton type="button" onClick={action.onClick} loading={false} className="mt-2">
          {action.label}
        </LoadingButton>
      )}
      {secondaryAction && (
        <button onClick={secondaryAction.onClick} className="mt-3 text-sm text-amber hover:text-amber-dark transition-colors">
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
