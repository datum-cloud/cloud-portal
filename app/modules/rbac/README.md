# RBAC Module

Role-Based Access Control (RBAC) module for the Cloud Portal application. This module provides comprehensive permission checking and enforcement at multiple layers: middleware, components, and hooks.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Middleware Protection](#middleware-protection)
  - [Component-Level Protection](#component-level-protection)
  - [Hook-Based Checks](#hook-based-checks)
  - [Programmatic Checks](#programmatic-checks)
- [API Reference](#api-reference)
- [Caching Strategy](#caching-strategy)
- [Testing](#testing)
- [Future Improvements](#future-improvements)
- [Troubleshooting](#troubleshooting)

---

## Overview

The RBAC module integrates with Kubernetes-style authorization API (`self-subject-access-review`) to check user permissions. It provides:

- **Server-side protection**: Middleware for route protection
- **Client-side UX**: Components and hooks for conditional rendering
- **Caching**: Aggressive caching (5-minute TTL) for performance
- **Type safety**: Full TypeScript support with Zod validation
- **Multiple patterns**: Hooks, components, HOCs, and middleware

### Key Features

✅ Namespace-scoped permissions
✅ 5-minute cache TTL for performance
✅ Hide elements by default (no fallback UI)
✅ Both redirect and error display options
✅ Development debug tools
✅ Bulk permission checking

---

## Architecture

### Overview Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │PermissionGate│  │PermissionCheck│  │withPermission│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                   │                  │              │
│         └───────────────────┴──────────────────┘              │
│                             ▼                                 │
│                    ┌────────────────┐                        │
│                    │   React Hooks   │                        │
│                    │  usePermissions │                        │
│                    │ useHasPermission│                        │
│                    │usePermissionCheck│                       │
│                    └────────┬───────┘                        │
└─────────────────────────────┼─────────────────────────────────┘
                              ▼
                    ┌────────────────┐
                    │  RBAC Context   │
                    │  & Provider     │
                    └────────┬───────┘
                             ▼
          ┌──────────────────┴──────────────────┐
          ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐
│  BFF API Routes  │◄─────────────────│     Middleware    │
│  /api/permissions│  HTTP POST       │  rbacMiddleware   │
│  - check         │  (with cookies)  │  (fetch-based)    │
│  - bulk-check    │                  └───────────────────┘
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│   RbacService      │
│  (Cached Results)  │
└────────┬───────────┘
         ▼
┌────────────────────┐
│  Self-Subject API   │
│  Access Review      │
│  (K8s Authorization)│
└─────────────────────┘
```

### Key Architectural Principles

1. **Single Source of Truth**: All permission checks flow through BFF API
2. **No Context Dependency**: Middleware uses fetch instead of injected context
3. **Automatic Caching**: Built-in at BFF level (5-minute TTL)
4. **Cookie Forwarding**: Maintains session across internal requests
5. **Consistent Pattern**: Same approach as `org-type.middleware.ts`

---

## Installation

The RBAC module is already integrated into the codebase. To use it:

1. **Wrap your app with `RbacProvider`** (usually in root layout):

```tsx
// app/root.tsx or app/routes/_layout.tsx
import { RbacProvider } from '@/modules/rbac';

export default function Layout() {
  const organizationId = useOrganizationId(); // Get from your context

  return (
    <RbacProvider organizationId={organizationId}>
      <Outlet />
    </RbacProvider>
  );
}
```

2. **Start using RBAC features** in your routes and components!

---

## Quick Start

### 1. Protect a Route with Middleware

```tsx
// app/routes/workloads/$namespace/$name.tsx
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createRbacMiddleware } from '@/modules/rbac';

export const loader = withMiddleware(
  async ({ context, params }) => {
    // Your loader logic - only runs if permission check passes
    const workload = await getWorkload(params.name);
    return { workload };
  },
  authMiddleware,
  createRbacMiddleware({
    resource: 'workloads',
    verb: 'get',
    group: 'apps',
    namespace: (params) => params.namespace,
    name: (params) => params.name,
  })
);
```

### 2. Conditionally Render UI with Component

```tsx
import { PermissionGate } from '@/modules/rbac/components';

function WorkloadActions({ workload }) {
  return (
    <div>
      {/* Always visible */}
      <ViewButton />

      {/* Only shown if user has delete permission */}
      <PermissionGate
        resource="workloads"
        verb="delete"
        group="apps"
        namespace={workload.namespace}>
        <DeleteButton />
      </PermissionGate>
    </div>
  );
}
```

### 3. Check Permission with Hook

```tsx
import { useHasPermission } from '@/modules/rbac';

function CreateWorkloadButton({ namespace }) {
  const { hasPermission, isLoading } = useHasPermission('workloads', 'create', {
    namespace,
    group: 'apps',
  });

  if (isLoading) return <Skeleton />;
  if (!hasPermission) return null;

  return <button onClick={handleCreate}>Create Workload</button>;
}
```

---

## Usage

### Middleware Protection

Middleware provides **server-side enforcement** of permissions. Use it to protect routes before they load.

> **🎉 New in v2.0**: Middleware now uses a **fetch-based approach** for better reliability and consistency. No context dependencies required!

#### Basic Usage

```tsx
import { createRbacMiddleware } from '@/modules/rbac';

export const loader = withMiddleware(
  async ({ context, params }) => {
    // Loader logic
  },
  authMiddleware,
  createRbacMiddleware({
    resource: 'secrets',
    verb: 'list',
    namespace: 'default',
  })
);
```

#### How It Works (v2.0)

The middleware now calls the BFF API internally instead of using injected context:

```typescript
// Internal implementation (simplified)
const checkResponse = await fetch(`${process.env.APP_URL}/api/permissions/check`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: request.headers.get('Cookie') || '', // Forward authentication
    'X-Permission-Check-Source': 'rbac-middleware',
  },
  body: JSON.stringify({
    organizationId: extractedFromUrl,
    resource: 'secrets',
    verb: 'list',
    namespace: 'default',
  }),
});
```

**Benefits:**

- ✅ No dependency on `request.context`
- ✅ Works independently of middleware chain order
- ✅ Automatic caching via BFF API
- ✅ Consistent with `org-type.middleware.ts` pattern
- ✅ Easier to test and debug

#### Dynamic Values from Route Params

```tsx
createRbacMiddleware({
  resource: 'workloads',
  verb: 'update',
  group: 'apps',
  namespace: (params) => params.namespace, // Extract from route params
  name: (params) => params.name,
});
```

#### Custom Error Handling

The middleware supports three ways to handle permission denials:

**1. Default behavior - Throw error (caught by ErrorBoundary):**

```tsx
createRbacMiddleware({
  resource: 'workloads',
  verb: 'delete',
  // onDenied defaults to 'error'
});
```

**2. Simple redirect:**

```tsx
createRbacMiddleware({
  resource: 'workloads',
  verb: 'delete',
  onDenied: 'redirect',
  redirectTo: '/dashboard', // Optional, defaults to '/error/403'
});
```

**3. Custom handler function (for advanced scenarios like toast notifications):**

```tsx
createRbacMiddleware({
  resource: 'domains',
  verb: 'delete',
  onDenied: ({ errorMessage, request, resource, verb }) => {
    // Full control over the response
    // Example: redirect to previous page
    const referer = request.headers.get('Referer') || '/dashboard';
    return redirect(referer);
  },
});
```

**Handler Options:**

- **`'error'`** (default): Throw `AuthorizationError` (caught by ErrorBoundary)
- **`'redirect'`**: Redirect to error page (uses `redirectTo`)
- **Custom function**: Full control over response - receives context with:
  - `errorMessage`: Human-readable error message
  - `resource`, `verb`, `group`, `namespace`, `name`: Permission details
  - `request`: Original Request object

#### Convenience Methods

```tsx
import { rbacMiddleware } from '@/modules/rbac';

// Instead of createRbacMiddleware, use shortcuts:
rbacMiddleware.canList('workloads', 'apps', 'default');
rbacMiddleware.canGet('secrets', '', 'default', 'my-secret');
rbacMiddleware.canCreate('configmaps', '', 'default');
rbacMiddleware.canUpdate('workloads', 'apps', 'default', 'my-app');
rbacMiddleware.canDelete('services', '', 'default', 'my-service');
```

---

### Component-Level Protection

Components provide **client-side UI control** based on permissions.

#### `<PermissionGate>`

Conditionally render children based on a single permission.

```tsx
import { PermissionGate } from '@/modules/rbac/components';

<PermissionGate
  resource="workloads"
  verb="delete"
  namespace="production"
  group="apps"
  fallback={<button disabled>Delete (No Permission)</button>}
  showLoading={true}
  loadingComponent={<Skeleton />}>
  <DeleteWorkloadButton />
</PermissionGate>;
```

**Props:**

- `resource` (required): Resource type (e.g., 'workloads', 'secrets')
- `verb` (required): Permission verb ('get', 'list', 'create', 'update', 'delete', etc.)
- `group` (optional): API group (default: '')
- `namespace` (optional): Namespace scope
- `name` (optional): Specific resource name
- `fallback` (optional): Component to show if permission denied (default: null)
- `showLoading` (optional): Show loading state (default: false)
- `loadingComponent` (optional): Component to show while loading

#### `<PermissionCheck>`

Check multiple permissions with AND/OR logic.

```tsx
import { PermissionCheck } from '@/modules/rbac/components';

// Require ALL permissions (AND)
<PermissionCheck
  checks={[
    { resource: 'workloads', verb: 'create', group: 'apps' },
    { resource: 'secrets', verb: 'list' }
  ]}
  operator="AND"
  fallback={<div>Insufficient permissions</div>}
>
  <CreateWorkloadWithSecretsForm />
</PermissionCheck>

// Require ANY permission (OR)
<PermissionCheck
  checks={[
    { resource: 'workloads', verb: 'update', group: 'apps' },
    { resource: 'workloads', verb: 'patch', group: 'apps' }
  ]}
  operator="OR"
>
  <EditButton />
</PermissionCheck>
```

**Props:**

- `checks` (required): Array of permission checks
- `operator` (optional): 'AND' or 'OR' (default: 'AND')
- `fallback`, `showLoading`, `loadingComponent`: Same as PermissionGate

#### `withPermission` HOC

Wrap components with permission checking.

```tsx
import { withPermission } from '@/modules/rbac/components';

const DeleteButton = ({ onClick }) => <button onClick={onClick}>Delete</button>;

const ProtectedDeleteButton = withPermission(DeleteButton, {
  resource: 'workloads',
  verb: 'delete',
  group: 'apps',
  fallback: <button disabled>Delete (No Access)</button>,
});

// Usage
<ProtectedDeleteButton onClick={handleDelete} />;
```

---

### Hook-Based Checks

Hooks provide **programmatic access** to permission checks in your components.

#### `usePermissions()`

Access the RBAC context directly.

```tsx
import { usePermissions } from '@/modules/rbac';

function MyComponent() {
  const { checkPermission, checkPermissions, invalidateCache, organizationId } = usePermissions();

  const handleCheck = async () => {
    const result = await checkPermission({
      resource: 'workloads',
      verb: 'list',
      namespace: 'default',
    });

    console.log('Allowed:', result.allowed);
  };

  return <button onClick={handleCheck}>Check Permission</button>;
}
```

#### `useHasPermission()`

Check a single permission with loading state.

```tsx
import { useHasPermission } from '@/modules/rbac';

function Component() {
  const { hasPermission, isLoading, isError, error, refetch } = useHasPermission(
    'workloads',
    'delete',
    {
      namespace: 'default',
      group: 'apps',
      name: 'my-app',
      enabled: true, // Enable/disable query (default: true)
      staleTime: 5 * 60 * 1000, // 5 minutes (default)
      cacheTime: 10 * 60 * 1000, // 10 minutes (default)
    }
  );

  if (isLoading) return <Skeleton />;
  if (isError) return <div>Error: {error.message}</div>;

  return hasPermission ? <DeleteButton /> : null;
}
```

#### `usePermissionCheck()`

Check multiple permissions in a single API call.

```tsx
import { usePermissionCheck } from '@/modules/rbac';

function ResourceList() {
  const { permissions, isLoading, isError, error, refetch } = usePermissionCheck([
    { resource: 'workloads', verb: 'create', group: 'apps' },
    { resource: 'secrets', verb: 'create' },
    { resource: 'configmaps', verb: 'create' },
  ]);

  if (isLoading) return <Skeleton />;

  return (
    <div>
      {permissions['workloads:create']?.allowed && <CreateWorkload />}
      {permissions['secrets:create']?.allowed && <CreateSecret />}
      {permissions['configmaps:create']?.allowed && <CreateConfigMap />}
    </div>
  );
}
```

---

### Programmatic Checks

For advanced use cases, use the existing self-subject access review control directly (server-side only).

```tsx
import { createSelfSubjectAccessReviewControl } from '@/resources/control-plane/authorization/self-subject-access-review.control';

// In loader or action
export const loader = async ({ context }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context;
  const accessReviewControl = createSelfSubjectAccessReviewControl(controlPlaneClient);

  // Check single permission
  const result = await accessReviewControl.create(
    organizationId,
    {
      resource: 'workloads',
      verb: 'list',
      group: 'apps',
      namespace: 'default',
    },
    false // dryRun=false returns transformed result
  );

  const canList = result.allowed && !result.denied;

  return { canList };
};
```

---

## API Reference

### Predefined Permissions

Use `PERMISSIONS` constant for common resource/verb combinations:

```tsx
import { PERMISSIONS } from '@/modules/rbac';

// Example usage:
const workloadPermissions = PERMISSIONS.WORKLOADS;
// {
//   LIST: { resource: 'workloads', verb: 'list', group: 'apps' },
//   GET: { resource: 'workloads', verb: 'get', group: 'apps' },
//   CREATE: { resource: 'workloads', verb: 'create', group: 'apps' },
//   UPDATE: { resource: 'workloads', verb: 'update', group: 'apps' },
//   PATCH: { resource: 'workloads', verb: 'patch', group: 'apps' },
//   DELETE: { resource: 'workloads', verb: 'delete', group: 'apps' },
// }

// Available resources:
PERMISSIONS.WORKLOADS;
PERMISSIONS.SECRETS;
PERMISSIONS.CONFIGMAPS;
PERMISSIONS.SERVICES;
PERMISSIONS.NAMESPACES;
```

### Types

```tsx
import type {
  PermissionVerb,
  IPermissionCheck,
  IPermissionResult,
  IBulkPermissionResult,
  IPermissionContext,
  IRbacMiddlewareConfig,
} from '@/modules/rbac';

type PermissionVerb = 'get' | 'list' | 'watch' | 'create' | 'update' | 'patch' | 'delete';

interface IPermissionCheck {
  organizationId: string;
  namespace?: string;
  verb: PermissionVerb;
  group: string;
  resource: string;
  name?: string;
}

interface IPermissionResult {
  allowed: boolean;
  denied: boolean;
  reason?: string;
}
```

---

## Caching Strategy

The RBAC module uses aggressive caching for performance:

### Client-Side (TanStack Query)

- **Stale time**: 5 minutes (default)
- **Cache time**: 10 minutes (default)
- **Refetch on window focus**: Enabled
- **Query key format**: `['permission', orgId, resource, verb, group, namespace, name]`

### Server-Side (BFF Cache)

- **TTL**: 5 minutes
- **Storage**: Per-user cache in context
- **Key format**: `permission:{orgId}:{resource}:{verb}:{group}:{namespace}:{name}`

### Cache Invalidation

```tsx
import { usePermissions } from '@/modules/rbac';

const { invalidateCache } = usePermissions();

// Invalidate all permission caches
invalidateCache();
```

### Bypass Cache

```tsx
// For API routes, add ?noCache=true query param
fetch('/api/permissions/check?noCache=true', {
  method: 'POST',
  body: JSON.stringify(permissionCheck),
});
```

---

## Testing

### Development Debug Tool

Visit `/test/permissions?orgId=YOUR_ORG_ID` in development mode to:

- Test single permission checks
- Test bulk permission checks
- View predefined permissions
- Debug permission issues

**Example:**

```
http://localhost:3000/test/permissions?orgId=org_123456
```

The debug tool provides:

- Interactive form for testing permissions
- Real-time permission check results
- Bulk permission testing for common resources
- Display of predefined permission constants

---

## Future Improvements

The following features are planned for future releases:

### 1. **Permission Preloading**

- Preload common permissions (list, get) on app load
- Reduce initial permission check latency
- Smart preloading based on user role

### 2. **Permission Caching Strategies**

- Configurable cache TTL per permission type
- Background refresh for critical permissions
- Optimistic UI updates with cache invalidation

### 3. **Advanced Permission Patterns**

- Role-based permission presets (admin, editor, viewer)
- Permission inheritance and hierarchies
- Wildcard permission matching

### 4. **Analytics & Monitoring**

- Track permission check frequency
- Monitor cache hit/miss rates
- Alert on permission check failures

### 5. **Developer Experience**

- VSCode extension for permission validation
- CLI tool for testing permissions
- Permission documentation generator

### 6. **Performance Optimizations**

- Request deduplication for concurrent checks
- Permission check batching
- Service worker caching for offline support

### 7. **Enhanced Error Handling**

- Detailed error messages with remediation steps
- Permission request workflow (request access from admin)
- Audit log for permission denials

### 8. **Cluster-Level Permissions**

- Support for cluster-scoped resources (not just namespace-scoped)
- Global permission checks across all namespaces

---

## Migration Guide (v1.0 → v2.0 → v2.1)

### What Changed?

**v2.0:** The RBAC middleware was refactored from a **context-based** approach to a **fetch-based** approach for better reliability and consistency.

**v2.1:** Added support for **custom `onDenied` handlers** and changed the **default behavior** from `'both'` to `'error'` for better UX with ErrorBoundary.

### v1.0 (Old - Context-Based)

```typescript
// ❌ OLD: Required context injection
const context = (request as any).context as AppLoadContext;
const rbacService = new RbacService(context.controlPlaneClient);
const result = await rbacService.checkPermission(orgId, {...});
```

**Issues:**

- Relied on `request.context` being available
- Required specific middleware chain order
- Tightly coupled to infrastructure
- Hard to test

### v2.0 (Fetch-Based)

```typescript
// ✅ v2.0: Uses BFF API
const checkResponse = await fetch(`${process.env.APP_URL}/api/permissions/check`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: request.headers.get('Cookie') || '',
  },
  body: JSON.stringify({...}),
});
```

**Benefits:**

- No context dependency
- Works independently
- Automatic caching
- Easy to test

### v2.1 (Custom Handlers + New Default)

```typescript
// ✅ v2.1: Custom handlers and better defaults
createRbacMiddleware({
  resource: 'domains',
  verb: 'delete',
  // NEW: onDenied can be a function
  onDenied: ({ errorMessage }) => {
    return redirectWithToast('/dashboard', {
      type: 'error',
      description: errorMessage,
    });
  },
});

// Or use default (throws error, caught by ErrorBoundary)
createRbacMiddleware({
  resource: 'workloads',
  verb: 'list',
  // onDenied defaults to 'error' (was 'both' in v2.0)
});
```

**New Features:**

- ✅ Custom `onDenied` handler functions
- ✅ Default changed from `'both'` → `'error'` (better UX)
- ✅ Full control over permission denial responses
- ✅ Easy integration with toast notifications

### Migration Steps

#### Phase 1: Automatic Migration ✅

**v2.0 → v2.1** is **backward compatible** with one behavioral change:

**Before (v2.0):**

```tsx
// Default was 'both' (returned JSON response)
createRbacMiddleware({
  resource: 'workloads',
  verb: 'list',
  // onDenied: 'both' (implicit default)
});
```

**After (v2.1):**

```tsx
// Default is now 'error' (throws error, caught by ErrorBoundary)
createRbacMiddleware({
  resource: 'workloads',
  verb: 'list',
  // onDenied: 'error' (new default)
});
```

**Impact:** Permission denials will now throw errors (caught by ErrorBoundary) instead of returning JSON responses. This provides better UX as users see a proper error page instead of a JSON response.

**If you need the old behavior:** Explicitly set `onDenied: 'redirect'` if you want redirects.

#### Phase 2: Adopt Custom Handlers (Optional)

For routes where you want toast notifications, use custom handlers:

```tsx
import { redirectWithToast } from '@/utils/cookies';

createRbacMiddleware({
  resource: 'domains',
  verb: 'delete',
  onDenied: ({ errorMessage }) => {
    return redirectWithToast('/dashboard', {
      type: 'error',
      title: 'Permission Denied',
      description: errorMessage,
    });
  },
});
```

#### Phase 3: Testing

Test permission denials in development:

1. Access a protected route without permission
2. Verify error is caught by ErrorBoundary (default behavior)
3. Or verify toast notification appears (if using custom handler)

#### Phase 4: Monitor Production

Monitor error rates and user feedback after deployment.

### Breaking Changes

**Behavioral Change (v2.0 → v2.1):**

- **Default `onDenied` changed from `'both'` → `'error'`**
- Impact: Permission denials now throw errors instead of returning JSON
- Migration: Explicitly set `onDenied` if you relied on the old default
- Benefit: Better UX with ErrorBoundary handling

**No API Changes:**

- All existing `onDenied: 'redirect'` and `onDenied: 'error'` configurations work identically
- New `onDenied` function support is additive, not breaking

### Performance Considerations

**Before (v1.0):**

- Direct RbacService call
- No automatic caching at middleware level
- Dependent on context availability

**After (v2.0):**

- HTTP request to BFF (minimal overhead)
- Automatic caching (5-minute TTL)
- Independent operation

**Net Result:** Better performance due to caching, minimal overhead from HTTP call.

### Rollback Procedure

If you encounter issues, you can temporarily revert by:

1. Keep using the current version (no changes needed)
2. Report the issue with details
3. The old implementation can be restored if necessary

### Common Migration Questions

#### Q: Do I need to update my code for v2.1?

**A:** Most likely no. The only change is the default behavior. If you explicitly set `onDenied`, your code works as-is. If you relied on the default `'both'` behavior, you may see different error handling (now throws errors instead of returning JSON).

#### Q: What's the difference between v2.0 and v2.1?

**A:**

- **v2.0**: Changed from context-based to fetch-based (architectural change)
- **v2.1**: Added custom handler functions + changed default from `'both'` → `'error'` (UX improvement)

#### Q: How do I use toast notifications on permission denial?

**A:** Use a custom `onDenied` function handler - see examples in the middleware section above.

#### Q: Will the default change affect my existing routes?

**A:** If you didn't explicitly set `onDenied`, yes. Permission denials will now throw errors (caught by ErrorBoundary) instead of returning JSON responses. This is generally better UX.

#### Q: Can I still use the old 'both' behavior?

**A:** The `'both'` option has been removed in v2.1. Use `'error'` (default) for ErrorBoundary handling, `'redirect'` for simple redirects, or a custom function for advanced control.

#### Q: What about existing permissions?

**A:** All existing permissions continue to work identically. Only the error handling behavior changed.

#### Q: Do I need to update environment variables?

**A:** No, `APP_URL` should already be configured.

---

## Troubleshooting

### Common Issues

#### 1. "usePermissions must be used within RbacProvider"

**Cause**: Component is rendered outside of `<RbacProvider>`.

**Solution**: Wrap your app with `RbacProvider` in root layout:

```tsx
<RbacProvider organizationId={orgId}>
  <Outlet />
</RbacProvider>
```

#### 2. Permissions always return denied

**Causes**:

- Organization ID is incorrect or missing
- User doesn't have the required permission
- API endpoint is misconfigured

**Debug steps**:

1. Check organization ID: `console.log(organizationId)`
2. Use debug tool: `/test/permissions?orgId=YOUR_ORG_ID`
3. Check network tab for API responses
4. Verify API endpoint configuration

#### 3. Middleware throws error

**Cause**: Organization ID not found in URL path.

**Solution**: Ensure your route has `/org/:orgId` in the path:

```
✅ /org/123/workloads
❌ /workloads
```

#### 4. Cache not invalidating

**Solution**: Use `invalidateCache()` or add `?noCache=true`:

```tsx
import { usePermissions } from '@/modules/rbac';

const { invalidateCache } = usePermissions();
invalidateCache();

// Or bypass cache in API call
fetch('/api/permissions/check?noCache=true', ...);
```

#### 5. Type errors with permission verbs

**Solution**: Use `PermissionVerb` type:

```tsx
import type { PermissionVerb } from '@/modules/rbac';

const verb: PermissionVerb = 'create';
```

#### 6. Middleware fetch fails with "APP_URL not defined"

**Cause**: Environment variable `APP_URL` is missing or misconfigured.

**Solution**: Ensure `APP_URL` is set in your environment:

```bash
# .env or .env.local
APP_URL=http://localhost:3000  # Development
APP_URL=https://portal.example.com  # Production
```

#### 7. Middleware permission checks are slow

**Possible causes**:

- Cache not working properly
- Network issues with internal fetch
- BFF API performance issues

**Debug steps**:

1. Check cache headers:

```bash
# Look for X-Cache header in middleware requests
X-Cache: HIT  # Good - using cache
X-Cache: MISS # First request or cache expired
```

2. Check BFF API logs for performance issues

3. Verify cache TTL configuration in `/api/permissions/check`

4. Consider increasing cache TTL if needed (default: 5 minutes)

#### 8. "Permission check failed" in middleware

**Cause**: BFF API returned an error.

**Debug steps**:

1. Check BFF API logs for detailed error
2. Verify cookies are being forwarded correctly
3. Check if user session is still valid
4. Use debug tool: `/test/permissions?orgId=YOUR_ORG_ID`

**Solution**: Check error message in BFF response for specific issue.

---

## Examples

### Full Example: Workload Management Page

```tsx
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createRbacMiddleware, useHasPermission } from '@/modules/rbac';
import { PermissionGate } from '@/modules/rbac/components';
import { LoaderFunctionArgs, data } from 'react-router';

// Protect route with middleware
export const loader = withMiddleware(
  async ({ context, params }) => {
    const workloads = await getWorkloads(params.namespace);
    return data({ workloads });
  },
  authMiddleware,
  createRbacMiddleware({
    resource: 'workloads',
    verb: 'list',
    group: 'apps',
    namespace: (params) => params.namespace,
  })
);

// Component with permission checks
export default function WorkloadsPage() {
  const { workloads } = useLoaderData();
  const { hasPermission: canCreate } = useHasPermission('workloads', 'create', {
    group: 'apps',
  });

  return (
    <div>
      <h1>Workloads</h1>

      {/* Create button - shown only if user can create */}
      {canCreate && <button>Create Workload</button>}

      {/* Workload list */}
      {workloads.map((workload) => (
        <div key={workload.name}>
          <h2>{workload.name}</h2>

          {/* Delete button - shown only if user can delete */}
          <PermissionGate
            resource="workloads"
            verb="delete"
            group="apps"
            namespace={workload.namespace}
            name={workload.name}>
            <button>Delete</button>
          </PermissionGate>
        </div>
      ))}
    </div>
  );
}
```

---

## Support

For issues or questions:

- Check this README
- Use debug tool: `/test/permissions?orgId=YOUR_ORG_ID`
- Review network tab for API errors
- Check console for error messages

---

## License

Internal use only - Cloud Portal Application
