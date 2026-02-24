import { cn } from '@shadcn/lib/utils';
import { Switch as ShadcnSwitch } from '@shadcn/ui/switch';
import * as React from 'react';

const Switch = React.forwardRef<
  React.ElementRef<typeof ShadcnSwitch>,
  React.ComponentProps<typeof ShadcnSwitch>
>(({ className, ...props }, ref) => {
  return <ShadcnSwitch ref={ref} className={cn(className)} {...props} />;
});

Switch.displayName = 'Switch';

export { Switch };
