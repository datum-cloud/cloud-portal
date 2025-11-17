import { cn } from '@shadcn/lib/utils';
import { Checkbox as ShadcnCheckbox } from '@shadcn/ui/checkbox';
import * as React from 'react';

/**
 * Datum Checkbox component - extends shadcn Checkbox with Datum-specific styling
 *
 * This component wraps the shadcn Checkbox and allows for Datum-specific
 * class customizations without modifying the core shadcn component.
 *
 * @example
 * ```tsx
 * <Checkbox
 *   className="custom-class"
 *   checked={isChecked}
 *   onCheckedChange={setIsChecked}
 * />
 * ```
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof ShadcnCheckbox>,
  React.ComponentProps<typeof ShadcnCheckbox>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnCheckbox
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

Checkbox.displayName = 'Checkbox';

export { Checkbox };
