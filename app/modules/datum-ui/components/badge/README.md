# Badge Component

A flexible badge component for displaying labels, status indicators, and tags. Built with class-variance-authority for type-safe styling. Similar to Button component but with badge-specific styling.

## Features

- **Multiple Types**: primary, secondary, tertiary, quaternary, warning, danger, success
- **Theme Variants**: solid, outline, light
- **Accessibility**: Proper focus states and keyboard navigation
- **Dark Mode**: Full dark mode support for all variants
- **Customizable**: Supports custom className and all standard HTML div attributes

## Usage

```tsx
import { Badge } from '@/modules/datum-ui/badge';

// Basic usage
<Badge>New</Badge>

// With types and themes
<Badge type="primary" theme="solid">Primary</Badge>
<Badge type="secondary" theme="outline">Secondary</Badge>
<Badge type="danger" theme="light">Danger</Badge>
<Badge type="success">Success</Badge>

// With custom content
<Badge type="primary" theme="light">Custom Content</Badge>
```

## Props

### BadgeProps

| Prop        | Type                                                                                           | Default     | Description                      |
| ----------- | ---------------------------------------------------------------------------------------------- | ----------- | -------------------------------- |
| `type`      | `'primary' \| 'secondary' \| 'tertiary' \| 'quaternary' \| 'warning' \| 'danger' \| 'success'` | `'primary'` | Badge type/variant               |
| `theme`     | `'solid' \| 'outline' \| 'light'`                                                              | `'light'`   | Badge theme/style                |
| `className` | `string`                                                                                       | -           | Additional CSS classes           |
| `children`  | `React.ReactNode`                                                                              | -           | Badge content                    |
| `...props`  | `React.HTMLAttributes<HTMLDivElement>`                                                         | -           | All standard HTML div attributes |

## Variants

### Types

#### Primary

The main badge type, typically used for primary labels and tags.

```tsx
<Badge type="primary">Primary</Badge>
```

#### Secondary

Used for secondary labels or as an alternative to primary badges.

```tsx
<Badge type="secondary">Secondary</Badge>
```

#### Tertiary

Used for less important labels or navigation.

```tsx
<Badge type="tertiary">Tertiary</Badge>
```

#### Quaternary

Used for additional label variations.

```tsx
<Badge type="quaternary">Quaternary</Badge>
```

#### Warning

Used for warnings or caution indicators.

```tsx
<Badge type="warning">Warning</Badge>
```

#### Danger

Used for error states or destructive indicators.

```tsx
<Badge type="danger">Error</Badge>
```

#### Success

Used for positive or successful indicators.

```tsx
<Badge type="success">Success</Badge>
```

### Themes

#### Solid

Default filled badge style with opaque background.

```tsx
<Badge theme="solid">Solid Badge</Badge>
```

#### Outline

Bordered badge with transparent background, suitable for subtle labels.

```tsx
<Badge theme="outline">Outline Badge</Badge>
```

#### Light

Badge with semi-transparent background (20% opacity) matching the type color.

```tsx
<Badge theme="light">Light Badge</Badge>
```

## Examples

### Basic Badges

```tsx
import { Badge } from '@/modules/datum-ui/badge';

function BadgeExamples() {
  return (
    <div className="flex gap-2">
      <Badge type="primary">Primary</Badge>
      <Badge type="secondary">Secondary</Badge>
      <Badge type="tertiary">Tertiary</Badge>
      <Badge type="danger">Danger</Badge>
      <Badge type="success">Success</Badge>
    </div>
  );
}
```

### Badge Themes

```tsx
import { Badge } from '@/modules/datum-ui/badge';

function BadgeThemes() {
  return (
    <div className="flex gap-2">
      <Badge type="primary" theme="solid">
        Solid
      </Badge>
      <Badge type="primary" theme="outline">
        Outline
      </Badge>
      <Badge type="primary" theme="light">
        Light
      </Badge>
    </div>
  );
}
```

### Status Indicators

```tsx
import { Badge } from '@/modules/datum-ui/badge';

function StatusBadges() {
  return (
    <div className="flex gap-2">
      <Badge type="primary">Active</Badge>
      <Badge type="secondary">Pending</Badge>
      <Badge type="danger">Failed</Badge>
      <Badge type="success">Completed</Badge>
      <Badge type="warning">Warning</Badge>
    </div>
  );
}
```

### With Icons

```tsx
import { Badge } from '@/modules/datum-ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function IconBadges() {
  return (
    <div className="flex gap-2">
      <Badge type="success" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Success
      </Badge>
      <Badge type="danger" className="gap-1">
        <XCircle className="h-3 w-3" />
        Error
      </Badge>
      <Badge type="warning" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Warning
      </Badge>
    </div>
  );
}
```

### Custom Styling

```tsx
import { Badge } from '@/modules/datum-ui/badge';

function CustomBadges() {
  return (
    <div className="flex gap-2">
      <Badge type="primary" className="px-4 py-1">
        Custom Padding
      </Badge>
      <Badge type="secondary" theme="outline" className="border-2">
        Custom Border
      </Badge>
      <Badge type="primary" className="shadow-md">
        With Shadow
      </Badge>
    </div>
  );
}
```

### Interactive Badges

```tsx
import { Badge } from '@/modules/datum-ui/badge';
import { X } from 'lucide-react';

function InteractiveBadges() {
  const handleRemove = () => {
    // Handle badge removal
  };

  return (
    <div className="flex gap-2">
      <Badge type="secondary" className="cursor-pointer gap-1 transition-opacity hover:opacity-80">
        Removable
        <X className="h-3 w-3" onClick={handleRemove} />
      </Badge>
    </div>
  );
}
```

## Styling

The badge component uses Tailwind CSS classes and supports:

- **Custom Classes**: Add additional classes via the `className` prop
- **Dark Mode**: Automatic dark mode support for all variants
- **Focus States**: Proper focus ring styling for accessibility
- **Transitions**: Smooth transition effects for state changes
- **No Hover States**: Badges don't have hover effects by default (unlike buttons)

### Custom Styling

```tsx
<Badge type="primary" className="shadow-md transition-shadow">
  Custom Styled Badge
</Badge>
```

## Accessibility

The badge component includes:

- Proper focus states with visible focus rings
- Semantic HTML structure
- Screen reader compatibility
- Keyboard navigation support (when interactive)

## Dependencies

- `class-variance-authority`: For type-safe variant styling
- `@/modules/shadcn/lib/utils`: For class name utilities

## Migration from Other Badge Components

If migrating from other badge components:

1. Replace imports with the new badge module
2. Update prop names from `variant` to `type` and `theme`
3. Adjust styling classes if custom styles were applied
4. Test all badge types and themes

```tsx
// Old
import { Badge } from '@/components/badge';
<Badge variant="default">Label</Badge>

// New
import { Badge } from '@datum-ui/badge';
<Badge type="primary" theme="solid">Label</Badge>
```

## Notes

- The badge component is similar to the Button component but with badge-specific styling
- Badges use `rounded-md` borders (not fully rounded like pills)
- Badges don't have hover effects by default
- The light theme uses 20% opacity backgrounds for a subtle tinted appearance
- Badges are inline-flex elements and will wrap naturally in text flows
- Default theme is `light` for a subtle appearance
