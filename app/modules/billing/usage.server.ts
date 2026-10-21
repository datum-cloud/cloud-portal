import { filterUsageByEntitlement } from './usage-entitlements';
import {
  breakdownDimensions,
  breakdownDimensionsUnion,
  collectMeterResults,
  dayBuckets,
  planGroupings,
  toMeterSeries,
  toSpend,
} from './usage-query';
import type {
  MeterDefinition,
  MeterSeries,
  OrgUsageDashboardData,
  UsageFetchResult,
  UsageGroup,
} from './usage.types';
import type { BillingAccount } from '@/features/billing/types';
import {
  buildBillingCycleWindows,
  selectBillingCycleWindow,
} from '@/modules/billing/billing-cycle';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createUsageQueryService, type UsageQueryScope } from '@/resources/usage-queries';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';

const DEFAULT_DAYS = 30;

export interface UsageTimeRange {
  startSec: number;
  endSec: number;
}

/**
 * Where the dashboard reads usage from. `organization` may still narrow to
 * one project with `projectId`; `project` makes the request in the project's
 * own context.
 */
export type UsageScope = 'organization' | 'project';

function resolveQueryTimeRange(
  days = DEFAULT_DAYS,
  range?: UsageTimeRange
): { startSec: number; endSec: number; days: number } {
  const nowSec = Math.floor(Date.now() / 1000);
  if (range) {
    const spanDays = Math.max(1, Math.ceil((range.endSec - range.startSec) / 86400));
    return { startSec: range.startSec, endSec: range.endSec, days: spanDays };
  }
  return { startSec: nowSec - days * 24 * 3600, endSec: nowSec, days };
}

/**
 * Billing account whose `paymentTerms` drive the cycle picker. Project
 * scope uses the bound account; org scope uses the first Ready account
 * (falling back to the first account when none are Ready yet).
 */
export async function resolveBillingAccountForUsageScope(
  orgId: string,
  projectId: string | 'all'
): Promise<BillingAccount | null> {
  if (projectId !== 'all') {
    let bindings;
    try {
      bindings = await createBillingAccountBindingService().list(orgId);
    } catch {
      return null;
    }
    const binding = bindings.find(
      (b) =>
        b.spec?.projectRef?.name === projectId && (!b.status?.phase || b.status.phase === 'Active')
    );
    const accountName = binding?.spec?.billingAccountRef?.name;
    if (!accountName) return null;
    try {
      return await createBillingAccountService().get(orgId, accountName);
    } catch {
      return null;
    }
  }

  try {
    const accounts = await createBillingAccountService().list(orgId);
    return accounts.find((account) => account.status?.phase === 'Ready') ?? accounts[0] ?? null;
  } catch {
    return null;
  }
}

/** Phases `UsageQuery` reads; Draft and Retired meters are rejected. */
const QUERYABLE_METER_PHASES = new Set(['Published', 'Deprecated']);

export async function listMeterDefinitions(): Promise<MeterDefinition[]> {
  try {
    const axios = client.getConfig().axios;
    if (!axios) return [];
    const baseUrl = axios.defaults?.baseURL ?? '';
    const resp = await axios.get(`${baseUrl}/apis/billing.miloapis.com/v1alpha1/meterdefinitions`);
    const items: {
      metadata?: { name?: string };
      spec?: {
        meterName?: string;
        displayName?: string;
        description?: string;
        phase?: string;
        measurement?: { unit?: string; aggregation?: string; dimensions?: string[] };
        monitoredResourceTypes?: string[];
      };
      status?: { systemDimensions?: string[] };
    }[] = resp.data?.items ?? [];
    return items
      .filter((item) => QUERYABLE_METER_PHASES.has(item.spec?.phase ?? ''))
      .map((item) => ({
        name: item.metadata?.name ?? '',
        meterName: item.spec?.meterName ?? '',
        displayName: item.spec?.displayName ?? item.spec?.meterName ?? '',
        description: item.spec?.description?.trim() || undefined,
        unit: item.spec?.measurement?.unit,
        aggregation: item.spec?.measurement?.aggregation,
        dimensions: item.spec?.measurement?.dimensions ?? [],
        systemDimensions: item.status?.systemDimensions ?? [],
        monitoredResourceTypes: item.spec?.monitoredResourceTypes ?? [],
      }))
      .filter((m) => m.name && m.meterName);
  } catch {
    return [];
  }
}

/** Bucket meters by owning service group, preserving first-seen order. */
function buildUsageGroups(meters: MeterSeries[]): UsageGroup[] {
  const byId = new Map<string, UsageGroup>();
  for (const meter of meters) {
    const id = meter.groupId ?? 'other';
    const title = meter.groupTitle ?? 'Other';
    const group = byId.get(id) ?? { id, title, meterDefinitions: [] };
    group.meterDefinitions.push(meter.meterDefinition);
    byId.set(id, group);
  }
  return Array.from(byId.values());
}

function isAuthError(err: unknown): boolean {
  return err instanceof AuthorizationError || err instanceof AuthenticationError;
}

/**
 * Read every meter's usage, with its total and per-dimension breakdowns,
 * from `UsageQuery`. Organization scope may narrow to one project with
 * `projectId`; project scope makes the request in that project's context.
 */
export async function fetchOrgUsage(
  orgId: string,
  options: {
    days?: number;
    range?: UsageTimeRange;
    projectId?: string;
    scope?: UsageScope;
  } = {}
): Promise<UsageFetchResult> {
  const { days = DEFAULT_DAYS, range, projectId, scope = 'organization' } = options;
  const { startSec, endSec, days: resolvedDays } = resolveQueryTimeRange(days, range);

  const queryScope: UsageQueryScope =
    scope === 'project' && projectId
      ? { type: 'project', projectId }
      : { type: 'organization', orgId };
  const narrowToProject = queryScope.type === 'organization' && projectId ? projectId : undefined;
  // A project breakdown only makes sense across several projects.
  const includeProjectBreakdown = queryScope.type === 'organization' && !narrowToProject;

  const meterDefs = await listMeterDefinitions();
  const groupingPlans = planGroupings(breakdownDimensionsUnion(meterDefs, includeProjectBreakdown));
  const service = createUsageQueryService();

  let statuses;
  try {
    // `meters` is left empty so one query reads every meter, whatever its
    // dimensions. The first query also returns the total and the spend.
    statuses = await Promise.all(
      groupingPlans.map((dimensions, index) =>
        service.query(queryScope, {
          startTime: new Date(startSec * 1000).toISOString(),
          endTime: new Date(endSec * 1000).toISOString(),
          granularity: 'Day',
          timeZone: 'UTC',
          projects: narrowToProject ? [narrowToProject] : undefined,
          includeSpend: index === 0 || undefined,
          groupings: [
            ...(index === 0 ? [{ groupBy: [] }] : []),
            ...dimensions.map((d) => ({ groupBy: [d] })),
          ],
        })
      )
    );
  } catch (err) {
    if (isAuthError(err)) {
      return { status: 'insufficient-permissions', meters: [], days: resolvedDays, projectId };
    }
    throw err;
  }

  // Organization queries report the billing accounts they read; none means
  // the org has no billing account yet. Project queries never list them.
  const [primary] = statuses;
  if (queryScope.type === 'organization' && !primary.billingAccounts?.length) {
    return { status: 'no-billing-account', meters: [], days: resolvedDays, projectId };
  }

  const buckets = dayBuckets(startSec, endSec);
  const results = collectMeterResults(statuses);
  const meters = meterDefs.map((def) => {
    const result = results.get(def.name);
    if (result?.error) {
      // Not set up in the metering backend yet; it shows empty.
      logger.warn('UsageQuery could not read meter', {
        meterDefinition: def.name,
        error: result.error,
      });
    }
    return toMeterSeries(def, result, breakdownDimensions(def, includeProjectBreakdown), buckets);
  });
  if (primary.spendError) {
    logger.warn('UsageQuery could not total spend', { orgId, error: primary.spendError });
  }

  return {
    status: 'ok',
    meters,
    groups: buildUsageGroups(meters),
    days: resolvedDays,
    projectId,
    spend: toSpend(primary.spend),
    spendError: primary.spendError || undefined,
  };
}

export function resolveUsageProjectSelection(
  projectParam: string | null | undefined,
  projectNames: string[]
): string {
  if (!projectParam || projectParam === 'all') return 'all';
  return projectNames.includes(projectParam) ? projectParam : 'all';
}

/**
 * Resolve billing cycle windows and usage for the usage dashboard. Shared
 * by the Hono API route and any server callers.
 */
export async function loadOrgUsageDashboard(
  orgId: string,
  options: {
    projectParam?: string | null;
    cycleParam?: string | null;
    projectNames?: string[];
    /**
     * `project` reads in the project's own context; `projectParam` must
     * then name the project.
     */
    scope?: UsageScope;
    /**
     * Active entitlement ids for the projects in scope. `null` or omitted
     * means unknown, and gated services stay visible.
     */
    entitledServiceIds?: ReadonlySet<string> | null;
  } = {}
): Promise<OrgUsageDashboardData> {
  const {
    projectParam,
    cycleParam,
    projectNames = [],
    scope = 'organization',
    entitledServiceIds = null,
  } = options;
  const selectedProject =
    scope === 'project' && projectParam
      ? projectParam
      : resolveUsageProjectSelection(projectParam, projectNames);

  const scopedBillingAccount = await resolveBillingAccountForUsageScope(
    orgId,
    selectedProject
  ).catch(() => null);

  const cycleWindows = buildBillingCycleWindows(scopedBillingAccount?.spec?.paymentTerms);
  const selectedCycleWindow = selectBillingCycleWindow(cycleWindows, cycleParam);
  const selectedBillingCycle = selectedCycleWindow.value;
  const billingCycles = cycleWindows.map((window) => ({
    value: window.value,
    label: window.label,
  }));
  const range = { startSec: selectedCycleWindow.startSec, endSec: selectedCycleWindow.endSec };

  const usage = filterUsageByEntitlement(
    await fetchOrgUsage(orgId, {
      range,
      projectId: selectedProject === 'all' ? undefined : selectedProject,
      scope: selectedProject === 'all' ? 'organization' : scope,
    }),
    entitledServiceIds
  );

  return {
    usage,
    selectedProject,
    billingCycles,
    selectedBillingCycle,
  };
}
