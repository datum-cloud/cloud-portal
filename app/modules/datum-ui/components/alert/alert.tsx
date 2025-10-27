import { cn } from '@shadcn/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

/**
 * Datum Alert Component
 * Extends shadcn Alert with Datum-specific variants: success, info, warning
 */

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        secondary: 'bg-muted text-primary [&>svg]:text-primary',
        outline: 'border-muted text-muted-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-success-300 bg-success-100 text-success-500',
        info: 'border-info-300 bg-info-100 text-info-500! [&>svg]:text-info-500',
        warning: 'border-yellow-500 bg-yellow-50 text-yellow-700! [&>svg]:text-yellow-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = ({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) => {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
};

const AlertTitle = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
      {...props}
    />
  );
};

const AlertDescription = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className
      )}
      {...props}
    />
  );
};

export { Alert, AlertTitle, AlertDescription };
