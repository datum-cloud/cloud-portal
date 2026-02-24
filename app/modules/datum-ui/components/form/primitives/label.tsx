import { cn } from '@shadcn/lib/utils';
import { Label as ShadcnLabel } from '@shadcn/ui/label';
import * as React from 'react';

const Label = React.forwardRef<
  React.ElementRef<typeof ShadcnLabel>,
  React.ComponentProps<typeof ShadcnLabel>
>(({ className, ...props }, ref) => {
  return <ShadcnLabel ref={ref} className={cn(className)} {...props} />;
});

Label.displayName = 'Label';

export { Label };
