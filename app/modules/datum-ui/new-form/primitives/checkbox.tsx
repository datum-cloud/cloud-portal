import { cn } from '@shadcn/lib/utils';
import { Checkbox as ShadcnCheckbox } from '@shadcn/ui/checkbox';
import * as React from 'react';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof ShadcnCheckbox>,
  React.ComponentProps<typeof ShadcnCheckbox>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnCheckbox
      ref={ref}
      className={cn(className)}
      {...props}
    />
  );
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };
