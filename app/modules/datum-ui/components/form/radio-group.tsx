import { cn } from '@shadcn/lib/utils';
import {
  RadioGroup as ShadcnRadioGroup,
  RadioGroupItem as ShadcnRadioGroupItem,
} from '@shadcn/ui/radio-group';
import * as React from 'react';

/**
 * Datum RadioGroup component - extends shadcn RadioGroup with Datum-specific styling
 *
 * This component wraps the shadcn RadioGroup and allows for Datum-specific
 * class customizations without modifying the core shadcn component.
 *
 * @example
 * ```tsx
 * <RadioGroup value={value} onValueChange={setValue}>
 *   <RadioGroupItem value="option1" id="option1" />
 *   <Label htmlFor="option1">Option 1</Label>
 * </RadioGroup>
 * ```
 */
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof ShadcnRadioGroup>,
  React.ComponentProps<typeof ShadcnRadioGroup>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnRadioGroup
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

RadioGroup.displayName = 'RadioGroup';

/**
 * Datum RadioGroupItem component - extends shadcn RadioGroupItem with Datum-specific styling
 */
const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof ShadcnRadioGroupItem>,
  React.ComponentProps<typeof ShadcnRadioGroupItem>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnRadioGroupItem
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

RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
