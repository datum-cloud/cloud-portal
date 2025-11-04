import { cn } from '@shadcn/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

/**
 * Datum Badge Component
 * Extends shadcn Badge with Datum-specific variants: sunglow, butter
 * Also customizes secondary variant with Datum brand colors
 */

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-sidebar text-primary dark:bg-card dark:text-sidebar-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        sunglow: 'border-orange bg-orange text-white hover:bg-orange/80',
        butter:
          'border-muted bg-muted/20 text-primary hover:bg-muted/80 dark:border-muted dark:bg-muted/20 dark:text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
