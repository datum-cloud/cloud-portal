# shadcn/ui Rules & Conventions

This document covers the rules and best practices for using shadcn/ui components.

---

## What is shadcn/ui?

shadcn/ui is a collection of re-usable components built on:

- **Radix UI** - Unstyled, accessible primitives
- **Tailwind CSS** - Utility-first styling

Unlike traditional component libraries, shadcn components are **copied into your codebase**, not installed as a package.

---

## Location

All shadcn components live in:

```
app/modules/shadcn/
├── ui/                     # Component files
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── hooks/                  # Utility hooks
│   └── use-mobile.ts
├── lib/                    # Utilities
│   └── utils.ts            # cn() function
├── styles/
│   ├── shadcn.css          # Base styles & theme
│   └── animations.css      # Custom animations
└── README.md
```

---

## Import Rules

### ✅ DO: Import by File Path

```typescript
import { Button } from '@shadcn/ui/button';
import { Card, CardHeader, CardContent } from '@shadcn/ui/card';
import { Dialog, DialogTrigger, DialogContent } from '@shadcn/ui/dialog';
```

### ✅ DO: Import Utilities

```typescript
import { useIsMobile } from '@shadcn/hooks/use-mobile';
import { cn } from '@shadcn/lib/utils';
```

### ❌ DON'T: Use Barrel Imports

```typescript
// This won't work - no barrel exports
import { Button, Card } from '@shadcn/ui';
```

---

## Available Components

### Form & Input

- `button` - Button with variants
- `checkbox` - Checkbox input
- `input` - Text input
- `label` - Form label
- `radio-group` - Radio buttons
- `select` - Select dropdown
- `switch` - Toggle switch
- `textarea` - Multi-line input

### Layout & Navigation

- `breadcrumb` - Breadcrumb navigation
- `card` - Card container
- `separator` - Visual divider
- `tabs` - Tabbed interface

### Data Display

- `avatar` - User avatar
- `badge` - Status badge
- `skeleton` - Loading skeleton
- `table` - Data table

### Overlays & Dialogs

- `dialog` - Modal dialog
- `dropdown-menu` - Dropdown menu
- `hover-card` - Card on hover
- `popover` - Floating popover
- `sheet` - Slide-out panel
- `tooltip` - Tooltip overlay

### Utility

- `collapsible` - Collapsible content
- `command` - Command palette
- `sonner` - Toast notifications

---

## Customization Rules

### ✅ DO: Customize via Tailwind Classes

```tsx
<Button className="bg-navy hover:bg-navy/90">
  Custom Button
</Button>

<Card className="border-2 border-primary">
  <CardContent className="p-8">
    Content
  </CardContent>
</Card>
```

### ✅ DO: Use cn() for Conditional Classes

```tsx
import { cn } from '@shadcn/lib/utils';

<Button className={cn('base-styles', isActive && 'bg-primary', isDisabled && 'opacity-50')}>
  Click me
</Button>;
```

### ✅ DO: Create Wrappers in datum-ui for Reusable Variants

If you need a consistent variant across the app:

```tsx
// app/modules/datum-ui/components/button/index.tsx
import { cn } from '@shadcn/lib/utils';
import { Button as ShadcnButton } from '@shadcn/ui/button';

const variants = {
  primary: 'bg-navy text-white hover:bg-navy/90',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ variant = 'primary', className, ...props }) {
  return <ShadcnButton className={cn(variants[variant], className)} {...props} />;
}
```

### ❌ DON'T: Modify shadcn Source Files

Keep shadcn files pristine for easy updates:

```tsx
// DON'T edit app/modules/shadcn/ui/button.tsx directly
// Instead, wrap it in datum-ui or use className
```

---

## Adding New shadcn Components

When you need a shadcn component that isn't in the codebase:

### Step 1: Install via CLI

```bash
npx shadcn@latest add accordion
```

### Step 2: Files Are Created

```
app/modules/shadcn/ui/accordion.tsx
```

### Step 3: Import and Use

```typescript
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@shadcn/ui/accordion';

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>
      Yes. It follows WAI-ARIA guidelines.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

## The cn() Utility

The `cn()` function merges Tailwind classes with conflict resolution:

```typescript
import { cn } from '@shadcn/lib/utils';

// Basic usage
cn('px-2 py-1', 'p-4');
// Result: 'p-4' (p-4 overrides px-2 py-1)

// Conditional classes
cn('base', condition && 'conditional');

// Object syntax
cn('base', { active: isActive, disabled: isDisabled });

// Array syntax
cn('base', ['class1', 'class2']);
```

### Under the Hood

`cn()` combines:

- `clsx` - Conditional class joining
- `tailwind-merge` - Tailwind conflict resolution

---

## Component Patterns

### Dialog Pattern

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@shadcn/ui/dialog';

function ConfirmDialog({ onConfirm }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Form Pattern

```tsx
import { Input } from '@shadcn/ui/input';
import { Label } from '@shadcn/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="you@example.com" />
</div>;
```

### Select Pattern

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@shadcn/ui/select';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>;
```

---

## Accessibility

shadcn components are built on Radix UI, which provides:

- Keyboard navigation
- Focus management
- ARIA attributes
- Screen reader support

**Don't break accessibility:**

```tsx
// ✅ Good: Uses DialogTrigger properly
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// ❌ Bad: Breaks accessibility
<div onClick={() => setOpen(true)}>Open</div>
```

---

## Related Documentation

- [UI Overview](./overview.md) - Component hierarchy
- [datum-ui Guide](./datum-ui-guide.md) - Datum wrappers
- [Theming](./theming.md) - Theme customization
- [shadcn/ui Official Docs](https://ui.shadcn.com/)
