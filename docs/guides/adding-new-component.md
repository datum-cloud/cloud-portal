# Adding a New Component

This guide covers creating components at different layers of the architecture.

---

## Component Layers

```
┌─────────────────────────────────────────────────────┐
│  features/{feature}/components/                       │
│  Feature-specific components (used in one feature)   │
└───────────────────────┬─────────────────────────────┘
                        │ uses
                        ▼
┌─────────────────────────────────────────────────────┐
│  app/components/                                      │
│  Shared app components (used across features)         │
└───────────────────────┬─────────────────────────────┘
                        │ uses
                        ▼
┌─────────────────────────────────────────────────────┐
│  modules/datum-ui/components/                         │
│  Design system (shared across portals)                │
└───────────────────────┬─────────────────────────────┘
                        │ built on
                        ▼
┌─────────────────────────────────────────────────────┐
│  modules/shadcn/ui/                                   │
│  UI primitives (Radix + Tailwind)                     │
└─────────────────────────────────────────────────────┘
```

---

## Decision: Where Does My Component Go?

| Question | Yes → Location |
|----------|----------------|
| Is it a basic primitive (button, input, card)? | shadcn/ui |
| Will it be used across ALL Datum portals? | datum-ui |
| Is it used in 3+ features in this app? | app/components |
| Is it only used in ONE feature? | features/{name}/components |

---

## Creating a shadcn Component

### When to Add

- Need a Radix UI primitive not yet in codebase
- Basic, unstyled component

### How to Add

```bash
# Use the shadcn CLI
npx shadcn@latest add accordion
```

This creates `app/modules/shadcn/ui/accordion.tsx`.

### Usage

```tsx
import { Accordion, AccordionItem } from '@shadcn/ui/accordion';
```

### Rules

- **Don't modify** shadcn files directly
- Customize via **className** props
- Create datum-ui wrapper for custom variants

---

## Creating a datum-ui Component

### When to Add

- Component will be shared across Datum portals
- Has Datum-specific styling or variants
- Extends shadcn with additional functionality

### File Structure

```
app/modules/datum-ui/components/{component-name}/
├── index.ts              # Exports
├── {component}.tsx       # Main component
├── {component}.types.ts  # TypeScript types (optional)
└── README.md             # Documentation (optional)
```

### Example: StatusIndicator

```tsx
// app/modules/datum-ui/components/status-indicator/status-indicator.tsx
import { cn } from '@shadcn/lib/utils';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'pending' | 'error';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  pending: 'bg-yellow-500',
  error: 'bg-red-500',
};

const sizes = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusIndicator({
  status,
  label,
  size = 'md',
  className,
}: StatusIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'rounded-full',
          statusColors[status],
          sizes[size]
        )}
        aria-label={`Status: ${status}`}
      />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
```

### Export from Index

```typescript
// app/modules/datum-ui/components/status-indicator/index.ts
export { StatusIndicator } from './status-indicator';
export type { StatusIndicatorProps } from './status-indicator';
```

### Add to Components Index

```typescript
// app/modules/datum-ui/components/index.ts
export * from './status-indicator';
// ... other exports
```

### Usage

```tsx
import { StatusIndicator } from '@datum-ui/components';

<StatusIndicator status="online" label="Connected" />
```

---

## Creating an App Component

### When to Add

- Used in 3+ features within cloud-portal
- Not generic enough for datum-ui
- Has app-specific patterns

### File Structure

```
app/components/{component-name}/
├── index.ts              # Exports
├── {component}.tsx       # Main component
└── {component}.types.ts  # Types (optional)
```

### Example: PageHeader

```tsx
// app/components/page-header/page-header.tsx
import { cn } from '@shadcn/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumbs && <div className="text-sm">{breadcrumbs}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
```

### Export

```typescript
// app/components/page-header/index.ts
export { PageHeader } from './page-header';
export type { PageHeaderProps } from './page-header';
```

### Usage

```tsx
import { PageHeader } from '@/components/page-header';

<PageHeader
  title="DNS Zones"
  description="Manage your DNS zones"
  actions={<Button>Create Zone</Button>}
/>
```

---

## Creating a Feature Component

### When to Add

- Only used within ONE feature
- Tightly coupled to feature logic
- Won't be reused elsewhere

### File Structure

```
app/features/{feature}/components/
├── index.ts
└── {component}.tsx
```

### Example: ZoneRecordEditor

```tsx
// app/features/dns/components/zone-record-editor.tsx
import { Form } from '@datum-ui/components/new-form';
import { z } from 'zod';

const recordSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT']),
  value: z.string().min(1),
  ttl: z.number().min(60).max(86400),
});

interface ZoneRecordEditorProps {
  zoneId: string;
  record?: {
    name: string;
    type: string;
    value: string;
    ttl: number;
  };
  onSave: (record: z.infer<typeof recordSchema>) => Promise<void>;
  onCancel: () => void;
}

export function ZoneRecordEditor({
  zoneId,
  record,
  onSave,
  onCancel,
}: ZoneRecordEditorProps) {
  return (
    <Form.Root
      schema={recordSchema}
      defaultValues={record}
      onSubmit={onSave}
    >
      <Form.Field name="name" label="Record Name" required>
        <Form.Input placeholder="www" />
      </Form.Field>

      <Form.Field name="type" label="Type" required>
        <Form.Select>
          <Form.SelectItem value="A">A</Form.SelectItem>
          <Form.SelectItem value="AAAA">AAAA</Form.SelectItem>
          <Form.SelectItem value="CNAME">CNAME</Form.SelectItem>
          <Form.SelectItem value="MX">MX</Form.SelectItem>
          <Form.SelectItem value="TXT">TXT</Form.SelectItem>
        </Form.Select>
      </Form.Field>

      <Form.Field name="value" label="Value" required>
        <Form.Input placeholder="192.168.1.1" />
      </Form.Field>

      <Form.Field name="ttl" label="TTL (seconds)" required>
        <Form.Input type="number" placeholder="3600" />
      </Form.Field>

      <div className="flex gap-2 justify-end">
        <Form.Button onClick={onCancel} type="secondary">
          Cancel
        </Form.Button>
        <Form.Submit>Save Record</Form.Submit>
      </div>
    </Form.Root>
  );
}
```

### Export

```typescript
// app/features/dns/components/index.ts
export { ZoneRecordEditor } from './zone-record-editor';
```

### Usage

```tsx
// In feature routes
import { ZoneRecordEditor } from '../components';

<ZoneRecordEditor
  zoneId={zoneId}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

---

## Component Best Practices

### Props Interface

```tsx
// Always define props interface
export interface MyComponentProps {
  // Required props first
  title: string;

  // Optional props with defaults
  size?: 'sm' | 'md' | 'lg';

  // Event handlers
  onClick?: () => void;

  // Children and className always last
  children?: React.ReactNode;
  className?: string;
}
```

### Default Props

```tsx
export function MyComponent({
  title,
  size = 'md',  // Default in destructuring
  onClick,
  children,
  className,
}: MyComponentProps) {
  // ...
}
```

### Composability with cn()

```tsx
import { cn } from '@shadcn/lib/utils';

<div className={cn(
  // Base styles
  'flex items-center gap-2',

  // Conditional styles
  size === 'lg' && 'text-lg',

  // Allow override
  className
)}>
```

### Accessibility

```tsx
// Always include ARIA attributes
<button
  aria-label={label}
  aria-expanded={isOpen}
  aria-controls={contentId}
>

// Use semantic HTML
<nav aria-label="Main navigation">
<main role="main">
<article>
```

---

## Checklist

- [ ] Determined correct layer for component
- [ ] Created proper file structure
- [ ] Defined TypeScript interface for props
- [ ] Used cn() for className handling
- [ ] Added accessibility attributes
- [ ] Exported from index file
- [ ] Added to parent exports (if datum-ui)

---

## Related Documentation

- [UI Overview](../ui/overview.md) - Component hierarchy
- [shadcn Rules](../ui/shadcn-rules.md) - Primitives
- [datum-ui Guide](../ui/datum-ui-guide.md) - Design system
