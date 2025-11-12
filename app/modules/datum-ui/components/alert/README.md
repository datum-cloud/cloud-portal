# Alert Component

A flexible alert component for displaying important messages, notifications, and status information. Extends shadcn Alert with Datum-specific variants: success, info, and warning. Built with class-variance-authority for type-safe styling.

## Features

- **Multiple Variants**: default, secondary, outline, destructive, success, info, warning
- **Icon Support**: Automatic icon positioning with proper spacing
- **Subcomponents**: AlertTitle and AlertDescription for structured content
- **Accessibility**: Proper ARIA role and semantic HTML
- **Dark Mode**: Full dark mode support for all variants
- **Customizable**: Supports custom className and all standard HTML div attributes

## Usage

```tsx
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';
import { AlertCircle } from 'lucide-react';

// Basic usage
<Alert>
  <AlertTitle>Alert Title</AlertTitle>
  <AlertDescription>Alert description text goes here.</AlertDescription>
</Alert>

// With icon
<Alert variant="destructive">
  <AlertCircle className="size-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>

// Success variant
<Alert variant="success">
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>Operation completed successfully.</AlertDescription>
</Alert>
```

## Props

### Alert

| Prop        | Type                                                                                                 | Default     | Description                      |
| ----------- | ---------------------------------------------------------------------------------------------------- | ----------- | -------------------------------- |
| `variant`   | `'default' \| 'secondary' \| 'outline' \| 'destructive' \| 'success' \| 'info' \| 'warning'` | `'default'` | Alert variant/style               |
| `closable`  | `boolean`                                                                                            | `false`     | Whether the alert can be closed  |
| `onClose`   | `() => void`                                                                                         | -           | Callback when close button is clicked |
| `className` | `string`                                                                                             | -           | Additional CSS classes           |
| `...props`  | `React.HTMLAttributes<HTMLDivElement>`                                                               | -           | All standard HTML div attributes |

### AlertTitle

| Prop        | Type                                    | Default | Description            |
| ----------- | --------------------------------------- | ------- | ---------------------- |
| `className` | `string`                                | -       | Additional CSS classes |
| `...props`  | `React.HTMLAttributes<HTMLDivElement>` | -       | Standard div attributes |

### AlertDescription

| Prop        | Type                                    | Default | Description            |
| ----------- | --------------------------------------- | ------- | ---------------------- |
| `className` | `string`                                | -       | Additional CSS classes |
| `...props`  | `React.HTMLAttributes<HTMLDivElement>` | -       | Standard div attributes |

## Variants

### Default

Standard alert with neutral styling.

```tsx
<Alert variant="default">
  <AlertTitle>Default Alert</AlertTitle>
  <AlertDescription>This is a default alert message.</AlertDescription>
</Alert>
```

### Secondary

Secondary alert with muted styling.

```tsx
<Alert variant="secondary">
  <AlertTitle>Secondary Alert</AlertTitle>
  <AlertDescription>This is a secondary alert message.</AlertDescription>
</Alert>
```

### Outline

Bordered alert with transparent background.

```tsx
<Alert variant="outline">
  <AlertTitle>Outline Alert</AlertTitle>
  <AlertDescription>This is an outline alert message.</AlertDescription>
</Alert>
```

### Destructive

Used for error messages and critical alerts.

```tsx
<Alert variant="destructive">
  <AlertCircle className="size-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>This is a destructive alert message.</AlertDescription>
</Alert>
```

### Success

Used for success messages and positive feedback.

```tsx
<Alert variant="success">
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>This is a success alert message.</AlertDescription>
</Alert>
```

### Info

Used for informational messages.

```tsx
<Alert variant="info">
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>This is an info alert message.</AlertDescription>
</Alert>
```

### Warning

Used for warning messages and cautionary alerts.

```tsx
<Alert variant="warning">
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>This is a warning alert message.</AlertDescription>
</Alert>
```

## Examples

### Basic Alerts

```tsx
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';

function BasicAlerts() {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>This is a default alert message.</AlertDescription>
      </Alert>
      <Alert variant="secondary">
        <AlertTitle>Secondary Alert</AlertTitle>
        <AlertDescription>This is a secondary alert message.</AlertDescription>
      </Alert>
    </div>
  );
}
```

### Alerts with Icons

Icons are automatically positioned when placed as the first child of the Alert component.

```tsx
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';
import { AlertCircle, CheckCircle, Info, TriangleAlert } from 'lucide-react';

function IconAlerts() {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>An error occurred while processing your request.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CheckCircle className="size-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Your changes have been saved successfully.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info className="size-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>Here's some helpful information for you.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert className="size-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Please review this before proceeding.</AlertDescription>
      </Alert>
    </div>
  );
}
```

### Status Alerts

```tsx
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function StatusAlerts() {
  return (
    <div className="space-y-4">
      <Alert variant="success">
        <CheckCircle className="size-4" />
        <AlertTitle>Operation Successful</AlertTitle>
        <AlertDescription>Your request has been processed successfully.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <XCircle className="size-4" />
        <AlertTitle>Operation Failed</AlertTitle>
        <AlertDescription>There was an error processing your request.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertCircle className="size-4" />
        <AlertTitle>Action Required</AlertTitle>
        <AlertDescription>Please verify your information before continuing.</AlertDescription>
      </Alert>
    </div>
  );
}
```

### Alerts with Rich Content

```tsx
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';
import { AlertCircle } from 'lucide-react';

function RichContentAlerts() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>Domain Validation Errors</AlertTitle>
      <AlertDescription>
        <div className="space-y-1">
          <p>The following issues must be resolved:</p>
          <ul className="list-disc pl-5">
            <li>DNS records are not configured correctly</li>
            <li>HTTP verification token is missing</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

### Alerts without Title

```tsx
import { Alert, AlertDescription } from '@datum-ui/components';

function SimpleAlerts() {
  return (
    <div className="space-y-4">
      <Alert variant="info">
        <AlertDescription>This is a simple alert without a title.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertDescription>Operation completed successfully.</AlertDescription>
      </Alert>
    </div>
  );
}
```

### Closable Alerts

Alerts can be made closable by setting the `closable` prop to `true` and providing an `onClose` callback.

```tsx
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

function ClosableAlerts() {
  const [showAlert, setShowAlert] = useState(true);

  if (!showAlert) return null;

  return (
    <Alert variant="info" closable onClose={() => setShowAlert(false)}>
      <AlertCircle className="size-4" />
      <AlertTitle>Dismissible Alert</AlertTitle>
      <AlertDescription>
        This alert can be closed by clicking the X button in the top-right corner.
      </AlertDescription>
    </Alert>
  );
}
```

Or with multiple closable alerts:

```tsx
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';
import { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

function MultipleClosableAlerts() {
  const [alerts, setAlerts] = useState([
    { id: 1, variant: 'success' as const, message: 'Operation completed successfully' },
    { id: 2, variant: 'warning' as const, message: 'Please review your settings' },
  ]);

  const removeAlert = (id: number) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.variant}
          closable
          onClose={() => removeAlert(alert.id)}>
          {alert.variant === 'success' ? (
            <CheckCircle className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          <AlertTitle>{alert.variant === 'success' ? 'Success' : 'Warning'}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

### Custom Styling

```tsx
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';

function CustomStyledAlerts() {
  return (
    <div className="space-y-4">
      <Alert variant="info" className="shadow-md">
        <AlertTitle className="text-lg">Custom Styled Alert</AlertTitle>
        <AlertDescription className="text-base">
          This alert has custom styling applied.
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

## Icon Positioning

Icons are automatically positioned when placed as the first child of the Alert component. The component uses CSS selectors to:

- Position icons absolutely in the top-left corner
- Add left padding to content after icons
- Adjust vertical alignment for proper spacing

```tsx
<Alert variant="info">
  <Info className="size-4" /> {/* Icon must be first child */}
  <AlertTitle>Title</AlertTitle>
  <AlertDescription>Description</AlertDescription>
</Alert>
```

## Styling

The alert component uses Tailwind CSS classes and supports:

- **Custom Classes**: Add additional classes via the `className` prop
- **Dark Mode**: Automatic dark mode support for all variants
- **Icon Styling**: Icons automatically inherit variant colors
- **Responsive**: Full-width by default, adapts to container

### Custom Styling

```tsx
<Alert variant="success" className="shadow-lg border-2">
  <AlertTitle className="text-lg font-bold">Custom Alert</AlertTitle>
  <AlertDescription className="text-base">Custom styled description.</AlertDescription>
</Alert>
```

## Accessibility

The alert component includes:

- Proper `role="alert"` attribute for screen readers
- Semantic HTML structure with title and description
- Icon color inheritance for visual consistency
- Keyboard navigation support
- Screen reader compatibility

## Dependencies

- `class-variance-authority`: For type-safe variant styling
- `@shadcn/lib/utils`: For class name utilities

## Migration from shadcn Alert

The Datum Alert component extends the shadcn Alert with additional variants. If migrating:

1. Replace imports with the Datum Alert module
2. Update variant names if needed (e.g., use `success`, `info`, `warning` variants)
3. Icons work the same way - place as first child
4. Test all alert variants and dark mode

```tsx
// Old (shadcn)
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
<Alert variant="destructive">...</Alert>

// New (Datum)
import { Alert, AlertTitle, AlertDescription } from '@datum-ui/components';
<Alert variant="destructive">...</Alert>
// Or use new variants
<Alert variant="success">...</Alert>
<Alert variant="info">...</Alert>
<Alert variant="warning">...</Alert>
```

## Notes

- Icons must be placed as the first child of the Alert component for proper positioning
- The component uses `w-full` by default, so alerts take full width of their container
- AlertTitle and AlertDescription are optional - you can use just one or neither
- The component automatically handles spacing when icons are present
- All variants support dark mode with appropriate color adjustments
- Alerts are not closable by default - set `closable={true}` and provide an `onClose` callback to enable the close button
- The close button is positioned in the top-right corner and inherits the alert's variant color
- When closable, the alert automatically adds right padding to accommodate the close button

