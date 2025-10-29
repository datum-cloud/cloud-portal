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
import { useIsMobile } from '@shadcn/hooks/use-mobile';
// Utils
import { cn } from '@shadcn/lib/utils';
import { Button } from '@shadcn/ui/button';
import { Card } from '@shadcn/ui/card';
```

### Styles

Include styles in your app root (or a global layout):

```typescript
// Option A: import both explicitly
// Option B: single convenience entry
import '@/modules/shadcn/style.css';
import '@/modules/shadcn/styles/animations.css';
import '@/modules/shadcn/styles/shadcn.css';
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
import { useToast } from '@/modules/shadcn';

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
import { useIsMobile } from '@/modules/shadcn';

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
import { cn } from '@/modules/shadcn';

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

Theme configuration is in `app/modules/shadcn/styles/shadcn.css`:

### CSS Variables

```css
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(240 10% 3.9%);
  --primary: var(--color-navy);
  --primary-foreground: var(--color-cream);
  /* ... more variables */
}

.dark {
  --background: hsl(240 10% 3.9%);
  --foreground: hsl(0 0% 98%);
  /* ... dark mode overrides */
}
```

### Custom Brand Colors

Datum-specific colors:

- `--color-navy`: #0c1d31
- `--color-cream`: #f6f6f5
- `--color-light-gray`: #e8e7e4
- `--color-lime-green`: #e6f59f
- `--color-tuscany`: #c49d9d
- And more...

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
