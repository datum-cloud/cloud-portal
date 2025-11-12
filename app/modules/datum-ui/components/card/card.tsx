import { cn } from '@shadcn/lib/utils';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@shadcn/ui/card';
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
  'bg-card text-card-foreground flex flex-col gap-4 rounded-lg border py-6 shadow-none';

const Card = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return <div data-slot="card" className={cn(DEFAULT_CARD_CLASSNAME, className)} {...props} />;
};

export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export { Card };
