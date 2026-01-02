# SSR/CSR Hybrid + K8s Watch: Edge Resources Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement SSR + Watch hydration for 5 Edge resources with full BFF cleanup.

**Architecture:** Loaders fetch data via service layer (SSR), components hydrate React Query cache, watch hooks provide real-time updates. Mutations trigger watch events that update cache automatically (100-500ms delay).

**Tech Stack:** React Router 7, React Query, K8s Watch API, Zod, Hono

---

## Phase 1: Foundation - Hydration Hooks

### Task 1.1: Add Hydration Hooks to DNS Zones

**Files:**

- Modify: `app/resources/dns-zones/dns-zone.queries.ts`
- Modify: `app/resources/dns-zones/index.ts`

**Step 1: Add hydration hooks to queries file**

Add to `app/resources/dns-zones/dns-zone.queries.ts`:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hydrates React Query cache with SSR data for DNS zones list.
 * Only runs once on mount to seed the cache, then watch takes over.
 */
export function useHydrateDnsZones(projectId: string, initialData: DnsZone[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData?.length) {
      queryClient.setQueryData(dnsZoneKeys.list(projectId), { items: initialData });
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single DNS zone.
 */
export function useHydrateDnsZone(projectId: string, name: string, initialData: DnsZone) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(dnsZoneKeys.detail(projectId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, name, initialData]);
}
```

**Step 2: Export hydration hooks from index**

Add to exports in `app/resources/dns-zones/index.ts`:

```typescript
export {
  useDnsZones,
  useDnsZone,
  useDnsZonesByDomainRef,
  useCreateDnsZone,
  useUpdateDnsZone,
  useDeleteDnsZone,
  useHydrateDnsZones,
  useHydrateDnsZone,
} from './dns-zone.queries';
```

**Step 3: Verify**

Run: `bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add app/resources/dns-zones/
git commit -m "feat(dns-zones): add hydration hooks for SSR/CSR hybrid"
```

---

### Task 1.2: Add Hydration Hooks to DNS Records

**Files:**

- Modify: `app/resources/dns-records/dns-record.queries.ts`
- Modify: `app/resources/dns-records/index.ts`

**Step 1: Add hydration hooks to queries file**

Add to `app/resources/dns-records/dns-record.queries.ts`:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hydrates React Query cache with SSR data for DNS records list.
 */
export function useHydrateDnsRecords(projectId: string, zoneId: string, initialData: DnsRecord[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData?.length) {
      queryClient.setQueryData(dnsRecordKeys.list(projectId, zoneId), { items: initialData });
      hydrated.current = true;
    }
  }, [queryClient, projectId, zoneId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single DNS record.
 */
export function useHydrateDnsRecord(
  projectId: string,
  zoneId: string,
  name: string,
  initialData: DnsRecord
) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, zoneId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, zoneId, name, initialData]);
}
```

**Step 2: Export hydration hooks from index**

Add `useHydrateDnsRecords`, `useHydrateDnsRecord` to exports in `app/resources/dns-records/index.ts`.

**Step 3: Verify and commit**

```bash
bun run typecheck
git add app/resources/dns-records/
git commit -m "feat(dns-records): add hydration hooks for SSR/CSR hybrid"
```

---

### Task 1.3: Add Hydration Hooks to HTTP Proxies

**Files:**

- Modify: `app/resources/http-proxies/http-proxy.queries.ts`
- Modify: `app/resources/http-proxies/index.ts`

**Step 1: Add hydration hooks**

Add to `app/resources/http-proxies/http-proxy.queries.ts`:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hydrates React Query cache with SSR data for HTTP proxies list.
 */
export function useHydrateHttpProxies(projectId: string, initialData: HttpProxy[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData?.length) {
      queryClient.setQueryData(httpProxyKeys.list(projectId), { items: initialData });
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single HTTP proxy.
 */
export function useHydrateHttpProxy(projectId: string, name: string, initialData: HttpProxy) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(httpProxyKeys.detail(projectId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, name, initialData]);
}
```

**Step 2: Export and commit**

```bash
bun run typecheck
git add app/resources/http-proxies/
git commit -m "feat(http-proxies): add hydration hooks for SSR/CSR hybrid"
```

---

### Task 1.4: Add Watch Hook + Hydration Hooks to Domains

**Files:**

- Create: `app/resources/domains/domain.watch.ts`
- Modify: `app/resources/domains/domain.queries.ts`
- Modify: `app/resources/domains/index.ts`

**Step 1: Create watch hook**

Create `app/resources/domains/domain.watch.ts`:

```typescript
// app/resources/domains/domain.watch.ts
import { toDomain } from './domain.adapter';
import type { Domain } from './domain.schema';
import { domainKeys } from './domain.service';
import type { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch domains list for real-time updates.
 */
export function useDomainsWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Domain>({
    resourceType: 'apis/networking.datumapis.com/v1alpha1/domains',
    namespace: projectId,
    queryKey: domainKeys.list(projectId),
    transform: (item) => toDomain(item as ComDatumapisNetworkingV1AlphaDomain),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single domain for real-time updates.
 */
export function useDomainWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Domain>({
    resourceType: 'apis/networking.datumapis.com/v1alpha1/domains',
    namespace: projectId,
    name,
    queryKey: domainKeys.detail(projectId, name),
    transform: (item) => toDomain(item as ComDatumapisNetworkingV1AlphaDomain),
    enabled: options?.enabled ?? true,
  });
}
```

**Step 2: Add hydration hooks to queries file**

Add to `app/resources/domains/domain.queries.ts`:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hydrates React Query cache with SSR data for domains list.
 */
export function useHydrateDomains(projectId: string, initialData: Domain[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData?.length) {
      queryClient.setQueryData(domainKeys.list(projectId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single domain.
 */
export function useHydrateDomain(projectId: string, name: string, initialData: Domain) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(domainKeys.detail(projectId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, name, initialData]);
}
```

**Step 3: Update index exports**

Add to `app/resources/domains/index.ts`:

```typescript
export * from './domain.watch';

export {
  useDomains,
  useDomain,
  useCreateDomain,
  useUpdateDomain,
  useDeleteDomain,
  useBulkCreateDomains,
  useRefreshDomainRegistration,
  useHydrateDomains,
  useHydrateDomain,
} from './domain.queries';
```

**Step 4: Verify and commit**

```bash
bun run typecheck
git add app/resources/domains/
git commit -m "feat(domains): add watch hook and hydration hooks for SSR/CSR hybrid"
```

---

### Task 1.5: Add Hydration Hooks to Secrets

**Files:**

- Modify: `app/resources/secrets/secret.queries.ts`
- Modify: `app/resources/secrets/index.ts`

**Step 1: Add hydration hooks**

Add to `app/resources/secrets/secret.queries.ts`:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hydrates React Query cache with SSR data for secrets list.
 */
export function useHydrateSecrets(projectId: string, initialData: Secret[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData?.length) {
      queryClient.setQueryData(secretKeys.list(projectId), { items: initialData });
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single secret.
 */
export function useHydrateSecret(projectId: string, name: string, initialData: Secret) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(secretKeys.detail(projectId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, name, initialData]);
}
```

**Step 2: Export and commit**

```bash
bun run typecheck
git add app/resources/secrets/
git commit -m "feat(secrets): add hydration hooks for SSR/CSR hybrid"
```

---

## Phase 2: Integrate Hydration + Watch in Page Components

### Task 2.1: Update DNS Zones Index Page

**Files:**

- Modify: `app/routes/project/detail/edge/dns-zones/index.tsx`

**Step 1: Add hydration and enable always-on watch**

Update the component to use hydration hook and enable watch for all zones (not just loading):

```typescript
// Add import
import { useHydrateDnsZones } from '@/resources/dns-zones';

// In component, after useLoaderData:
const { zones } = useLoaderData<typeof loader>();
const { projectId } = useParams();

// Hydrate cache with SSR data
useHydrateDnsZones(projectId ?? '', zones);

// Always enable watch for real-time updates
useDnsZonesWatch(projectId ?? '');

// Remove the conditional watch based on hasLoadingZones
// Delete: useDnsZonesWatch(projectId ?? '', { enabled: hasLoadingZones });
```

**Step 2: Verify and commit**

```bash
bun run typecheck
git add app/routes/project/detail/edge/dns-zones/index.tsx
git commit -m "feat(dns-zones): integrate hydration + always-on watch"
```

---

### Task 2.2: Update DNS Zones Detail/Layout Pages

**Files:**

- Modify: `app/routes/project/detail/edge/dns-zones/layout.tsx`
- Modify: `app/routes/project/detail/edge/dns-zones/detail/*.tsx` (if exists)

**Step 1: Add hydration hook to layout**

```typescript
import { useHydrateDnsZone, useDnsZoneWatch } from '@/resources/dns-zones';

// In component:
const { zone } = useLoaderData<typeof loader>();
const { projectId, dnsZoneId } = useParams();

// Hydrate cache with SSR data
useHydrateDnsZone(projectId ?? '', dnsZoneId ?? '', zone);

// Enable watch for real-time updates
useDnsZoneWatch(projectId ?? '', dnsZoneId ?? '');
```

**Step 2: Verify and commit**

```bash
bun run typecheck
git add app/routes/project/detail/edge/dns-zones/
git commit -m "feat(dns-zones): integrate hydration + watch in detail pages"
```

---

### Task 2.3: Update HTTP Proxies Pages

**Files:**

- Modify: `app/routes/project/detail/edge/proxy/index.tsx`
- Modify: `app/routes/project/detail/edge/proxy/layout.tsx`

**Step 1: Add hydration + watch to index**

```typescript
import { useHydrateHttpProxies, useHttpProxiesWatch } from '@/resources/http-proxies';

// Hydrate and watch
useHydrateHttpProxies(projectId ?? '', proxies);
useHttpProxiesWatch(projectId ?? '');
```

**Step 2: Add hydration + watch to layout/detail**

```typescript
import { useHydrateHttpProxy, useHttpProxyWatch } from '@/resources/http-proxies';

useHydrateHttpProxy(projectId ?? '', proxyId ?? '', proxy);
useHttpProxyWatch(projectId ?? '', proxyId ?? '');
```

**Step 3: Verify and commit**

```bash
bun run typecheck
git add app/routes/project/detail/edge/proxy/
git commit -m "feat(http-proxies): integrate hydration + watch in pages"
```

---

### Task 2.4: Update Domains Pages

**Files:**

- Modify: `app/routes/project/detail/edge/domains/index.tsx`
- Modify: `app/routes/project/detail/edge/domains/layout.tsx` (if exists)

**Step 1: Add hydration + watch**

```typescript
import { useHydrateDomains, useDomainsWatch } from '@/resources/domains';

useHydrateDomains(projectId ?? '', domains);
useDomainsWatch(projectId ?? '');
```

**Step 2: Verify and commit**

```bash
bun run typecheck
git add app/routes/project/detail/edge/domains/
git commit -m "feat(domains): integrate hydration + watch in pages"
```

---

### Task 2.5: Update Secrets Pages

**Files:**

- Modify: `app/routes/project/detail/secrets/index.tsx`
- Modify: `app/routes/project/detail/secrets/layout.tsx` (if exists)

**Step 1: Add hydration + watch**

```typescript
import { useHydrateSecrets, useSecretsWatch } from '@/resources/secrets';

useHydrateSecrets(projectId ?? '', secrets);
useSecretsWatch(projectId ?? '');
```

**Step 2: Verify and commit**

```bash
bun run typecheck
git add app/routes/project/detail/secrets/
git commit -m "feat(secrets): integrate hydration + watch in pages"
```

---

### Task 2.6: Update DNS Records Pages

**Files:**

- Modify: `app/routes/project/detail/edge/dns-zones/detail/records/index.tsx`

**Step 1: Add hydration + watch**

```typescript
import { useHydrateDnsRecords, useDnsRecordsWatch } from '@/resources/dns-records';

useHydrateDnsRecords(projectId ?? '', zoneId ?? '', records);
useDnsRecordsWatch(projectId ?? '', zoneId ?? '');
```

**Step 2: Verify and commit**

```bash
bun run typecheck
git add app/routes/project/detail/edge/dns-zones/detail/records/
git commit -m "feat(dns-records): integrate hydration + watch in pages"
```

---

## Phase 3: Delete BFF Routes

### Task 3.1: Delete DNS Zones BFF Route

**Files:**

- Delete: `app/routes/api/dns-zones/index.ts`
- Modify: `app/routes.ts` (line 231)

**Step 1: Verify no usages remain**

```bash
grep -r "ROUTE_PATH.*dns-zones" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
grep -r "/api/dns-zones" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
```

Expected: No matches (mutations should use hooks)

**Step 2: Delete route file**

```bash
rm app/routes/api/dns-zones/index.ts
rmdir app/routes/api/dns-zones
```

**Step 3: Remove from routes.ts**

Delete line 231: `route('dns-zones', 'routes/api/dns-zones/index.ts'),`

**Step 4: Verify and commit**

```bash
bun run typecheck
git add -A
git commit -m "refactor(dns-zones): delete BFF route, use service layer directly"
```

---

### Task 3.2: Delete DNS Records BFF Routes

**Files:**

- Delete: `app/routes/api/dns-records/index.ts`
- Delete: `app/routes/api/dns-records/$id.ts`
- Delete: `app/routes/api/dns-records/status.ts`
- Delete: `app/routes/api/dns-records/bulk-import.ts`
- Modify: `app/routes.ts` (lines 248-251)

**Step 1: Verify no usages remain**

```bash
grep -r "ROUTE_PATH.*dns-records" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
grep -r "/api/dns-records" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
```

**Step 2: Delete route files**

```bash
rm app/routes/api/dns-records/index.ts
rm app/routes/api/dns-records/\$id.ts
rm app/routes/api/dns-records/status.ts
rm app/routes/api/dns-records/bulk-import.ts
rmdir app/routes/api/dns-records
```

**Step 3: Remove from routes.ts**

Delete lines 248-251:

```
route('dns-records', 'routes/api/dns-records/index.ts'),
route('dns-records/bulk-import', 'routes/api/dns-records/bulk-import.ts'),
route('dns-records/:id', 'routes/api/dns-records/$id.ts'),
route('dns-records/:id/status', 'routes/api/dns-records/status.ts'),
```

**Step 4: Verify and commit**

```bash
bun run typecheck
git add -A
git commit -m "refactor(dns-records): delete BFF routes, use service layer directly"
```

---

### Task 3.3: Delete HTTP Proxies BFF Routes

**Files:**

- Delete: `app/routes/api/proxy/index.ts`
- Delete: `app/routes/api/proxy/$id.ts`
- Modify: `app/routes.ts` (lines 234-235)

**Step 1: Verify no usages remain**

```bash
grep -r "ROUTE_PATH.*proxy" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
grep -r "/api/proxy" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
```

**Step 2: Delete route files**

```bash
rm app/routes/api/proxy/index.ts
rm app/routes/api/proxy/\$id.ts
rmdir app/routes/api/proxy
```

**Step 3: Remove from routes.ts**

Delete lines 234-235:

```
route('proxy', 'routes/api/proxy/index.ts'),
route('proxy/:id', 'routes/api/proxy/$id.ts'),
```

**Step 4: Verify and commit**

```bash
bun run typecheck
git add -A
git commit -m "refactor(http-proxies): delete BFF routes, use service layer directly"
```

---

### Task 3.4: Delete Domains BFF Routes

**Files:**

- Delete: `app/routes/api/domains/index.ts`
- Delete: `app/routes/api/domains/refresh.ts`
- Delete: `app/routes/api/domains/status.ts`
- Delete: `app/routes/api/domains/bulk-import.ts`
- Modify: `app/routes.ts` (lines 225-228)

**Step 1: Verify no usages remain**

```bash
grep -r "ROUTE_PATH.*domains" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
grep -r "/api/domains" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
```

**Step 2: Delete route files**

```bash
rm app/routes/api/domains/index.ts
rm app/routes/api/domains/refresh.ts
rm app/routes/api/domains/status.ts
rm app/routes/api/domains/bulk-import.ts
rmdir app/routes/api/domains
```

**Step 3: Remove from routes.ts**

Delete lines 225-228:

```
route('domains', 'routes/api/domains/index.ts'),
route('domains/refresh', 'routes/api/domains/refresh.ts'),
route('domains/bulk-import', 'routes/api/domains/bulk-import.ts'),
route('domains/:id/status', 'routes/api/domains/status.ts'),
```

**Step 4: Verify and commit**

```bash
bun run typecheck
git add -A
git commit -m "refactor(domains): delete BFF routes, use service layer directly"
```

---

### Task 3.5: Delete Secrets BFF Route

**Files:**

- Delete: `app/routes/api/secrets/index.ts`
- Modify: `app/routes.ts` (line 242)

**Step 1: Verify no usages remain**

```bash
grep -r "ROUTE_PATH.*secrets" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
grep -r "/api/secrets" app/ --include="*.tsx" --include="*.ts" | grep -v "routes/api"
```

**Step 2: Delete route file**

```bash
rm app/routes/api/secrets/index.ts
rmdir app/routes/api/secrets
```

**Step 3: Remove from routes.ts**

Delete line 242: `route('secrets', 'routes/api/secrets/index.ts'),`

**Step 4: Verify and commit**

```bash
bun run typecheck
git add -A
git commit -m "refactor(secrets): delete BFF route, use service layer directly"
```

---

## Phase 4: Final Verification

### Task 4.1: Full Build Verification

**Step 1: Run full typecheck**

```bash
bun run typecheck
```

Expected: No errors

**Step 2: Run lint**

```bash
bun run lint
```

Expected: No errors

**Step 3: Run build**

```bash
bun run build
```

Expected: Build succeeds

**Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build issues from BFF cleanup"
```

---

### Task 4.2: Manual Testing Checklist

**Test each resource:**

1. **DNS Zones**
   - [ ] List page loads instantly (SSR)
   - [ ] Create new zone → appears in list (watch)
   - [ ] Delete zone → removed from list (watch)
   - [ ] Edit zone → updates in list (watch)

2. **DNS Records**
   - [ ] Records list loads instantly
   - [ ] CRUD operations update via watch

3. **HTTP Proxies**
   - [ ] List and detail pages work
   - [ ] CRUD operations update via watch

4. **Domains**
   - [ ] List and detail pages work
   - [ ] Refresh registration works
   - [ ] Bulk import works

5. **Secrets**
   - [ ] List and detail pages work
   - [ ] CRUD operations update via watch

---

## Summary

**Total Tasks:** 12

| Phase   | Tasks | Description                          |
| ------- | ----- | ------------------------------------ |
| Phase 1 | 5     | Add hydration hooks to all resources |
| Phase 2 | 6     | Integrate hydration + watch in pages |
| Phase 3 | 5     | Delete BFF routes                    |
| Phase 4 | 2     | Final verification                   |

**Files Created:** 1

- `app/resources/domains/domain.watch.ts`

**Files Modified:** ~15

- 5 resource query files (hydration hooks)
- 5 resource index files (exports)
- ~5 page route files (integration)
- 1 routes.ts (remove registrations)

**Files Deleted:** 13

- `app/routes/api/dns-zones/index.ts`
- `app/routes/api/dns-records/index.ts`
- `app/routes/api/dns-records/$id.ts`
- `app/routes/api/dns-records/status.ts`
- `app/routes/api/dns-records/bulk-import.ts`
- `app/routes/api/proxy/index.ts`
- `app/routes/api/proxy/$id.ts`
- `app/routes/api/domains/index.ts`
- `app/routes/api/domains/refresh.ts`
- `app/routes/api/domains/status.ts`
- `app/routes/api/domains/bulk-import.ts`
- `app/routes/api/secrets/index.ts`
