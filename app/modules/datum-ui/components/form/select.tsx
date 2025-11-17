import { cn } from '@shadcn/lib/utils';
import {
  Select as ShadcnSelect,
  SelectContent as ShadcnSelectContent,
  SelectGroup as ShadcnSelectGroup,
  SelectItem as ShadcnSelectItem,
  SelectLabel as ShadcnSelectLabel,
  SelectScrollDownButton as ShadcnSelectScrollDownButton,
  SelectScrollUpButton as ShadcnSelectScrollUpButton,
  SelectSeparator as ShadcnSelectSeparator,
  SelectTrigger as ShadcnSelectTrigger,
  SelectValue as ShadcnSelectValue,
} from '@shadcn/ui/select';
import * as React from 'react';

/**
 * Datum Select component - extends shadcn Select with Datum-specific styling
 *
 * This component wraps the shadcn Select components and allows for Datum-specific
 * class customizations without modifying the core shadcn components.
 *
 * @example
 * ```tsx
 * <Select value={value} onValueChange={setValue}>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select an option" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="option1">Option 1</SelectItem>
 *     <SelectItem value="option2">Option 2</SelectItem>
 *   </SelectContent>
 * </Select>
 * ```
 */

const Select = ShadcnSelect;

const SelectGroup = React.forwardRef<
  React.ElementRef<typeof ShadcnSelectGroup>,
  React.ComponentProps<typeof ShadcnSelectGroup>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSelectGroup
      ref={ref}
      className={cn(
        // Datum-specific customizations can be added here
        className
      )}
      {...props}
    />
  );
});

SelectGroup.displayName = 'SelectGroup';

const SelectValue = ShadcnSelectValue;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof ShadcnSelectTrigger>,
  React.ComponentProps<typeof ShadcnSelectTrigger>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSelectTrigger
      ref={ref}
      className={cn(
        // Datum-specific customizations can be added here
        // These classes will merge with shadcn defaults
        'rounded-lg',
        'bg-input-background/50',
        'text-input-foreground',
        'border-input-border',
        'placeholder:text-input-placeholder',
        // Remove ring and add custom box-shadow on focus
        'focus-visible:ring-0 focus-visible:ring-offset-0',
        'focus-visible:border-input-focus-border',
        'focus-visible:shadow-(--input-focus-shadow)',
        className
      )}
      {...props}
    />
  );
});

SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<
  React.ElementRef<typeof ShadcnSelectContent>,
  React.ComponentProps<typeof ShadcnSelectContent>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSelectContent
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

SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof ShadcnSelectLabel>,
  React.ComponentProps<typeof ShadcnSelectLabel>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSelectLabel
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

SelectLabel.displayName = 'SelectLabel';

const SelectItem = React.forwardRef<
  React.ElementRef<typeof ShadcnSelectItem>,
  React.ComponentProps<typeof ShadcnSelectItem>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSelectItem
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

SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof ShadcnSelectSeparator>,
  React.ComponentProps<typeof ShadcnSelectSeparator>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSelectSeparator
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

SelectSeparator.displayName = 'SelectSeparator';

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof ShadcnSelectScrollUpButton>,
  React.ComponentProps<typeof ShadcnSelectScrollUpButton>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSelectScrollUpButton
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

SelectScrollUpButton.displayName = 'SelectScrollUpButton';

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof ShadcnSelectScrollDownButton>,
  React.ComponentProps<typeof ShadcnSelectScrollDownButton>
>(({ className, ...props }, ref) => {
  return (
    <ShadcnSelectScrollDownButton
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

SelectScrollDownButton.displayName = 'SelectScrollDownButton';

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
