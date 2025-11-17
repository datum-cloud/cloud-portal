import { cn } from '@shadcn/lib/utils';
import { Switch as ShadcnSwitch } from '@shadcn/ui/switch';
import * as React from 'react';

/**
 * Datum Switch component - extends shadcn Switch with Datum-specific styling
 *
 * This component wraps the shadcn Switch and allows for Datum-specific
 * class customizations without modifying the core shadcn component.
 *
 * @example
 * ```tsx
 * <Switch
 *   className="custom-class"
 *   checked={isEnabled}
 *   onCheckedChange={setIsEnabled}
 * />
 * ```
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof ShadcnSwitch>,
  React.ComponentProps<typeof ShadcnSwitch>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSwitch
      ref={ref}
      className={cn(
        // Datum-specific customizations can be added here
        // These classes will merge with shadcn defaults
        className
      )}
      {...props}
    />
  );
});

Switch.displayName = 'Switch';

export { Switch };
