# Badge Components

Centralized badge components for displaying status and error information across the application.

## Components

### BadgeStatus

Universal status badge component that displays resource status with optional tooltips and icons.

**Features:**
- Supports multiple status types (success, pending, error, etc.)
- Optional tooltip with status messages
- Configurable icons
- Legacy `IControlPlaneStatus` support

**Usage:**

```tsx
import { BadgeStatus } from '@/components/badge/badge-status';

// Basic usage
<BadgeStatus
  status="success"
  label="Active"
/>

// With tooltip
<BadgeStatus
  status="pending"
  label="Provisioning"
  tooltipText="Resource is being provisioned"
  showIcon={true}
/>

// Custom icon
import { AlertCircle } from 'lucide-react';
<BadgeStatus
  status="error"
  label="Critical"
  tooltipText="Service unavailable"
  showIcon={true}
  customIcon={<AlertCircle className="size-3" />}
/>

// With legacy IControlPlaneStatus
<BadgeStatus
  status={transformedStatus}
  showTooltip={true}
/>
```

---

### BadgeProgrammingError

Specialized badge for displaying K8s Programmed condition errors. Highly flexible with configurable error reasons.

**Features:**
- Automatic error detection based on `isProgrammed` condition
- Configurable error reason filtering
- Default error reasons from centralized constants
- Support for custom error reason lists
- Option to show all errors without filtering

**Usage:**

#### 1. Basic Usage (Default Error Reasons)

Uses default error reasons:
- `InvalidDNSRecordSet`
- `ProgrammingFailed`
- `ConfigurationError`
- `ValidationFailed`

```tsx
import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';

<BadgeProgrammingError
  isProgrammed={record.isProgrammed}
  programmedReason={record.programmedReason}
  statusMessage={record.statusMessage}
/>
```

#### 2. Custom Error Reasons

Define your own error reason list for specific use cases:

```tsx
<BadgeProgrammingError
  isProgrammed={record.isProgrammed}
  programmedReason={record.programmedReason}
  statusMessage={record.statusMessage}
  errorReasons={['InvalidConfiguration', 'SyncFailed', 'DeploymentError']}
/>
```

#### 3. Show All Errors (No Filtering)

Pass `null` to show error badge for ANY programming failure:

```tsx
<BadgeProgrammingError
  isProgrammed={record.isProgrammed}
  programmedReason={record.programmedReason}
  statusMessage={record.statusMessage}
  errorReasons={null}
/>
```

#### 4. Real-world Example: DNS Records Table

```tsx
import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';

const DnsRecordTable = ({ records }) => {
  return (
    <DataTable
      columns={[
        {
          header: 'Type',
          cell: ({ row }) => (
            <div className="flex items-center gap-2">
              <Badge type="quaternary">{row.original.type}</Badge>

              {/* Show error badge for InvalidDNSRecordSet only */}
              <BadgeProgrammingError
                isProgrammed={row.original.isProgrammed}
                programmedReason={row.original.programmedReason}
                statusMessage={row.original.statusMessage}
                errorReasons={['InvalidDNSRecordSet']}
              />
            </div>
          ),
        },
      ]}
      data={records}
    />
  );
};
```

---

## Best Practices

### 1. Choose the Right Error Reason List
- **Default (no prop)**: Use when displaying all common programming errors
- **Custom array**: Use for resource-specific error handling (e.g., `['InvalidDNSRecordSet']` for DNS)
- **null**: Use when you want to show all programming errors without filtering

### 2. Consistent Usage Across Similar Components
If you have multiple tables showing the same resource type, use the same `errorReasons` configuration.

```tsx
// DNS Records Overview Table
<BadgeProgrammingError errorReasons={['InvalidDNSRecordSet']} {...props} />

// DNS Records Detail Table
<BadgeProgrammingError errorReasons={['InvalidDNSRecordSet']} {...props} />
```

### 3. Document Custom Error Reasons
When using custom error reasons, add a comment explaining the logic:

```tsx
// Only show certificate-specific errors in this table
<BadgeProgrammingError
  errorReasons={[
    'CertificateValidationFailed',
    'CertificateExpired',
    'InvalidCertificate',
  ]}
  {...props}
/>
```

---

## Migration Guide

If you have existing custom error badge implementations:

### Before (Custom Implementation)
```tsx
{row.original.isProgrammed === false &&
  row.original.programmedReason === 'InvalidDNSRecordSet' && (
    <Tooltip message={row.original.statusMessage} ...>
      <Badge type="danger" theme="solid" ...>
        <TriangleAlertIcon className="size-3" />
        <span>Error</span>
      </Badge>
    </Tooltip>
  )}
```

### After (Using BadgeProgrammingError)
```tsx
import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { DNS_ERROR_REASONS } from '@/constants/k8s-error-reasons';

<BadgeProgrammingError
  isProgrammed={row.original.isProgrammed}
  programmedReason={row.original.programmedReason}
  statusMessage={row.original.statusMessage}
  errorReasons={DNS_ERROR_REASONS}
/>
```

**Benefits:**
- 14 lines → 4 lines
- Consistent styling across app
- Centralized error reason management
- Type-safe with TypeScript
- Easy to update/maintain

---

## Type Definitions

```tsx
interface BadgeStatusProps {
  status?: string | IControlPlaneStatus;
  label?: string;
  showIcon?: boolean;
  showTooltip?: boolean;
  tooltipText?: string | ReactNode;
  className?: string;
  badgeType?: BadgeProps['type'];
  badgeTheme?: BadgeProps['theme'];
  customIcon?: ReactNode;
}

interface BadgeProgrammingErrorProps {
  isProgrammed?: boolean;
  programmedReason?: string;
  statusMessage?: string;
  className?: string;
  errorReasons?: string[] | null;
}
```
