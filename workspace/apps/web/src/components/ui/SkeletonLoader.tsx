type SkeletonVariant = 'text' | 'card' | 'avatar' | 'button';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
}

const sizes: Record<SkeletonVariant, string> = {
  text:    'h-4 w-full',
  card:    'h-32 w-full',
  avatar:  'h-12 w-12 rounded-full',
  button:  'h-10 w-24',
};

export function SkeletonLoader({
  variant = 'text', width, height, className = ''
}: SkeletonLoaderProps) {
  return (
    <div
      role="presentation"
      className={`animate-pulse bg-amber-light/30 rounded ${sizes[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
