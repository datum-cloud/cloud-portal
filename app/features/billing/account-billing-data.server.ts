import type { BillingAccountBinding } from '@/features/billing/types';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { FeatureFlag } from '@/modules/feature-flags/flags';
import { ORG_FAN_OUT_CONCURRENCY } from '@/resources/base/utils';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createPaymentMethodService } from '@/resources/payment-methods';
import { createProjectService } from '@/resources/projects/project.service';
import { orgIdFromNamespace } from '@/utils/common';
import { limitAsync } from 'es-toolkit/promise';

export type ProjectLabelsByOrg = Record<string, Array<{ name: string; displayName: string }>>;

/**
 * Project names and display names for each org, so billing tables can show
 * human labels instead of bare resource ids. At most
 * {@link ORG_FAN_OUT_CONCURRENCY} orgs are listed at a time, and an org whose
 * list fails gets an empty array rather than failing the page.
 */
export async function listProjectLabelsByOrg(
  orgIds: Iterable<string>
): Promise<ProjectLabelsByOrg> {
  const listOne = limitAsync(async (orgId: string) => {
    try {
      const list = await createProjectService().list(orgId);
      return list.items.map((p) => ({ name: p.name, displayName: p.displayName ?? p.name }));
    } catch {
      return [];
    }
  }, ORG_FAN_OUT_CONCURRENCY);

  const ids = Array.from(new Set(orgIds));
  const lists = await Promise.all(ids.map((orgId) => listOne(orgId)));
  return Object.fromEntries(ids.map((orgId, i) => [orgId, lists[i]]));
}

/** Orgs with an active binding in `bindings`, in first-seen order. */
function activeBindingOrgIds(bindings: readonly BillingAccountBinding[]): string[] {
  const orgIds = new Set<string>();
  for (const binding of bindings) {
    if (binding.status?.phase && binding.status.phase !== 'Active') continue;
    const orgId = orgIdFromNamespace(binding.metadata?.namespace);
    if (orgId) orgIds.add(orgId);
  }
  return Array.from(orgIds);
}

async function multiBillingFlagByOrg(orgIds: readonly string[]): Promise<Record<string, boolean>> {
  const evaluate = limitAsync(
    (orgId: string) => isFeatureEnabled(FeatureFlag.MultiBillingAccounts, orgId).catch(() => false),
    ORG_FAN_OUT_CONCURRENCY
  );
  const enabled = await Promise.all(orgIds.map((orgId) => evaluate(orgId)));
  return Object.fromEntries(orgIds.map((orgId, i) => [orgId, enabled[i]]));
}

/**
 * Everything the cross-org billing-accounts page reads per org.
 *
 * The four reads that need only `orgIds` (accounts, bindings, payment methods
 * and the multi-billing flag) start together. Project labels need the bindings,
 * so that fan-out starts as soon as the bindings land instead of waiting for
 * the whole batch. Each fan-out is capped by the service layer or here.
 */
export async function loadAccountBillingData(orgIds: string[]) {
  const bindingsPromise = createBillingAccountBindingService().listForOrgs(orgIds);

  const [accounts, bindings, paymentMethods, multiBillingByOrg, projectsByOrg] = await Promise.all([
    createBillingAccountService().listForOrgs(orgIds),
    bindingsPromise,
    createPaymentMethodService().listForOrgs(orgIds),
    multiBillingFlagByOrg(orgIds),
    // Only orgs with an active binding: nothing else shows a project chip.
    bindingsPromise.then((list) => listProjectLabelsByOrg(activeBindingOrgIds(list))),
  ]);

  return { accounts, bindings, paymentMethods, projectsByOrg, multiBillingByOrg };
}
