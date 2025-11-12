# Tooltip Component

A simple and accessible tooltip component that provides contextual information on hover. Built on top of Radix UI primitives via shadcn/ui for robust accessibility and positioning.

## Features

- **Simple API**: Easy-to-use wrapper around shadcn/ui tooltip primitives
- **Flexible Content**: Supports both string messages and ReactNode content
- **Customizable Delay**: Configurable delay duration before showing tooltip
- **Accessibility**: Built on Radix UI with full keyboard and screen reader support
- **Automatic Positioning**: Smart positioning that avoids viewport edges
- **Dark Mode**: Full dark mode support

## Usage

```tsx
import { Tooltip } from '@/modules/datum-ui';

// Basic usage with string message
<Tooltip message="This is a helpful tooltip">
  <Button>Hover me</Button>
</Tooltip>

// With custom delay
<Tooltip message="Quick tooltip" delayDuration={100}>
  <span>Hover here</span>
</Tooltip>

// With ReactNode content
<Tooltip message={<div>Rich <strong>formatted</strong> content</div>}>
  <IconButton icon={<Info />} />
</Tooltip>
```

## Props

### TooltipProps

| Prop            | Type                                     | Default | Description                                                    |
| --------------- | ---------------------------------------- | ------- | -------------------------------------------------------------- |
| `message`       | `string \| ReactNode`                    | -       | Tooltip content (required)                                     |
| `children`      | `ReactNode`                              | -       | Element that triggers the tooltip (required)                   |
| `delayDuration` | `number`                                 | `200`   | Delay in milliseconds before showing tooltip                   |
| `side`          | `'top' \| 'right' \| 'bottom' \| 'left'` | -       | Preferred side of the trigger to render against                |
| `align`         | `'start' \| 'center' \| 'end'`           | -       | Alignment of the tooltip relative to the trigger               |
| `sideOffset`    | `number`                                 | -       | Distance in pixels from the trigger                            |
| `hidden`        | `boolean`                                | -       | Whether to hide the tooltip (useful for conditional rendering) |
| `open`          | `boolean`                                | -       | Controlled open state                                          |
| `onOpenChange`  | `(open: boolean) => void`                | -       | Callback fired when the open state changes                     |

## Examples

### Basic Tooltip

```tsx
import { Tooltip } from '@/modules/datum-ui';
import { Button } from '@/modules/datum-ui';

function BasicTooltip() {
  return (
    <Tooltip message="Click to save your changes">
      <Button>Save</Button>
    </Tooltip>
  );
}
```

### Tooltip with Different Delays

```tsx
import { Tooltip } from '@/modules/datum-ui';

function DelayExamples() {
  return (
    <div className="flex gap-4">
      <Tooltip message="Instant tooltip" delayDuration={0}>
        <Button>No Delay</Button>
      </Tooltip>
      <Tooltip message="Default delay (200ms)" delayDuration={200}>
        <Button>Default</Button>
      </Tooltip>
      <Tooltip message="Slow tooltip" delayDuration={500}>
        <Button>Slow</Button>
      </Tooltip>
    </div>
  );
}
```

### Tooltip with Rich Content

```tsx
import { Tooltip } from '@/modules/datum-ui';
import { Info } from 'lucide-react';

function RichContentTooltip() {
  return (
    <Tooltip
      message={
        <div className="space-y-1">
          <p className="font-semibold">Additional Information</p>
          <p className="text-xs">This tooltip contains formatted content</p>
        </div>
      }>
      <Info className="h-4 w-4 cursor-help" />
    </Tooltip>
  );
}
```

### Tooltip on Icon Buttons

```tsx
import { Tooltip } from '@/modules/datum-ui';
import { Button } from '@/modules/datum-ui';
import { Settings, Trash2, Download } from 'lucide-react';

function IconButtonTooltips() {
  return (
    <div className="flex gap-2">
      <Tooltip message="Settings">
        <Button size="icon" icon={<Settings />} />
      </Tooltip>
      <Tooltip message="Delete item">
        <Button size="icon" icon={<Trash2 />} type="danger" />
      </Tooltip>
      <Tooltip message="Download file">
        <Button size="icon" icon={<Download />} type="secondary" />
      </Tooltip>
    </div>
  );
}
```

### Tooltip on Disabled Elements

```tsx
import { Tooltip } from '@/modules/datum-ui';
import { Button } from '@/modules/datum-ui';

function DisabledTooltip() {
  return (
    <Tooltip message="This action is currently unavailable">
      <span className="inline-block">
        <Button disabled>Disabled Button</Button>
      </span>
    </Tooltip>
  );
}
```

### Tooltip on Text Elements

```tsx
import { Tooltip } from '@/modules/datum-ui';

function TextTooltip() {
  return (
    <div className="space-y-2">
      <Tooltip message="This is a truncated text with more details">
        <span className="inline-block max-w-[200px] truncate">
          Very long text that gets truncated...
        </span>
      </Tooltip>
      <Tooltip message="Hover to see full date">
        <time>2024-01-15</time>
      </Tooltip>
    </div>
  );
}
```

### Tooltip on Form Elements

```tsx
import { Tooltip } from '@/modules/datum-ui';
import { Input } from '@shadcn/ui/input';
import { Info } from 'lucide-react';

function FormTooltip() {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <span>Password</span>
        <Tooltip message="Password must be at least 8 characters">
          <Info className="text-muted-foreground h-4 w-4 cursor-help" />
        </Tooltip>
      </label>
      <Input type="password" />
    </div>
  );
}
```

### Tooltip Positioning

```tsx
import { Tooltip } from '@/modules/datum-ui';
import { Button } from '@/modules/datum-ui';

function PositionedTooltips() {
  return (
    <div className="flex flex-col gap-4">
      <Tooltip message="Top tooltip" side="top">
        <Button>Top</Button>
      </Tooltip>
      <Tooltip message="Right tooltip" side="right" align="center">
        <Button>Right</Button>
      </Tooltip>
      <Tooltip message="Bottom tooltip" side="bottom" sideOffset={10}>
        <Button>Bottom with offset</Button>
      </Tooltip>
      <Tooltip message="Left tooltip" side="left" align="start">
        <Button>Left aligned start</Button>
      </Tooltip>
    </div>
  );
}
```

### Controlled Tooltip State

```tsx
import { Tooltip } from '@/modules/datum-ui';
import { Button } from '@/modules/datum-ui';
import { useState } from 'react';

function ControlledTooltip() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Tooltip message="This tooltip is controlled" open={isOpen} onOpenChange={setIsOpen}>
        <Button onClick={() => setIsOpen(!isOpen)}>Toggle Tooltip</Button>
      </Tooltip>

      <Tooltip
        message="Tooltip that appears on hover of parent"
        open={isOpen}
        onOpenChange={setIsOpen}>
        <div onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
          Hover me
        </div>
      </Tooltip>
    </div>
  );
}
```

### Conditional Tooltip Visibility

```tsx
import { Tooltip } from '@/modules/datum-ui';
import { Button } from '@/modules/datum-ui';

function ConditionalTooltip({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <Tooltip message="Only visible when sidebar is collapsed" hidden={!isCollapsed} side="right">
      <Button>Menu Item</Button>
    </Tooltip>
  );
}
```

## Advanced Usage

### Using shadcn/ui Primitives Directly

For even more advanced use cases, you can use the underlying shadcn/ui primitives directly:

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/ui/tooltip';

function AdvancedTooltip() {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button>Advanced Tooltip</Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="custom-class">
        <p>Custom styled tooltip</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

Note: The Datum UI Tooltip wrapper already supports most common use cases including positioning, controlled state, and conditional visibility. Only use shadcn primitives directly if you need custom className or other advanced features not exposed by the wrapper.

## Styling

The tooltip component uses Tailwind CSS classes and supports:

- **Automatic Positioning**: Tooltips automatically position themselves to stay within the viewport
- **Smooth Animations**: Fade and slide animations for show/hide
- **Dark Mode**: Automatic dark mode support
- **Z-Index Management**: Proper layering with z-50

The tooltip content is styled with:

- Secondary background color (`bg-secondary`)
- Secondary foreground text color (`text-secondary-foreground`)
- Rounded corners
- Padding for comfortable reading
- Arrow indicator pointing to the trigger element
- Smooth fade and slide animations

## Accessibility

The tooltip component includes:

- **Keyboard Support**: Tooltips appear on focus for keyboard users
- **Screen Reader Support**: Proper ARIA attributes for assistive technologies
- **Focus Management**: Tooltips don't interfere with focus flow
- **Hover and Focus**: Works with both mouse hover and keyboard focus
- **Portal Rendering**: Tooltips are rendered in a portal to avoid z-index issues

## Dependencies

- `@radix-ui/react-tooltip`: Core tooltip functionality
- `@shadcn/ui/tooltip`: shadcn/ui tooltip primitives
- `react`: React library

## When to Use

Use the Tooltip component when you need to:

- Provide additional context or information
- Explain functionality of icon-only buttons
- Show full content for truncated text
- Display helpful hints in forms
- Add descriptions to disabled elements

## When Not to Use

Avoid using tooltips for:

- Critical information that users must see
- Information that requires user interaction
- Long-form content (use a popover or modal instead)
- Actions that need immediate visibility

## Migration from Other Tooltip Components

If migrating from other tooltip components:

1. Replace imports with the Datum UI tooltip
2. Update prop names if needed (e.g., `content` → `message`)
3. Adjust delay values if your previous component used different defaults
4. Test tooltip positioning and behavior

```tsx
// Old
import { Tooltip } from '@/components/tooltip';
<Tooltip content="Help text">Button</Tooltip>

// New
import { Tooltip } from '@/modules/datum-ui';
<Tooltip message="Help text">Button</Tooltip>
```

## Notes

- The tooltip wrapper simplifies the API and supports all common use cases including positioning, controlled state, and conditional visibility
- Tooltips automatically hide when the trigger element loses focus or hover (unless using controlled state)
- The default delay of 200ms helps prevent accidental tooltip triggers
- Tooltips are rendered in a portal, so they won't be clipped by parent overflow containers
- The `asChild` prop on TooltipTrigger merges props with the child element
- Use the `hidden` prop to conditionally show/hide tooltips based on application state (e.g., sidebar collapsed state)
- Controlled state (`open`/`onOpenChange`) is useful when you need to trigger tooltips programmatically or based on custom hover logic
