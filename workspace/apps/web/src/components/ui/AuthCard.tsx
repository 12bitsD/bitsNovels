interface AuthCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({
  icon, title, description, children, footer, className = ''
}: AuthCardProps) {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-4 font-sans text-ink">
      <div
        className={`bg-white/80 backdrop-blur-xl p-10 rounded-xl border border-white/60 max-w-md w-full animate-in fade-in zoom-in-95 duration-500 ${className}`}
        style={{ boxShadow: 'var(--shadow-card), var(--shadow-inner-light)' }}
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber/20 shadow-sm">
            {icon}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-ink-light text-sm mt-2">{description}</p>}
        </div>
        {children}
        {footer && <div className="mt-8">{footer}</div>}
      </div>
    </div>
  );
}
