import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  'data-testid'?: string;
}

export function Card({ children, className = '', onClick, 'data-testid': testId }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-md border border-border/50 shadow-sm transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : ''} ${className}`} 
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <div className={`px-6 pt-6 pb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: CardProps) {
  return <h3 className={`text-xl font-bold text-ink ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardProps) {
  return <div className={`px-6 pb-6 pt-2 flex items-center ${className}`}>{children}</div>;
}