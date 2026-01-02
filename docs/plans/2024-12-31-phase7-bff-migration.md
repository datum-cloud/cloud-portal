# Phase 7: BFF Migration to Hono + React Query Mutations

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all BFF API routes, migrate external service proxies to Hono, and replace useDatumFetcher with React Query mutations for enterprise-grade data layer.

**Architecture:** SSR for reads (loaders), CSR for mutations (React Query). External service proxies (Prometheus, CloudValid, Grafana) move to Hono routes. All resource modules get mutations.ts files. Page routes lose inline actions.

**Tech Stack:** Hono, React Query (TanStack Query), Zod, TypeScript

---

## Phase Overview

| Phase | Description                                          | Files Changed     |
| ----- | ---------------------------------------------------- | ----------------- |
| 7A    | Hono API Routes for external services                | ~10 new files     |
| 7B    | Add mutations.ts to all resources                    | ~15 new files     |
| 7C    | Migrate components from useDatumFetcher to mutations | ~50 files         |
| 7D    | Remove inline actions from page routes               | ~12 files         |
| 7E    | Delete BFF routes + cleanup                          | ~40 files deleted |

---

## Phase 7A: Hono API Routes

### Task 7A.1: Create Hono Routes Structure

**Files:**

- Create: `app/server/routes/index.ts`

**Step 1: Create route registration file**

```typescript
// app/server/routes/index.ts
import type { Variables } from '../types';
import type { Hono } from 'hono';

export function registerApiRoutes(app: Hono<{ Variables: Variables }>) {
  // Routes will be added in subsequent tasks
}
```

**Step 2: Commit**

```bash
git add app/server/routes/index.ts
git commit -m "feat(server): add Hono routes structure"
```

---

### Task 7A.2: Prometheus Hono Route

**Files:**

- Create: `app/server/routes/prometheus.ts`
- Modify: `app/server/routes/index.ts`

**Step 1: Create Prometheus route**

```typescript
// app/server/routes/prometheus.ts
import type { Variables } from '../types';
import { PrometheusService } from '@/modules/prometheus';
import { PrometheusError } from '@/modules/prometheus/errors';
import { Hono } from 'hono';

const prometheus = new Hono<{ Variables: Variables }>();

// Health check
prometheus.get('/', (c) => {
  const prometheusUrl = process.env.PROMETHEUS_URL;
  return c.json({
    configured: Boolean(prometheusUrl),
    url: prometheusUrl ? new URL(prometheusUrl).origin : null,
  });
});

// Query endpoint
prometheus.post('/', async (c) => {
  try {
    const prometheusUrl = process.env.PROMETHEUS_URL;

    if (!prometheusUrl) {
      return c.json({ error: 'Prometheus URL not configured' }, 500);
    }

    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const prometheusService = new PrometheusService({
      baseURL: prometheusUrl,
      timeout: 30000,
      retries: 1,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const body = await c.req.json();
    const result = await prometheusService.handleAPIRequest(body);

    return c.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof PrometheusError) {
      return c.json(
        { error: error.message, type: error.type, details: error.details },
        error.statusCode as 400 | 401 | 500
      );
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export { prometheus as prometheusRoutes };
```

**Step 2: Register route**

```typescript
// app/server/routes/index.ts
import { authMiddleware } from '../middleware/auth';
import type { Variables } from '../types';
import { prometheusRoutes } from './prometheus';
import type { Hono } from 'hono';

export function registerApiRoutes(app: Hono<{ Variables: Variables }>) {
  // Prometheus - requires auth
  app.use('/api/prometheus/*', authMiddleware());
  app.route('/api/prometheus', prometheusRoutes);
}
```

**Step 3: Commit**

```bash
git add app/server/routes/
git commit -m "feat(server): add Prometheus Hono route"
```

---

### Task 7A.3: CloudValid Hono Route

**Files:**

- Create: `app/server/routes/cloudvalid.ts`
- Modify: `app/server/routes/index.ts`

**Step 1: Create CloudValid route**

```typescript
// app/server/routes/cloudvalid.ts
import type { Variables } from '../types';
import { CloudValidService } from '@/modules/cloudvalid';
import { Hono } from 'hono';

const cloudvalid = new Hono<{ Variables: Variables }>();

// DNS setup endpoint
cloudvalid.post('/dns', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { domain, dnsName, dnsContent, redirectUri } = body;

    if (!domain || !dnsName || !dnsContent) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const cloudValidService = new CloudValidService(process.env.CLOUDVALID_API_KEY ?? '');

    const dnsSetup = await cloudValidService.createDNSSetup({
      domain,
      template_id: process.env.CLOUDVALID_TEMPLATE_ID,
      variables: {
        dnsRecordName: dnsName,
        dnsRecordContent: dnsContent,
      },
      redirect_url: redirectUri ?? '',
    });

    return c.json({ success: true, data: dnsSetup.result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, error.status || 500);
  }
});

export { cloudvalid as cloudvalidRoutes };
```

**Step 2: Register route**

```typescript
// Add to app/server/routes/index.ts
import { cloudvalidRoutes } from './cloudvalid';

// In registerApiRoutes:
app.use('/api/cloudvalid/*', authMiddleware());
app.route('/api/cloudvalid', cloudvalidRoutes);
```

**Step 3: Commit**

```bash
git add app/server/routes/
git commit -m "feat(server): add CloudValid Hono route"
```

---

### Task 7A.4: Grafana Hono Route

**Files:**

- Create: `app/server/routes/grafana.ts`
- Modify: `app/server/routes/index.ts`

**Step 1: Read current grafana route implementation**

Check: `app/routes/api/telemetry/grafana.ts`

**Step 2: Create Grafana route mirroring current implementation**

```typescript
// app/server/routes/grafana.ts
import type { Variables } from '../types';
import { Hono } from 'hono';

const grafana = new Hono<{ Variables: Variables }>();

grafana.get('/test-connection', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const grafanaUrl = process.env.GRAFANA_URL;
    if (!grafanaUrl) {
      return c.json({ configured: false });
    }

    const response = await fetch(`${grafanaUrl}/api/health`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    return c.json({
      configured: true,
      connected: response.ok,
      status: response.status,
    });
  } catch (error) {
    return c.json({ configured: true, connected: false, error: 'Connection failed' });
  }
});

export { grafana as grafanaRoutes };
```

**Step 3: Register route and commit**

---

### Task 7A.5: Preferences Hono Route (set-theme)

**Files:**

- Create: `app/server/routes/preferences.ts`
- Modify: `app/server/routes/index.ts`

**Step 1: Create preferences route**

```typescript
// app/server/routes/preferences.ts
import type { Variables } from '../types';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';

const preferences = new Hono<{ Variables: Variables }>();

preferences.post('/theme', async (c) => {
  try {
    const body = await c.req.json();
    const { theme } = body;

    if (!theme || !['light', 'dark', 'system'].includes(theme)) {
      return c.json({ error: 'Invalid theme' }, 400);
    }

    setCookie(c, 'theme', theme, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return c.json({ success: true, theme });
  } catch (error) {
    return c.json({ error: 'Failed to set theme' }, 500);
  }
});

export { preferences as preferencesRoutes };
```

**Step 2: Register route and commit**

---

### Task 7A.6: Notifications Hono Route

**Files:**

- Create: `app/server/routes/notifications.ts`
- Modify: `app/server/routes/index.ts`

**Step 1: Create notifications route**

```typescript
// app/server/routes/notifications.ts
import type { Variables } from '../types';
import { createControlPlaneClient } from '@/modules/control-plane/control-plane.factory';
import { createInvitationService } from '@/resources/invitations';
import { Hono } from 'hono';

const notifications = new Hono<{ Variables: Variables }>();

notifications.get('/', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestId = c.get('requestId') ?? crypto.randomUUID();
    const controlPlaneClient = createControlPlaneClient(session.accessToken);

    const invitationService = createInvitationService({
      controlPlaneClient,
      requestId,
    });

    const invitations = await invitationService.userInvitations(session.sub ?? '');

    const notifications = invitations.map((invitation) => ({
      id: `invitation-${invitation.name}`,
      source: 'invitation',
      isRead: false,
      data: invitation,
    }));

    return c.json({
      success: true,
      data: {
        notifications,
        counts: {
          total: notifications.length,
          unread: notifications.length,
          bySource: { invitation: notifications.length },
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load notifications',
      },
      500
    );
  }
});

export { notifications as notificationsRoutes };
```

**Step 2: Register route and commit**

---

### Task 7A.7: Integrate Routes into Server Entry

**Files:**

- Modify: `app/server/entry.ts`

**Step 1: Import and register routes**

```typescript
// Add to app/server/entry.ts after middleware setup, before React Router SSR
import { registerApiRoutes } from './routes';

// After app.onError(errorHandler);
registerApiRoutes(app);
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

**Step 3: Commit**

```bash
git add app/server/
git commit -m "feat(server): integrate all Hono API routes"
```

---

## Phase 7B: Add Mutations to All Resources

### Task 7B.1: Create Mutation Template

**Reference:** `app/resources/organizations/organization.queries.ts` (already has mutations)

Pattern for each resource:

1. Create `{resource}.mutations.ts` (or add to queries.ts)
2. Export CRUD mutation hooks: `useCreate{Resource}`, `useUpdate{Resource}`, `useDelete{Resource}`
3. Include optimistic updates where appropriate
4. Invalidate relevant queries on success

---

### Task 7B.2: Projects Mutations

**Files:**

- Modify: `app/resources/projects/project.queries.ts`

**Step 1: Add mutation hooks**

```typescript
// Add to app/resources/projects/project.queries.ts

export function useCreateProject(options?: UseMutationOptions<Project, Error, CreateProjectInput>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      await service.create(input, { dryRun: true });
      return service.create(input);
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(newProject.name), newProject);
    },
    ...options,
  });
}

export function useUpdateProject(
  name: string,
  options?: UseMutationOptions<Project, Error, UpdateProjectInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => service.update(name, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    ...options,
  });
}

export function useDeleteProject(options?: UseMutationOptions<void, Error, string>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    ...options,
  });
}
```

**Step 2: Export from index.ts**

**Step 3: Commit**

---

### Task 7B.3: DNS Zones Mutations

**Files:**

- Modify: `app/resources/dns-zones/dns-zone.queries.ts`

Add: `useCreateDnsZone`, `useUpdateDnsZone`, `useDeleteDnsZone`

---

### Task 7B.4: DNS Records Mutations

**Files:**

- Create: `app/resources/dns-records/dns-record.queries.ts`

Add: `useDnsRecords`, `useCreateDnsRecord`, `useUpdateDnsRecord`, `useDeleteDnsRecord`, `useBulkCreateDnsRecords`

---

### Task 7B.5: Secrets Mutations

**Files:**

- Create: `app/resources/secrets/secret.queries.ts`

Add: `useSecrets`, `useSecret`, `useCreateSecret`, `useUpdateSecret`, `useDeleteSecret`

---

### Task 7B.6: Domains Mutations

**Files:**

- Create: `app/resources/domains/domain.queries.ts`

Add: `useDomains`, `useDomain`, `useCreateDomain`, `useUpdateDomain`, `useDeleteDomain`, `useBulkCreateDomains`

---

### Task 7B.7: HTTP Proxies Mutations

**Files:**

- Create: `app/resources/http-proxies/http-proxy.queries.ts`

Add: `useHttpProxies`, `useHttpProxy`, `useCreateHttpProxy`, `useUpdateHttpProxy`, `useDeleteHttpProxy`

---

### Task 7B.8: Export Policies Mutations

**Files:**

- Create: `app/resources/export-policies/export-policy.queries.ts`

Add: `useExportPolicies`, `useExportPolicy`, `useCreateExportPolicy`, `useUpdateExportPolicy`, `useDeleteExportPolicy`

---

### Task 7B.9: Invitations Mutations

**Files:**

- Create: `app/resources/invitations/invitation.queries.ts`

Add: `useInvitations`, `useCreateInvitation`, `useCancelInvitation`, `useResendInvitation`

---

### Task 7B.10: Members Mutations

**Files:**

- Create: `app/resources/members/member.queries.ts`

Add: `useMembers`, `useUpdateMemberRole`, `useRemoveMember`, `useLeaveOrganization`

---

### Task 7B.11: Policy Bindings Mutations

**Files:**

- Create: `app/resources/policy-bindings/policy-binding.queries.ts`

Add: `usePolicyBindings`, `useCreatePolicyBinding`, `useUpdatePolicyBinding`, `useDeletePolicyBinding`

---

### Task 7B.12: Groups Mutations

**Files:**

- Create: `app/resources/groups/group.queries.ts`

Add: `useGroups`, `useGroup`, `useCreateGroup`, `useUpdateGroup`, `useDeleteGroup`

---

### Task 7B.13: Roles Mutations

**Files:**

- Create: `app/resources/roles/role.queries.ts`

Add: `useRoles`, `useRole`

---

### Task 7B.14: Users Mutations

**Files:**

- Create: `app/resources/users/user.queries.ts`

Add: `useCurrentUser`, `useUpdateUser`, `useDeleteUser`

---

## Phase 7C: Migrate Components from useDatumFetcher

### Task 7C.1: Create Migration Guide

**Pattern Change:**

Before (useDatumFetcher):

```tsx
const fetcher = useDatumFetcher({
  key: 'create-org',
  onSuccess: () => toast.success('Created'),
  onError: (data) => toast.error(data.error),
});

fetcher.submit(data, { method: 'POST', action: '/api/organizations' });
```

After (React Query mutation):

```tsx
const createOrg = useCreateOrganization({
  onSuccess: () => toast.success('Created'),
  onError: (error) => toast.error(error.message),
});

createOrg.mutate(data);
```

**Key Changes:**

- Replace `fetcher.submit()` with `mutation.mutate()`
- Replace `fetcher.state !== 'idle'` with `mutation.isPending`
- Replace `fetcher.data` with `mutation.data`
- Remove `action` and `method` - handled by mutation hook
- Remove CSRF token handling - not needed for mutations

---

### Task 7C.2: Migrate Organization Components

**Files:**

- Modify: `app/features/organization/settings/general-card.tsx`
- Modify: `app/features/organization/settings/danger-card.tsx`
- Modify: `app/routes/account/organizations/index.tsx`

Replace `useDatumFetcher` with `useUpdateOrganization`, `useDeleteOrganization`, `useCreateOrganization`

---

### Task 7C.3: Migrate Project Components

**Files:**

- Modify: `app/features/project/settings/general-card.tsx`
- Modify: `app/features/project/settings/danger-card.tsx`
- Modify: `app/routes/org/detail/projects/index.tsx`

---

### Task 7C.4: Migrate DNS Zone Components

**Files:**

- Modify: `app/features/edge/dns-zone/form.tsx`
- Modify: `app/features/edge/dns-zone/overview/description-form-card.tsx`
- Modify: `app/routes/project/detail/edge/dns-zones/index.tsx`

---

### Task 7C.5: Migrate DNS Record Components

**Files:**

- Modify: `app/routes/project/detail/edge/dns-zones/detail/dns-records.tsx`
- Modify: `app/features/edge/dns-records/import-export/hooks/use-dns-record-import.ts`

---

### Task 7C.6: Migrate Secret Components

**Files:**

- Modify: `app/features/secret/form/keys/keys-form-dialog.tsx`
- Modify: `app/features/secret/form/edit/edit-metadata.tsx`
- Modify: `app/features/secret/form/edit/edit-keys.tsx`
- Modify: `app/features/secret/form/overview/danger-card.tsx`
- Modify: `app/routes/project/detail/config/secrets/index.tsx`

---

### Task 7C.7: Migrate Domain Components

**Files:**

- Modify: `app/features/edge/domain/overview/quick-setup-card.tsx`
- Modify: `app/features/edge/domain/bulk-add/use-bulk-domains-import.ts`
- Modify: `app/routes/project/detail/config/domains/index.tsx`

---

### Task 7C.8: Migrate HTTP Proxy Components

**Files:**

- Modify: `app/features/edge/proxy/form.tsx`
- Modify: `app/features/edge/proxy/preview.tsx`
- Modify: `app/routes/project/detail/edge/proxy/index.tsx`

---

### Task 7C.9: Migrate Export Policy Components

**Files:**

- Modify: `app/features/metric/export-policies/providers/grafana/grafana-form.tsx`
- Modify: `app/features/metric/export-policies/form/update-form.tsx`
- Modify: `app/features/metric/export-policies/card/danger-card.tsx`
- Modify: `app/routes/project/detail/metrics/export-policies/index.tsx`

---

### Task 7C.10: Migrate Team Components

**Files:**

- Modify: `app/features/organization/team/manage-role.tsx`
- Modify: `app/components/notification/items/invitation-notification-item.tsx`
- Modify: `app/routes/org/detail/team/index.tsx`

---

### Task 7C.11: Migrate Policy Binding Components

**Files:**

- Modify: `app/features/policy-binding/form/policy-binding-form.tsx`
- Modify: `app/routes/org/detail/policy-bindings/index.tsx`
- Modify: `app/routes/org/detail/settings/policy-bindings.tsx`

---

### Task 7C.12: Migrate Account Components

**Files:**

- Modify: `app/features/account/settings/profile-card.tsx`
- Modify: `app/features/account/settings/portal-card.tsx`
- Modify: `app/features/account/settings/danger-card.tsx`
- Modify: `app/features/account/settings/newsletter-card.tsx`

---

### Task 7C.13: Migrate Select Components

**Files:**

- Modify: `app/components/select-group/select-group.tsx`
- Modify: `app/components/select-role/select-role.tsx`
- Modify: `app/components/select-secret/select-secret.tsx`
- Modify: `app/components/select-member/select-member.tsx`
- Modify: `app/components/select-project/select-project.tsx`
- Modify: `app/components/select-organization/select-organization.tsx`

---

## Phase 7D: Remove Inline Actions from Page Routes

### Task 7D.1: Remove action from dns-zones/new.tsx

**Files:**

- Modify: `app/routes/project/detail/edge/dns-zones/new.tsx`

**Step 1: Remove action export, use mutation in component**

```tsx
// Before: export const action = async ({ request, params, context }) => { ... }
// After: Remove action, use useCreateDnsZone in component

export default function DnsZoneNewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const createDnsZone = useCreateDnsZone(projectId!, {
    onSuccess: (dnsZone) => {
      // Handle discovery preview or navigate
    },
  });

  // Pass mutation to form component
}
```

---

### Task 7D.2: Remove action from team/invite.tsx

**Files:**

- Modify: `app/routes/org/detail/team/invite.tsx`

---

### Task 7D.3: Remove action from policy-bindings/new.tsx

**Files:**

- Modify: `app/routes/org/detail/policy-bindings/new.tsx`

---

### Task 7D.4: Remove action from policy-bindings/edit.tsx

**Files:**

- Modify: `app/routes/org/detail/policy-bindings/edit.tsx`

---

### Task 7D.5: Remove action from proxy/new.tsx

**Files:**

- Modify: `app/routes/project/detail/edge/proxy/new.tsx`

---

### Task 7D.6: Remove action from proxy/detail/edit.tsx

**Files:**

- Modify: `app/routes/project/detail/edge/proxy/detail/edit.tsx`

---

### Task 7D.7: Remove action from secrets/new.tsx

**Files:**

- Modify: `app/routes/project/detail/config/secrets/new.tsx`

---

### Task 7D.8: Remove action from export-policies/detail/edit.tsx

**Files:**

- Modify: `app/routes/project/detail/metrics/export-policies/detail/edit.tsx`

---

### Task 7D.9: Remove action from settings/preferences.tsx

**Files:**

- Modify: `app/routes/account/settings/preferences.tsx`

---

### Task 7D.10: Remove action from organizations/index.tsx (alert only)

**Files:**

- Modify: `app/routes/account/organizations/index.tsx`

Note: Keep action only if needed for alert state cookie, otherwise remove.

---

### Task 7D.11: Remove action from projects/index.tsx (alert only)

**Files:**

- Modify: `app/routes/org/detail/projects/index.tsx`

---

## Phase 7E: Delete BFF Routes + Cleanup

### Task 7E.1: Delete All BFF API Routes

**Files to Delete:**

```
app/routes/api/action/set-cache.ts
app/routes/api/action/set-theme.ts
app/routes/api/cloudvalid/dns.ts
app/routes/api/prometheus/index.ts
app/routes/api/activity/index.ts
app/routes/api/projects/status.ts
app/routes/api/projects/index.ts
app/routes/api/projects/$id.ts
app/routes/api/dns-zones/index.ts
app/routes/api/dns-records/index.ts
app/routes/api/dns-records/$id.ts
app/routes/api/dns-records/status.ts
app/routes/api/dns-records/bulk-import.ts
app/routes/api/domains/index.ts
app/routes/api/domains/refresh.ts
app/routes/api/domains/status.ts
app/routes/api/domains/bulk-import.ts
app/routes/api/secrets/index.ts
app/routes/api/proxy/index.ts
app/routes/api/proxy/$id.ts
app/routes/api/export-policies/index.ts
app/routes/api/export-policies/status.ts
app/routes/api/members/index.ts
app/routes/api/members/leave.ts
app/routes/api/user/index.ts
app/routes/api/user/preferences.ts
app/routes/api/roles/index.ts
app/routes/api/groups/index.ts
app/routes/api/policy-bindings/index.ts
app/routes/api/team/invitations/cancel.ts
app/routes/api/team/invitations/resend.ts
app/routes/api/team/invitations/update-state.ts
app/routes/api/notifications/index.ts
app/routes/api/dns-zone-discoveries/index.ts
app/routes/api/dns-zone-discoveries/$id.ts
app/routes/api/telemetry/grafana.ts
app/routes/api/permissions/bulk-check.ts
app/routes/api/permissions/check.ts
app/routes/api/organizations/index.ts
app/routes/api/organizations/$id.ts
```

**Step 1: Delete all files**

```bash
rm -rf app/routes/api/
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: remove all BFF API routes"
```

---

### Task 7E.2: Remove useDatumFetcher Hook

**Files:**

- Delete: `app/hooks/useDatumFetcher.ts`
- Modify: Any remaining imports

**Step 1: Search for remaining usages**

```bash
grep -r "useDatumFetcher" app/
```

**Step 2: Delete hook file if no usages remain**

---

### Task 7E.3: Update ROUTE_PATH References

**Step 1: Search for ROUTE_PATH imports from deleted routes**

```bash
grep -r "from '@/routes/api" app/
```

**Step 2: Remove or update all references**

---

### Task 7E.4: Delete Old Express Server

**Step 1: Remove server.ts**

```bash
rm server.ts
```

**Step 2: Verify removal**

```bash
ls server.ts 2>/dev/null || echo "server.ts removed successfully"
```

---

### Task 7E.5: Remove Express Packages from Dependencies

**Step 1: Remove Express and related packages**

```bash
bun remove express @react-router/express express-prom-bundle express-rate-limit
bun remove -d @types/express
```

**Step 2: Verify package.json no longer has Express**

```bash
grep -E "express" package.json || echo "No Express packages found"
```

---

### Task 7E.6: Update package.json Scripts

**Files:**

- Modify: `package.json`

**Step 1: Update preview script to use Hono**

The `preview` script currently references `./server.ts`. Update to use the new Hono-based build:

```json
{
  "scripts": {
    "preview": "cross-env NODE_ENV=production node build/server/index.js"
  }
}
```

**Step 2: Remove any other Express-related scripts**

Check for and update any scripts that reference the old server.

---

### Task 7E.7: Final Verification

**Step 1: Run typecheck**

```bash
bun run typecheck
```

**Step 2: Run build**

```bash
bun run build
```

**Step 3: Run tests**

```bash
bun run test
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: complete Phase 7 BFF migration"
```

---

## Summary

After completing Phase 7:

1. **Hono Routes** - External service proxies (Prometheus, CloudValid, Grafana, Notifications, Preferences) run directly on Hono
2. **React Query Mutations** - All resource modules have query + mutation hooks
3. **No useDatumFetcher** - Components use typed mutation hooks
4. **No Inline Actions** - Page routes only have loaders, mutations via React Query
5. **No BFF Routes** - `app/routes/api/` directory deleted

**Architecture Benefits:**

- Single API layer (Hono) for server-only operations
- Type-safe mutations with automatic cache invalidation
- Optimistic updates where appropriate
- Clear separation: SSR reads, CSR mutations
- Enterprise-grade data layer
