# UI Components Overview

This document explains the component hierarchy and when to use each layer.

---

## Component Hierarchy

```
┌────────────────────────────────────────────────────────────────┐
│                       features/                                 │
│   Feature-specific components (only used within that feature)   │
│   Example: features/dns/components/ZoneWizard                   │
└────────────────────────────────┬───────────────────────────────┘
                                 │ uses
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                       components/                               │
│   Core shared components (used across all parts of the app)     │
│   Example: PageHeader, EmptyState, ConfirmDialog                │
└────────────────────────────────┬───────────────────────────────┘
                                 │ uses
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                        datum-ui                                 │
│   Datum's component library (shared across all portals)         │
│   Future: will be extracted to separate npm package             │
│   Example: DataTable, Form, Badge, Alert, Grid                  │
└────────────────────────────────┬───────────────────────────────┘
                                 │ built on
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                        shadcn/ui                                │
│   UI primitives (Radix + Tailwind)                              │
│   Example: Button, Input, Dialog, Select, Card                  │
└────────────────────────────────────────────────────────────────┘
```

---

## Decision Tree: Where Does My Component Go?

```
Need a UI component?
│
├─► Is it a basic primitive (button, input, dialog)?
│   └─► Use or add to shadcn/ui
│
├─► Is it a composed component that could be used across ALL Datum portals?
│   └─► Add to datum-ui
│       (DataTable, Form, Badge with Datum variants)
│
├─► Is it used across multiple features in THIS app?
│   └─► Add to app/components/
│       (PageHeader, EmptyState, ConfirmDialog)
│
└─► Is it only used within ONE feature?
    └─► Add to features/{feature}/components/
        (ZoneWizard, RecordEditor)
```

---

## Quick Reference Table

| Scenario                           | Location                   | Import                            |
| ---------------------------------- | -------------------------- | --------------------------------- |
| Basic button, input, card          | `modules/shadcn/ui/`       | `@shadcn/ui/button`               |
| Data table with filtering          | `modules/datum-ui/`        | `@datum-ui/components/data-table` |
| Form with validation               | `modules/datum-ui/`        | `@datum-ui/components/new-form`   |
| Datum badge variants               | `modules/datum-ui/`        | `@datum-ui/components`            |
| Page header (shared)               | `components/`              | `@/components/page-header`        |
| DNS zone wizard (feature-specific) | `features/dns/components/` | Relative import                   |

---

## Layer Responsibilities

### shadcn/ui (`app/modules/shadcn/`)

**What it is:** Unstyled, accessible UI primitives from Radix UI + Tailwind CSS.

**Contains:**

- Button, Input, Textarea
- Dialog, Sheet, Popover
- Select, Checkbox, Radio
- Card, Table, Tabs
- Tooltip, HoverCard

**Rules:**

- Keep pristine - don't modify source files
- Import by file path: `@shadcn/ui/button`
- Customize via Tailwind classes, not file edits

→ See: [shadcn Rules](./shadcn-rules.md)

### datum-ui (`app/modules/datum-ui/`)

**What it is:** Datum's design system built on shadcn primitives.

**Contains:**

- DataTable (with filters, sorting, pagination)
- Form library (Conform + Zod)
- Badge, Alert (Datum variants)
- Grid system
- Toast notifications

**Rules:**

- Components should be portal-agnostic
- Will become separate npm package
- Import from `@datum-ui/components`

→ See: [datum-ui Guide](./datum-ui-guide.md)

### components/ (`app/components/`)

**What it is:** Core shared components for THIS portal.

**Contains:**

- PageHeader
- EmptyState
- ConfirmDialog
- ErrorBoundary
- LoadingSpinner

**Rules:**

- Used in 3+ places across features
- Specific to cloud-portal patterns
- Not generic enough for datum-ui

### features/ (`app/features/`)

**What it is:** Feature-specific components.

**Contains:**

- DNS: ZoneWizard, RecordEditor
- Organization: MemberInvite
- Project: ProjectSelector

**Rules:**

- Only used within that feature
- Tightly coupled to feature logic
- Import with relative paths

---

## Import Examples

```typescript
// shadcn primitives
// Feature components (relative import)
import { ZoneWizard } from './components/zone-wizard';
import { EmptyState } from '@/components/empty-state';
// Shared app components
import { PageHeader } from '@/components/page-header';
import { Badge, Alert } from '@datum-ui/components';
// datum-ui components
import { DataTable } from '@datum-ui/components/data-table';
import { Form } from '@datum-ui/components/new-form';
import { cn } from '@shadcn/lib/utils';
import { Button } from '@shadcn/ui/button';
import { Dialog, DialogContent } from '@shadcn/ui/dialog';
```

---

## Future: datum-ui as Package

The `datum-ui` module will be extracted to a separate npm package:

```typescript
// Future usage
import { DataTable, Form, Badge } from '@datum/ui';
```

When adding to datum-ui, ensure components are:

- Portal-agnostic (no cloud-portal-specific logic)
- Self-contained (no external dependencies except shadcn)
- Well-documented (README in component folder)

---

## Related Documentation

- [shadcn Rules](./shadcn-rules.md) - shadcn/ui conventions
- [datum-ui Guide](./datum-ui-guide.md) - Datum components
- [Theming](./theming.md) - Theme system
- [Forms](./forms.md) - Form library
- [Adding New Component](../guides/adding-new-component.md) - Step-by-step guide
