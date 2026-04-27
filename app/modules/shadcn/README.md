# shadcn/ui Kit Module

A self-contained, modular UI kit built on [shadcn/ui](https://ui.shadcn.com/) and [Tailwind CSS v4](https://tailwindcss.com/).

## 📁 Structure

```
app/modules/shadcn/
├── ui/                        # All shadcn/ui components (flat files)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── hooks/                     # Hooks
│   └── use-mobile.ts
├── lib/                       # Utilities
│   └── utils.ts               # Class name utility (clsx + tailwind-merge)
├── styles/                    # Styles
│   ├── shadcn.css             # Core shadcn/ui styles & theme
│   └── animations.css         # Custom animations
├── style.css                  # Convenience entry that imports both styles
└── README.md
```

## 🚀 Usage

### Imports (via @shadcn aliases)

Use per-file path imports. No barrels are required or maintained.

```typescript
// Hooks
import { Card } from '@datum-cloud/datum-ui/card';
import { useIsMobile } from '@shadcn/hooks/use-mobile';
// Utils
import { cn } from '@shadcn/lib/utils';
import { Button } from '@shadcn/ui/button';
```

### Styles

Include styles in your app root (or a global layout):

```typescript
// Option A: import both explicitly
// Option B: single convenience entry
import '@shadcn/style.css';
import '@shadcn/styles/animations.css';
import '@shadcn/styles/shadcn.css';
```

## 📦 Available Components

### Form & Input

- `Alert` - Alert messages with variants
- `Button` - Button with loading states and variants
- `Checkbox` - Checkbox input
- `Input` - Text input
- `InputNumber` - Number input with formatting
- `InputWithAddons` - Input with prefix/suffix
- `Label` - Form label
- `RadioGroup` - Radio button group
- `Select` - Select dropdown
- `Switch` - Toggle switch
- `Textarea` - Multi-line text input
- `TagInput` - Tag/chip input

### Layout & Navigation

- `Breadcrumb` - Breadcrumb navigation
- `Card` - Card container
- `Separator` - Visual divider
- `Sidebar` - Collapsible sidebar
- `Tabs` - Tabbed interface

### Data Display

- `Avatar` - User avatar
- `AvatarStack` - Stacked avatars
- `Badge` - Badge/label
- `Chart` - Chart components (Recharts)
- `Table` - Data table
- `Skeleton` - Loading skeleton

### Overlays & Dialogs

- `Dialog` - Modal dialog
- `Sheet` - Slide-out panel
- `Popover` - Floating popover
- `Tooltip` - Tooltip overlay
- `HoverCard` - Card on hover
- `Dropdown` - Dropdown menu
- `Command` - Command palette

### Misc

- `Calendar` - Date picker calendar
- `CalendarDatePicker` - Full date picker with input
- `Collapsible` - Collapsible content
- `Sonner` - Toast notifications (Sonner)
- `Stepper` - Step indicator
- `VisuallyHidden` - Screen reader only content

## 🎣 Hooks

### `useToast(toast?: Toast | null)`

Display toast notifications using Sonner:

```typescript
import { useToast } from '@shadcn';

function MyComponent() {
  const toast = useToast();

  // Used internally with server-side toasts
  // Typically called from root loader
}
```

Or use Sonner directly for client-side toasts:

```typescript
import { toast } from 'sonner';

toast.success('Success!');
toast.error('Error occurred');
toast.info('Information');
```

### `useIsMobile()`

Detect mobile breakpoint (< 768px):

```typescript
import { useIsMobile } from '@shadcn';

function ResponsiveComponent() {
  const isMobile = useIsMobile();

  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

## 🛠️ Utilities

### `cn(...inputs: ClassValue[])`

Merge Tailwind CSS classes with conflict resolution:

```typescript
import { cn } from '@shadcn';

const className = cn(
  'base-class',
  'text-red-500',
  condition && 'conditional-class',
  { 'object-class': isTrue },
  ['array', 'classes']
);

// Handles Tailwind conflicts
cn('px-2 py-1', 'p-4'); // => 'p-4' (p-4 overrides px-2 py-1)
```

## 🎨 Theming

The shadcn module provides **base fallback styles** that can be overridden by custom themes. The theming system uses CSS layers for proper cascade control.

### Architecture

```
@layer shadcn-base, theme;  // Layer order defined in root.css

shadcn-base (fallback)  →  theme (overrides)
```

### Base Styles (`app/modules/shadcn/styles/shadcn.css`)

This file contains:

1. **Fallback CSS Variables** - Default shadcn colors using OKLCH
2. **Component Styles** - Base styles for shadcn/ui components
3. **Tailwind Integration** - Maps CSS variables to Tailwind utilities

```css
@layer shadcn-base {
  :root {
    /* Minimal fallback colors using OKLCH */
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    /* ... more fallback variables */
  }

  .dark {
    /* Dark mode fallbacks */
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    /* ... */
  }

  /* Maps to Tailwind utilities */
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    /* ... */
  }
}
```

### Theme Overrides (`app/styles/themes/`)

Custom themes override shadcn base styles using the `theme` layer:

```css
/* Define custom colors globally for Tailwind utilities */
@theme {
  --color-navy: #0c1d31;
  --color-cream: #f6f6f5;
  /* ... all custom brand colors */
}

/* Override shadcn variables */
@layer theme {
  .theme-alpha {
    --primary: var(--color-navy);
    --primary-foreground: var(--color-cream);
    /* ... theme-specific overrides */

    &.dark {
      /* Dark mode overrides */
    }
  }

  /* Map overrides to Tailwind utilities */
  @theme inline {
    --color-primary: var(--primary);
    /* ... */
  }
}
```

### How It Works

1. **Layer Order**: `@layer shadcn-base, theme;` ensures theme always wins
2. **Fallback**: If no theme is applied, shadcn-base provides default styles
3. **Override**: When `.theme-alpha` is applied to `<body>`, it overrides base styles
4. **Tailwind Integration**: Both layers map to Tailwind utilities (e.g., `bg-primary`, `text-navy`)

### Creating a New Theme

1. Copy `app/styles/themes/alpha.css` to `beta.css`
2. Replace `.theme-alpha` with `.theme-beta`
3. Update color values
4. Import in `app/styles/root.css`
5. Apply via `<body className="theme-beta">` in `app/root.tsx`

### Available for Tailwind Utilities

- Shadcn semantic colors: `bg-primary`, `text-foreground`, `border-muted`
- Custom brand colors: `text-navy`, `bg-cream`, `border-light-gray`
- Custom palettes: `bg-sunglow-500`, `text-winter-sky-700`, `bg-butter-800`

## 🔧 Configuration

### components.json

The shadcn CLI is configured to generate flat files and use explicit paths:

```json
{
  "aliases": {
    "components": "@shadcn/components",
    "utils": "@shadcn/lib/utils",
    "ui": "@shadcn/ui",
    "lib": "@shadcn/lib",
    "hooks": "@shadcn/hooks"
  },
  "tailwind": {
    "css": "app/modules/shadcn/styles/shadcn.css"
  }
}
```

## 📝 Adding New Components

To add a new shadcn component:

1. Install via CLI

   ```bash
   npx shadcn@latest add <component-name>
   ```

2. Files are placed directly under

   ```
   app/modules/shadcn/ui/<component-name>.tsx
   ```

3. Import by path (no barrel required)

   ```typescript
   import { <Component> } from '@shadcn/ui/<component-name>';
   ```

## ✨ Benefits

- ✅ **Modularity** - Self-contained, easy to maintain
- ✅ **Portability** - Can be extracted to separate package
- ✅ **Clear Separation** - UI library vs app-specific components
- ✅ **Better DX** - Single import source for all UI primitives
- ✅ **Easier Updates** - shadcn CLI updates isolated to one module
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Tree Shaking** - Modern bundlers can optimize imports

## 🔗 Related

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Sonner Toast](https://sonner.emilkowal.ski/)

## 📄 License

Part of the Datum Cloud Portal project.
