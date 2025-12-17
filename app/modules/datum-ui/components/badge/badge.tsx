import { cn } from '@shadcn/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

/**
 * Datum Badge Component
 * Similar to Button component but with badge-specific styling
 * Supports types: primary, secondary, tertiary, quaternary, warning, danger, success
 * Supports themes: solid, outline, light
 */

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      type: {
        primary: '',
        secondary: '',
        tertiary: '',
        quaternary: '',
        info: '',
        warning: '',
        danger: '',
        success: '',
        muted: '',
      },
      theme: {
        solid: '',
        outline: 'border',
        light: 'border',
      },
    },
    compoundVariants: [
      // Primary badge variants
      {
        type: 'primary',
        theme: 'solid',
        className:
          'border-transparent bg-[var(--color-badge-primary)] text-[var(--color-badge-primary-foreground)]',
      },
      {
        type: 'primary',
        theme: 'outline',
        className:
          'border-[var(--color-badge-primary)] text-[var(--color-badge-primary)] dark:border-[var(--color-badge-primary)] dark:text-[var(--color-badge-primary)]',
      },
      {
        type: 'primary',
        theme: 'light',
        className:
          'border-[var(--color-badge-primary)]/30 text-[var(--color-badge-primary)] bg-[var(--color-badge-primary)]/10 dark:border-[var(--color-badge-primary)] dark:text-[var(--color-badge-primary)] dark:bg-[var(--color-badge-primary)]/20',
      },

      // Secondary badge variants
      {
        type: 'secondary',
        theme: 'solid',
        className:
          'border-transparent bg-[var(--color-badge-secondary)] text-[var(--color-badge-secondary-foreground)]',
      },
      {
        type: 'secondary',
        theme: 'outline',
        className:
          'border-[var(--color-badge-secondary)] text-[var(--color-badge-secondary)] dark:border-[var(--color-badge-secondary)] dark:text-[var(--color-badge-secondary)]',
      },
      {
        type: 'secondary',
        theme: 'light',
        className:
          'border-[var(--color-badge-secondary)] text-[var(--color-badge-secondary)] bg-[var(--color-badge-secondary)]/20 dark:border-[var(--color-badge-secondary)] dark:text-[var(--color-badge-secondary)] dark:bg-[var(--color-badge-secondary)]/20',
      },

      // Tertiary badge variants
      {
        type: 'tertiary',
        theme: 'solid',
        className:
          'border-transparent bg-[var(--color-badge-tertiary)] text-[var(--color-badge-tertiary-foreground)]',
      },
      {
        type: 'tertiary',
        theme: 'outline',
        className:
          'border-[var(--color-badge-tertiary)] text-[var(--color-badge-tertiary)] dark:border-[var(--color-badge-tertiary)] dark:text-[var(--color-badge-tertiary)]',
      },
      {
        type: 'tertiary',
        theme: 'light',
        className:
          'border-[var(--color-badge-tertiary)] text-[var(--color-badge-tertiary)] bg-[var(--color-badge-tertiary)]/20 dark:border-[var(--color-badge-tertiary)] dark:text-[var(--color-badge-tertiary)] dark:bg-[var(--color-badge-tertiary)]/20',
      },

      // Quaternary badge variants
      {
        type: 'quaternary',
        theme: 'solid',
        className:
          'border-transparent bg-[var(--color-badge-quaternary)] text-[var(--color-badge-quaternary-foreground)]',
      },
      {
        type: 'quaternary',
        theme: 'outline',
        className:
          'border-[var(--color-badge-quaternary)] text-[var(--color-badge-quaternary-foreground)] dark:border-[var(--color-badge-quaternary)] dark:text-[var(--color-badge-quaternary-foreground)]',
      },
      {
        type: 'quaternary',
        theme: 'light',
        className:
          'border-[var(--color-badge-quaternary)] text-[var(--color-badge-quaternary-foreground)] bg-[var(--color-badge-quaternary)]/20 dark:border-[var(--color-badge-quaternary)] dark:text-[var(--color-badge-quaternary-foreground)] dark:bg-[var(--color-badge-quaternary)]/20',
      },

      // Info badge variants
      {
        type: 'info',
        theme: 'solid',
        className:
          'border-transparent bg-[var(--color-badge-info)] text-[var(--color-badge-info-foreground)]',
      },
      {
        type: 'info',
        theme: 'outline',
        className:
          'border-[var(--color-badge-info)] text-[var(--color-badge-info)] dark:border-[var(--color-badge-info)] dark:text-[var(--color-badge-info)]',
      },
      {
        type: 'info',
        theme: 'light',
        className:
          'border-[var(--color-badge-info)] text-[var(--color-badge-info)] bg-[var(--color-badge-info)]/20 dark:border-[var(--color-badge-info)] dark:text-[var(--color-badge-info)] dark:bg-[var(--color-badge-info)]/20',
      },

      // Warning badge variants
      {
        type: 'warning',
        theme: 'solid',
        className:
          'border-transparent bg-[var(--color-badge-warning)] text-[var(--color-badge-warning-foreground)]',
      },
      {
        type: 'warning',
        theme: 'outline',
        className:
          'border-[var(--color-badge-warning)] text-[var(--color-badge-warning)] dark:border-[var(--color-badge-warning)] dark:text-[var(--color-badge-warning)]',
      },
      {
        type: 'warning',
        theme: 'light',
        className:
          'border-[var(--color-badge-warning)] text-[var(--color-badge-warning)] bg-[var(--color-badge-warning)]/20 dark:border-[var(--color-badge-warning)] dark:text-[var(--color-badge-warning)] dark:bg-[var(--color-badge-warning)]/20',
      },

      // Danger badge variants
      {
        type: 'danger',
        theme: 'solid',
        className:
          'border-transparent bg-[var(--color-badge-danger)] text-[var(--color-badge-danger-foreground)]',
      },
      {
        type: 'danger',
        theme: 'outline',
        className:
          'border-[var(--color-badge-danger)] text-[var(--color-badge-danger)] dark:border-[var(--color-badge-danger)] dark:text-[var(--color-badge-danger)]',
      },
      {
        type: 'danger',
        theme: 'light',
        className:
          'border-[var(--color-badge-danger)] text-[var(--color-badge-danger)] bg-[var(--color-badge-danger)]/20 dark:border-[var(--color-badge-danger)] dark:text-[var(--color-badge-danger)] dark:bg-[var(--color-badge-danger)]/20',
      },

      // Success badge variants
      {
        type: 'success',
        theme: 'solid',
        className:
          'border-transparent bg-[var(--color-badge-success)] text-[var(--color-badge-success-foreground)]',
      },
      {
        type: 'success',
        theme: 'outline',
        className:
          'border-[var(--color-badge-success)] text-[var(--color-badge-success)] dark:border-[var(--color-badge-success)] dark:text-[var(--color-badge-success)]',
      },
      {
        type: 'success',
        theme: 'light',
        className:
          'border-[var(--color-badge-success)] text-[var(--color-badge-success)] bg-[var(--color-badge-success)]/20 dark:border-[var(--color-badge-success)] dark:text-[var(--color-badge-success)] dark:bg-[var(--color-badge-success)]/20',
      },

      // Muted badge variants
      {
        type: 'muted',
        theme: 'solid',
        className:
          'border-transparent text-[var(--color-badge-muted-foreground)]  bg-[var(--color-badge-muted)] dark:border-[var(--color-badge-muted)]/20 dark:text-[var(--color-badge-muted)] dark:bg-[var(--color-badge-muted)]/20',
      },
      {
        type: 'muted',
        theme: 'outline',
        className:
          'border-[var(--color-badge-muted)] text-[var(--color-badge-muted)] dark:border-[var(--color-badge-muted)] dark:text-[var(--color-badge-muted)]',
      },
      {
        type: 'muted',
        theme: 'light',
        className:
          'border-[var(--color-badge-muted)] text-[var(--color-badge-muted)] bg-[var(--color-badge-muted)]/20 dark:border-[var(--color-badge-muted)] dark:text-[var(--color-badge-muted)] dark:bg-[var(--color-badge-muted)]/20',
      },
    ],
    defaultVariants: {
      type: 'muted',
      theme: 'solid',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, type, theme, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ type, theme }), className)} {...props} />;
}

export { Badge, badgeVariants };
