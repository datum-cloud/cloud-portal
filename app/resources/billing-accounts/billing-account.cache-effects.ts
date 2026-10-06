import { billingAccountKeys } from './billing-account.service';
import {
  billingAccountListCache,
  crossOrgListCache,
  crossOrgListKeys,
  crossOrgRowKey,
} from './billing-account.watch';
import type { BillingAccount } from '@/features/billing/types';
import {
  removeResource,
  upsertResource,
  type CacheEffects,
  type ResourceKeys,
} from '@/modules/watch/resource-cache';
import type { QueryClient } from '@tanstack/react-query';

const { getMeta } = billingAccountListCache;
const getName = (item: unknown) => getMeta(item as BillingAccount).name;

const ownKeys = (orgId: string): ResourceKeys => ({
  lists: billingAccountKeys.list(orgId),
  detail: (name) => billingAccountKeys.detail(orgId, name),
});

function write(qc: QueryClient, orgId: string, account: BillingAccount) {
  upsertResource(qc, ownKeys(orgId), account, { origin: 'server', getMeta });
  for (const lists of crossOrgListKeys(qc, orgId)) {
    upsertResource(qc, { lists }, account, { origin: 'server', ...crossOrgListCache });
  }
}

/** Also writes the cross-org lists: the per-org watch that mirrors into them may not be mounted. */
export const billingAccountCacheEffects: CacheEffects<BillingAccount> = {
  created: write,
  updated: write,
  async deleted(qc, orgId, name) {
    const own = ownKeys(orgId);
    const crossOrg = crossOrgListKeys(qc, orgId);
    await Promise.all([
      qc.cancelQueries({ queryKey: own.lists }),
      ...crossOrg.map((lists) => qc.cancelQueries({ queryKey: lists })),
      qc.cancelQueries({ queryKey: billingAccountKeys.detail(orgId, name) }),
    ]);
    removeResource(qc, own, name, { getName });
    for (const lists of crossOrg) {
      removeResource(qc, { lists }, crossOrgRowKey(orgId, name), crossOrgListCache);
    }
  },
};
