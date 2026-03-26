import { XCircleIcon } from 'lucide-react';

interface FormInputProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

export function FormInput({
  id, label, type = 'text', value, onChange,
  placeholder, error, required, disabled, hint, className = ''
}: FormInputProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-light mb-1.5">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`input-base ${error ? 'border-error focus:ring-error/20 focus:border-error' : ''}`}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={!!error}
      />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-light">{hint}</p>}
      {error && (
        <p id={`${id}-error`} aria-live="polite" className="mt-1 text-sm text-error flex items-center gap-1">
          <XCircleIcon size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
