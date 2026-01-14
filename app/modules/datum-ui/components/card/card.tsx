import { cn } from '@shadcn/lib/utils';
import { CardTitle, CardDescription, CardContent } from '@shadcn/ui/card';
import * as React from 'react';

/**
 * Datum Card Component
 * Extends shadcn Card with custom default className
 *
 * This component replaces the default className of shadcn Card without modifying
 * the original shadcn component. All sub-components (CardHeader, CardTitle, etc.)
 * are re-exported from shadcn as-is.
 */

const DEFAULT_CARD_CLASSNAME =
  'bg-card text-card-foreground flex flex-col gap-4 rounded-xl border border-card-border py-6 shadow';

const Card = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return <div data-slot="card" className={cn(DEFAULT_CARD_CLASSNAME, className)} {...props} />;
};

const CardHeader = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="card-header"
      className={cn('border-card-border flex flex-col gap-3 px-6', className)}
      {...props}
    />
  );
};

const CardFooter = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div data-slot="card-footer" className={cn('border-card-border px-6', className)} {...props} />
  );
};

export { CardTitle, CardDescription, CardContent, CardFooter };
export { Card, CardHeader };
