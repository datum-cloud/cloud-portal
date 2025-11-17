# Datum Form Fields

Form field components that extend shadcn/ui components with Datum-specific styling capabilities.

## Overview

This module provides form field components (`Input`, `Checkbox`, `Textarea`, `Select`, etc.) that wrap shadcn/ui components using **Option A: Direct re-export with class merging**. This approach allows you to:

- ✅ Customize styling without modifying core shadcn components
- ✅ Maintain compatibility with shadcn updates
- ✅ Add Datum-specific defaults and enhancements
- ✅ Keep the same API as shadcn components

## Architecture

Each component wraps the corresponding shadcn component and uses the `cn()` utility to merge custom classes. This means:

1. **Base functionality** comes from shadcn (automatically updated)
2. **Custom styling** can be added via the `className` prop or by modifying the component's default classes
3. **Full API compatibility** - all props work exactly like shadcn components

## Available Components

### Input Fields

- **`Input`** - Text input field
- **`Textarea`** - Multi-line text input
- **`Label`** - Form label

### Selection Fields

- **`Checkbox`** - Checkbox input
- **`Switch`** - Toggle switch
- **`RadioGroup`** - Radio button group
- **`RadioGroupItem`** - Individual radio button

### Dropdown Fields

- **`Select`** - Select dropdown root
- **`SelectTrigger`** - Select button/trigger
- **`SelectValue`** - Selected value display
- **`SelectContent`** - Dropdown content container
- **`SelectItem`** - Individual option
- **`SelectGroup`** - Option group container
- **`SelectLabel`** - Group label
- **`SelectSeparator`** - Visual separator
- **`SelectScrollUpButton`** - Scroll up button
- **`SelectScrollDownButton`** - Scroll down button

## Usage

### Basic Import

```tsx
import { Input, Checkbox, Select } from '@datum-ui/components';
```

### Example: Input Field

```tsx
import { Input } from '@datum-ui/components';

<Input
  type="text"
  placeholder="Enter your name"
  className="custom-class" // Datum-specific or custom classes
/>
```

### Example: Checkbox

```tsx
import { Checkbox } from '@datum-ui/components';

<Checkbox
  checked={isChecked}
  onCheckedChange={setIsChecked}
  className="custom-class"
/>
```

### Example: Select Dropdown

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-ui/components';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Example: Radio Group

```tsx
import { RadioGroup, RadioGroupItem } from '@datum-ui/components';
import { Label } from '@datum-ui/components';

<RadioGroup value={value} onValueChange={setValue}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="option2" />
    <Label htmlFor="option2">Option 2</Label>
  </div>
</RadioGroup>
```

## Customization

### Adding Default Classes

To add Datum-specific default classes, modify the component file:

```tsx
// form/input.tsx
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    return (
      <ShadcnInput
        ref={ref}
        className={cn(
          // Add Datum-specific defaults here
          'focus-visible:ring-primary/20', // Custom focus ring
          'border-border/50',                // Softer border
          className                          // User classes (highest priority)
        )}
        {...props}
      />
    );
  }
);
```

### Using with Conform Forms

These components work seamlessly with Conform form validation:

```tsx
import { Input } from '@datum-ui/components';
import { getInputProps } from '@conform-to/react';

<Input
  {...getInputProps(field, { type: 'text' })}
  placeholder="Enter text..."
/>
```

## Migration from shadcn

If you're currently using shadcn components directly:

**Before:**
```tsx
import { Input } from '@shadcn/ui/input';
import { Checkbox } from '@shadcn/ui/checkbox';
```

**After:**
```tsx
import { Input, Checkbox } from '@datum-ui/components';
```

The API is identical, so no code changes are needed beyond the import path.

## Benefits

1. **Maintainability** - Automatically receives shadcn updates
2. **Customization** - Easy to add Datum-specific styling
3. **Consistency** - Single import path for all form fields
4. **Flexibility** - Can still override via className prop
5. **Type Safety** - Full TypeScript support with same types as shadcn

## Related

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Datum UI Components](../README.md)
- [Conform Form Library](https://conform.guide/)

