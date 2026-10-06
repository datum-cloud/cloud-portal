import { billingAccountKeys } from './billing-account.service';
import type { BillingAccount } from '@/features/billing/types';
import { useResourceWatch, type WatchEvent } from '@/modules/watch';
import { removeResource, upsertResource, type CacheItemMeta } from '@/modules/watch/resource-cache';
import { buildOrganizationNamespace } from '@/utils/common';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useMemo } from 'react';

const RESOURCE_TYPE = 'apis/billing.miloapis.com/v1alpha1/billingaccounts';

const accountMeta = (account: BillingAccount): CacheItemMeta => ({
  name: account.metadata?.name ?? '',
  resourceVersion: account.metadata?.resourceVersion,
  deletionTimestamp: account.metadata?.deletionTimestamp,
});

export const billingAccountListCache = {
  getItemKey: (account: BillingAccount) => account.metadata?.name ?? '',
  getMeta: accountMeta,
};

/** Account names are unique only per org, so cross-org rows key on `namespace/name`. */
export const crossOrgRowKey = (orgId: string, name: string) =>
  `${buildOrganizationNamespace(orgId)}/${name}`;

const crossOrgMeta = (account: BillingAccount): CacheItemMeta => ({
  ...accountMeta(account),
  name: `${account.metadata?.namespace ?? ''}/${account.metadata?.name ?? ''}`,
});

export const crossOrgListCache = {
  getMeta: crossOrgMeta,
  getName: (item: unknown) => crossOrgMeta(item as BillingAccount).name,
};

export function crossOrgListKeys(qc: QueryClient, orgId: string): QueryKey[] {
  const forOrgsPrefix = [...billingAccountKeys.lists(), 'for-orgs'];
  return qc
    .getQueryCache()
    .findAll({ queryKey: forOrgsPrefix })
    .map((query) => query.queryKey)
    .filter((key) =>
      String(key[forOrgsPrefix.length] ?? '')
        .split(',')
        .includes(orgId)
    );
}

export function mirrorToCrossOrgLists(
  qc: QueryClient,
  orgId: string,
  event: WatchEvent<BillingAccount>
): void {
  if (event.type !== 'ADDED' && event.type !== 'MODIFIED' && event.type !== 'DELETED') return;
  const rowKey = crossOrgRowKey(orgId, event.object.metadata?.name ?? '');
  for (const lists of crossOrgListKeys(qc, orgId)) {
    if (event.type === 'DELETED') {
      removeResource(qc, { lists }, rowKey, crossOrgListCache);
    } else {
      upsertResource(qc, { lists }, event.object, { origin: 'watch', ...crossOrgListCache });
    }
  }
}

/**
 * Watch the billing accounts list for one org. Keeps the React Query
 * cache for `billingAccountKeys.list(orgId)`, and every cross-org list that
 * includes the org, in sync with controller updates (e.g. `status.phase`
 * flipping to `Ready`).
 */
export function useBillingAccountsWatch(
  orgId: string | undefined,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => billingAccountKeys.list(orgId ?? ''), [orgId]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);

  return useResourceWatch<BillingAccount>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    queryKey,
    transform: (item) => item as BillingAccount,
    enabled: (options?.enabled ?? true) && !!orgId,
    // In-place list updates so the status badge can flip without a full
    // refetch. resourceCache evicts a row once it gains a deletionTimestamp:
    // K8s sets it on DELETE and the resource stays in LIST responses until
    // finalizers run.
    ...billingAccountListCache,
    onEvent: (event) => {
      if (orgId) mirrorToCrossOrgLists(queryClient, orgId, event);
    },
    // onEvent never sees RESYNC; this resyncs the cross-org lists too.
    getMirroredKeys: () => (orgId ? crossOrgListKeys(queryClient, orgId) : []),
  });
}

/**
 * Watch a single billing account by `(orgId, name)`. Updates the
 * detail cache directly so badges + addresses reflect controller
 * activity without a refetch.
 */
export function useBillingAccountWatch(
  orgId: string | undefined,
  name: string | undefined,
  options?: { enabled?: boolean }
) {
  const queryKey = useMemo(() => billingAccountKeys.detail(orgId ?? '', name ?? ''), [orgId, name]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);

  return useResourceWatch<BillingAccount>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    name,
    queryKey,
    transform: (item) => item as BillingAccount,
    enabled: (options?.enabled ?? true) && !!orgId && !!name,
  });
}
