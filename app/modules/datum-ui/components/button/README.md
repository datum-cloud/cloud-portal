# Button Component

A highly customizable button component with multiple variants, themes, sizes, and states. Built with class-variance-authority for type-safe styling.

## Features

- **Multiple Types**: primary, secondary, tertiary, warning, danger, success
- **Theme Variants**: solid, light, outline, borderless
- **Size Options**: small, default, large, icon
- **Loading States**: Built-in loading spinner with customizable loading icon
- **Icon Support**: Left/right positioned icons with automatic icon-only detection
- **Block Layout**: Full-width button option
- **Accessibility**: Proper focus states and disabled handling
- **Dark Mode**: Full dark mode support for all variants

## Usage

```tsx
import { Button } from '@/modules/datum-ui/button';

// Basic usage
<Button>Click me</Button>

// With variants
<Button type="primary" theme="solid" size="large">
  Primary Button
</Button>

// With icon
<Button icon={<Icon />} iconPosition="left">
  Button with Icon
</Button>

// Loading state
<Button loading>Loading...</Button>

// Icon-only button
<Button icon={<Icon />} size="icon" />

// Block button
<Button block>Full Width Button</Button>
```

## Props

### ButtonProps

| Prop           | Type                                                                           | Default       | Description                         |
| -------------- | ------------------------------------------------------------------------------ | ------------- | ----------------------------------- |
| `type`         | `'primary' \| 'secondary' \| 'tertiary' \| 'warning' \| 'danger' \| 'success'` | `'primary'`   | Button type/variant                 |
| `theme`        | `'solid' \| 'light' \| 'outline' \| 'borderless'`                              | `'solid'`     | Button theme/style                  |
| `size`         | `'small' \| 'default' \| 'large' \| 'icon'`                                    | `'default'`   | Button size                         |
| `block`        | `boolean`                                                                      | `false`       | Whether button should be full width |
| `loading`      | `boolean`                                                                      | `false`       | Show loading spinner                |
| `icon`         | `React.ReactNode`                                                              | -             | Icon to display                     |
| `iconPosition` | `'left' \| 'right'`                                                            | `'left'`      | Position of the icon                |
| `loadingIcon`  | `React.ReactNode`                                                              | `<Loader2 />` | Custom loading icon                 |
| `htmlType`     | `'button' \| 'submit' \| 'reset'`                                              | `'button'`    | HTML button type                    |
| `disabled`     | `boolean`                                                                      | -             | Disable the button                  |
| `className`    | `string`                                                                       | -             | Additional CSS classes              |

## Variants

### Types

#### Primary

The main action button, typically used for primary actions.

```tsx
<Button type="primary">Primary Action</Button>
```

#### Secondary

Used for secondary actions or as an alternative to primary buttons.

```tsx
<Button type="secondary">Secondary Action</Button>
```

#### Tertiary

Used for less important actions or navigation.

```tsx
<Button type="tertiary">Tertiary Action</Button>
```

#### Warning

Used for actions that require caution or confirmation.

```tsx
<Button type="warning">Warning Action</Button>
```

#### Danger

Used for destructive or dangerous actions.

```tsx
<Button type="danger">Delete</Button>
```

#### Success

Used for positive or successful actions.

```tsx
<Button type="success">Save</Button>
```

### Themes

#### Solid

Default filled button style.

```tsx
<Button theme="solid">Solid Button</Button>
```

#### Light

Light background with colored text.

```tsx
<Button theme="light">Light Button</Button>
```

#### Outline

Bordered button with transparent background.

```tsx
<Button theme="outline">Outline Button</Button>
```

#### Borderless

No border or background, just text.

```tsx
<Button theme="borderless">Borderless Button</Button>
```

### Sizes

#### Small

Compact button for tight spaces.

```tsx
<Button size="small">Small Button</Button>
```

#### Default

Standard button size.

```tsx
<Button size="default">Default Button</Button>
```

#### Large

Prominent button for important actions.

```tsx
<Button size="large">Large Button</Button>
```

#### Icon

Square button optimized for icons.

```tsx
<Button size="icon" icon={<Icon />} />
```

## Examples

### Basic Buttons

```tsx
import { Button } from '@/modules/datum-ui/button';

function ButtonExamples() {
  return (
    <div className="space-y-4">
      <Button>Default Button</Button>
      <Button type="secondary">Secondary Button</Button>
      <Button type="tertiary">Tertiary Button</Button>
    </div>
  );
}
```

### Button with Icons

```tsx
import { Button } from '@/modules/datum-ui/button';
import { Plus, ArrowRight } from 'lucide-react';

function IconButtonExamples() {
  return (
    <div className="space-y-4">
      <Button icon={<Plus />}>Add Item</Button>
      <Button icon={<ArrowRight />} iconPosition="right">
        Continue
      </Button>
      <Button size="icon" icon={<Plus />} />
    </div>
  );
}
```

### Loading States

```tsx
import { Button } from '@/modules/datum-ui/button';
import { useState } from 'react';

function LoadingButtonExample() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <Button loading={loading} onClick={handleClick}>
      {loading ? 'Processing...' : 'Submit'}
    </Button>
  );
}
```

### Form Buttons

```tsx
import { Button } from '@/modules/datum-ui/button';

function FormButtons() {
  return (
    <div className="space-x-4">
      <Button htmlType="submit" type="primary">
        Save
      </Button>
      <Button htmlType="reset" type="secondary">
        Reset
      </Button>
      <Button htmlType="button" type="tertiary">
        Cancel
      </Button>
    </div>
  );
}
```

### Action Buttons

```tsx
import { Button } from '@/modules/datum-ui/button';

function ActionButtons() {
  return (
    <div className="space-x-4">
      <Button type="success">Save Changes</Button>
      <Button type="warning">Review Changes</Button>
      <Button type="danger">Delete Item</Button>
    </div>
  );
}
```

### Block Buttons

```tsx
import { Button } from '@/modules/datum-ui/button';

function BlockButtons() {
  return (
    <div className="space-y-4">
      <Button block type="primary">
        Full Width Primary
      </Button>
      <Button block type="secondary">
        Full Width Secondary
      </Button>
    </div>
  );
}
```

## Styling

The button component uses Tailwind CSS classes and supports:

- **Custom Classes**: Add additional classes via the `className` prop
- **Dark Mode**: Automatic dark mode support for all variants
- **Focus States**: Proper focus ring styling
- **Hover/Active States**: Interactive state styling
- **Disabled States**: Visual feedback for disabled buttons

### Custom Styling

```tsx
<Button className="shadow-lg transition-shadow hover:shadow-xl" type="primary">
  Custom Styled Button
</Button>
```

## Accessibility

The button component includes:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Disabled state handling

## Dependencies

- `class-variance-authority`: For type-safe variant styling
- `lucide-react`: For default loading icon
- `@/modules/shadcn/lib/utils`: For class name utilities

## Migration from Other Button Components

If migrating from other button components:

1. Replace imports with the new button module
2. Update prop names if needed (e.g., `variant` → `type`)
3. Adjust styling classes if custom styles were applied
4. Test all button states and variants

```tsx
// Old
import { Button } from '@/components/button/button-enhanced';

// New
import { Button } from '@datum-ui/button';
```
