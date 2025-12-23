# Datum UI Kit

**Datum's Design System** built on top of [shadcn/ui](https://ui.shadcn.com/) primitives.

## 📁 Structure

```
app/modules/datum-ui/
├── README.md                     # This file
├── index.ts                      # Main barrel export
│
├── styles/
│   ├── index.ts                  # Styles barrel export
│   ├── datum-theme.css           # Datum brand colors & theme
│   └── animations.css            # Custom animations
│
├── components/
│   ├── index.ts                  # Components barrel export
│   │
│   ├── alert/                    # Extended: success/info/warning variants
│   ├── avatar-stack/             # Custom: Stacked avatars
│   ├── badge/                    # Extended: sunglow/butter variants
│   ├── button/                   # Extended: dashed variant + isLoading
│   ├── calendar/                 # Custom: RTL support, custom variants
│   ├── calendar-date-picker/    # Custom: Enhanced date picker
│   ├── dropdown/                 # Extended: destructive MenuItem
│   ├── icons/                    # Icon wrapper for Lucide icons
│   ├── input-number/            # Custom: Number input with stepper
│   ├── input-with-addons/       # Custom: Input with addons
│   ├── sidebar/                 # Custom: Complete sidebar system
│   ├── stepper/                 # Custom: Step indicator
│   ├── tabs/                    # Extended: TabsLinkTrigger for routing
│   └── tag-input/               # Custom: Tag/chip input
│
├── hooks/
│   └── index.ts
│
└── utils/
    ├── index.ts
    └── cn.ts                     # Re-export from shadcn
```

## 🎨 Design System

### Brand Colors

Datum's brand identity colors:

- **Navy** (`--color-navy`): #0c1d31 - Primary brand color
- **Cream** (`--color-cream`): #f6f6f5 - Secondary brand color
- **Orange** (`--color-orange`): #ff6b35 - Accent color
- **Tuscany** (`--color-tuscany`): #c49d9d - Warm accent

### Color Palettes

**Sunglow Palette** - 10-scale warm palette
**Winter Sky Palette** - 4-scale cool palette
**Butter Palette** - 3-scale yellow palette

### State Colors

- **Success**: 3-scale green palette
- **Info**: 3-scale blue palette

## 🚀 Usage

### Import Pattern

```typescript
// Datum UI components (custom + extended)
import {
  Button,
  // With dashed variant + isLoading
  Badge,
  // With sunglow/butter variants
  Alert,
  // With success/info/warning
  AvatarStack,
  // Custom component
  InputNumber,
  // Custom component
  Sidebar, // Custom sidebar system
} from '@/modules/datum-ui';
// Vanilla shadcn components
import {
  Avatar,
  // Pure shadcn
  Checkbox,
  // Pure shadcn
  Dialog,
  // Pure shadcn
  Label, // Pure shadcn
} from '@shadcn';
```

### Component Examples

#### Button with Loading

```typescript
import { Button } from '@/modules/datum-ui';

<Button variant="dashed" isLoading={loading}>
  Save Changes
</Button>
```

#### Alert with Variants

```typescript
import { Alert } from '@/modules/datum-ui';

<Alert variant="success">Operation completed!</Alert>
<Alert variant="info">New updates available</Alert>
<Alert variant="warning">Please review this</Alert>
```

#### Badge with Datum Colors

```typescript
import { Badge } from '@/modules/datum-ui';

<Badge variant="sunglow">Hot</Badge>
<Badge variant="butter">New</Badge>
```

#### Input Number

```typescript
import { InputNumber } from '@/modules/datum-ui';

<InputNumber
  stepper={1}
  min={0}
  max={100}
  prefix="$"
  thousandSeparator=","
  onValueChange={(value) => console.log(value)}
/>
```

#### Icons

All icons from [Lucide React](https://lucide.dev/) must be wrapped with the `Icon` component to ensure consistent styling and default props across the application.

```typescript
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Home, PlusIcon, ChevronRight } from 'lucide-react';

// Basic usage with default props
<Icon icon={Home} className="text-icon-primary size-4" />

// Override defaults when needed
<Icon icon={PlusIcon} size={24} strokeWidth={2} className="text-primary" />

// In buttons and other components
<Button icon={<Icon icon={ChevronRight} className="size-4" />}>
  Next
</Button>
```

**Important:** Always use the `Icon` wrapper instead of importing icons directly from `lucide-react`. The wrapper automatically applies:
- Default `strokeWidth={1}`
- Default `absoluteStrokeWidth={true}`
- Default `size={16}`

These defaults can be overridden via props when needed.

## 📦 Components

### Custom Components (12)

Components unique to Datum or heavily customized:

1. **AvatarStack** - Stacked avatars with tooltips
2. **Calendar** - Enhanced calendar with RTL, custom variants
3. **CalendarDatePicker** - Date range picker
4. **Icon** - Wrapper component for Lucide icons with consistent defaults
5. **InputNumber** - Number input with stepper
6. **InputWithAddons** - Input with prefix/suffix slots
7. **Sidebar** - Complete sidebar system with state management
8. **Stepper** - Step indicator/wizard
9. **TagInput** - Tag/chip input

### Extended Components (5)

shadcn components with Datum-specific enhancements:

9. **Alert** - Added success/info/warning variants
10. **Badge** - Added sunglow/butter/secondary variants
11. **Button** - Added dashed variant + isLoading prop
12. **Dropdown** - Added destructive MenuItem variant
13. **Tabs** - Added TabsLinkTrigger for React Router

## 🔧 Development

### Adding New Components

1. Create component folder in `components/`
2. Implement component extending shadcn primitives
3. Export from `components/index.ts`
4. Document usage in this README

### Theming

All Datum brand colors are defined in `styles/datum-theme.css` using CSS custom properties. These integrate with Tailwind CSS via the `@theme` block.

## 📚 Related

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)

---

**Part of Datum Cloud Portal**
