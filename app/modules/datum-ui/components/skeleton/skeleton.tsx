import { cn } from '@shadcn/lib/utils';
import { Skeleton as ShadcnSkeleton } from '@shadcn/ui/skeleton';
import * as React from 'react';

/**
 * Datum Skeleton component – extends shadcn Skeleton with Datum-specific styling.
 *
 * Wraps the shadcn Skeleton so you can add custom base styles here and pass
 * additional className for overrides. All standard div props are supported.
 *
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-48" />
 * <Skeleton className="h-8 w-full rounded-lg" />
 * ```
 */
const Skeleton = React.forwardRef<
  React.ComponentRef<typeof ShadcnSkeleton>,
  React.ComponentProps<typeof ShadcnSkeleton>
>(({ className, ...props }) => {
  return (
    <ShadcnSkeleton
      className={cn('bg-muted-foreground/10 animate-pulse rounded-md', className)}
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

export { Skeleton };
