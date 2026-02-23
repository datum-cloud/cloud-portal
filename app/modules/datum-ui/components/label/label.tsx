import { cn } from '@shadcn/lib/utils';
import { Label as ShadcnLabel } from '@shadcn/ui/label';
import * as React from 'react';

/**
 * Datum Label component - extends shadcn Label with Datum-specific styling
 *
 * This component wraps the shadcn Label and allows for Datum-specific
 * class customizations without modifying the core shadcn component.
 *
 * @example
 * ```tsx
 * <Label
 *   htmlFor="input-id"
 *   className="custom-class"
 * >
 *   Field Label
 * </Label>
 * ```
 */
const Label = React.forwardRef<
  React.ElementRef<typeof ShadcnLabel>,
  React.ComponentProps<typeof ShadcnLabel>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnLabel
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

Label.displayName = 'Label';

export { Label };
