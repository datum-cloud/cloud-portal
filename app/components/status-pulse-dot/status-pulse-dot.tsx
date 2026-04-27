import { cn } from '@datum-cloud/datum-ui/utils';

type StatusPulseDotVariant = 'active' | 'offline';

const variantStyles: Record<StatusPulseDotVariant, { dot: string; ring: string }> = {
  active: {
    dot: 'bg-green-500',
    ring: 'shadow-[0_0_0_3px_rgba(34,197,94,0.4)]',
  },
  offline: {
    dot: 'bg-red-500',
    ring: 'shadow-[0_0_0_3px_rgba(239,68,68,0.4)]',
  },
};

export interface StatusPulseDotProps {
  variant: StatusPulseDotVariant;
  className?: string;
}

export function StatusPulseDot({ variant, className }: StatusPulseDotProps) {
  const { dot, ring } = variantStyles[variant];
  return (
    <div
      className={cn('relative flex size-6 items-center justify-center', className)}
      role="img"
      aria-label={variant === 'active' ? 'Active' : 'Offline'}>
      <span className={cn('size-2.5 rounded-full', ring)} />
      <span className={cn('absolute size-2.5 animate-pulse rounded-full', dot)} />
    </div>
  );
}
