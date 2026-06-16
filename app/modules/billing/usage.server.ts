import type {
  MeterBreakdownSeries,
  MeterDefinition,
  MeterPoint,
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
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { env } from '@/utils/env/env.server';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';

const DEFAULT_DAYS = 30;

export interface UsageTimeRange {
  startSec: number;
  endSec: number;
}

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

// Cap the number of dimensions we fan breakdown queries out for, per
// meter. Each dimension is an extra Amberflo round-trip, so we bound the
// loader's fan-out; the UI only surfaces a handful of tabs anyway.
const MAX_BREAKDOWN_DIMENSIONS = 3;

/** Platform dimension injected by the billing pipeline (not on MeterDefinition). */
const PROJECT_BREAKDOWN_DIMENSION = 'project_id';

export async function listMeterDefinitions(): Promise<MeterDefinition[]> {
  try {
    const axios = client.getConfig().axios;
    if (!axios) return [];
    const baseUrl = axios.defaults?.baseURL ?? '';
    const resp = await axios.get(`${baseUrl}/apis/billing.miloapis.com/v1alpha1/meterdefinitions`);
    const items: {
      metadata?: { uid?: string };
      spec?: {
        meterName?: string;
        displayName?: string;
        description?: string;
        measurement?: { unit?: string; aggregation?: string; dimensions?: string[] };
        monitoredResourceTypes?: string[];
      };
    }[] = resp.data?.items ?? [];
    return items
      .map((item) => ({
        // Amberflo meterApiName is metadata.uid (not spec.meterName); see amberflo-provider.
        meterApiName: item.metadata?.uid ?? '',
        meterName: item.spec?.meterName ?? '',
        displayName: item.spec?.displayName ?? item.spec?.meterName ?? '',
        description: item.spec?.description,
        unit: item.spec?.measurement?.unit,
        aggregation: item.spec?.measurement?.aggregation,
        dimensions: item.spec?.measurement?.dimensions ?? [],
        monitoredResourceTypes: item.spec?.monitoredResourceTypes ?? [],
      }))
      .filter((m) => m.meterApiName && m.meterName);
  } catch {
    return [];
  }
}

/**
 * Reverse-DNS service domain that owns a meter, e.g.
 * `assistant.miloapis.com/conversation/input-tokens` → `assistant.miloapis.com`.
 *
 * The richer source would be the meter's first MonitoredResourceType →
 * `gvk.group`, but that catalog (`billing.miloapis.com/monitoredresourcetypes`)
 * is cluster-scoped and 403s through the end-user IAM proxy. The meter name
 * prefix resolves to the same service domain, so we derive the group from it
 * directly and avoid a guaranteed-failing round-trip.
 */
function serviceDomainFromMeterName(meterName: string): string {
  const slash = meterName.indexOf('/');
  return slash > 0 ? meterName.slice(0, slash) : meterName;
}

/** `compute.miloapis.com` → `Compute`; `ai-gateway.x` → `Ai Gateway`. */
function humanizeServiceGroup(domain: string): string {
  const label = domain.split('.')[0] ?? domain;
  return label
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function resolveMeterGroup(def: MeterDefinition): { id: string; title: string } {
  const domain = serviceDomainFromMeterName(def.meterName);
  return { id: domain, title: humanizeServiceGroup(domain) };
}

interface SparseClientMeter {
  values?: { secondsSinceEpochUtc: number; value: number }[];
  group?: { groupInfo?: Record<string, string> };
  groupInfo?: Record<string, string>;
  groupColumns?: Record<string, string>;
}

/** Amberflo `/usage` nests dimensions under `group.groupInfo`. */
function resolveGroupInfo(cm: SparseClientMeter): Record<string, string> {
  return cm.group?.groupInfo ?? cm.groupInfo ?? cm.groupColumns ?? {};
}

function clientMeterToPoints(cm: SparseClientMeter | undefined): MeterPoint[] {
  return (cm?.values ?? []).map((v) => ({
    timestamp: v.secondsSinceEpochUtc * 1000,
    value: v.value,
  }));
}

function aggregateMeterValues(clientMeters: SparseClientMeter[] | undefined): MeterPoint[] {
  const totalsByTs = new Map<number, number>();
  for (const cm of clientMeters ?? []) {
    for (const v of cm.values ?? []) {
      const ts = v.secondsSinceEpochUtc * 1000;
      totalsByTs.set(ts, (totalsByTs.get(ts) ?? 0) + v.value);
    }
  }
  const points = Array.from(totalsByTs.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
  // `/usage` returns a daily bucket per day even when consumption is zero.
  // Treat an all-zero window as no data so empty states stay accurate.
  if (points.length > 0 && points.every((point) => point.value === 0)) {
    return [];
  }
  return points;
}

interface SparseQueryArgs {
  meterApiName: string;
  customerIds: string[];
  startSec: number;
  nowSec: number;
  apiKey: string;
  baseUrl: string;
  /** When set, scopes Amberflo to a single Milo project (billing pipeline system dimension). */
  projectId?: string;
}

/**
 * POST Amberflo `/usage` (daily-aggregated series). Staff-portal uses the
 * same endpoint; `/usage/sparse` returns empty `clientMeters` for
 * pre-aggregated meters even when `/usage` has data.
 */
async function queryUsage(args: SparseQueryArgs, groupBy: string[]): Promise<SparseClientMeter[]> {
  const { meterApiName, customerIds, startSec, nowSec, apiKey, baseUrl, projectId } = args;
  const filter: Record<string, string[]> = { customerId: customerIds };
  if (projectId) {
    filter.project_id = [projectId];
  }
  const resp = await fetch(`${baseUrl}/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      meterApiName,
      aggregation: 'sum',
      timeGroupingInterval: 'day',
      timeRange: { startTimeInSeconds: startSec, endTimeInSeconds: nowSec },
      filter,
      groupBy,
    }),
  });
  if (!resp.ok) return [];
  const json = (await resp.json()) as { clientMeters?: SparseClientMeter[] };
  return json.clientMeters ?? [];
}

/** Aggregate series for a meter, summed across the supplied customers. */
async function fetchAggregateSeries(args: SparseQueryArgs): Promise<MeterPoint[]> {
  return aggregateMeterValues(await queryUsage(args, ['customerId']));
}

/** One series per value of `dimension`, summed across the supplied customers. */
async function fetchMeterBreakdown(
  args: SparseQueryArgs,
  dimension: string
): Promise<MeterBreakdownSeries[]> {
  const clientMeters = await queryUsage(args, [dimension]);
  const pointsByGroup = new Map<string, Map<number, number>>();

  for (const cm of clientMeters) {
    const groupInfo = resolveGroupInfo(cm);
    const groupValue = groupInfo[dimension];
    // Amberflo returns a single aggregate bucket with empty `groupInfo` when
    // the dimension is declared but not populated on events — skip those so
    // breakdown tabs don't mirror the Total series.
    if (!groupValue) continue;

    const byTimestamp = pointsByGroup.get(groupValue) ?? new Map<number, number>();
    for (const point of clientMeterToPoints(cm)) {
      byTimestamp.set(point.timestamp, (byTimestamp.get(point.timestamp) ?? 0) + point.value);
    }
    pointsByGroup.set(groupValue, byTimestamp);
  }

  return [...pointsByGroup.entries()]
    .map(([groupValue, byTimestamp]) => {
      const values = [...byTimestamp.entries()]
        .map(([timestamp, value]) => ({ timestamp, value }))
        .sort((a, b) => a.timestamp - b.timestamp);
      const total = values.reduce((acc, point) => acc + point.value, 0);
      return { groupValue, values: total === 0 ? [] : values };
    })
    .filter((series) => series.values.length > 0);
}

export async function fetchUsageForCustomerIds({
  customerIds,
  days = DEFAULT_DAYS,
  range,
  projectId,
}: {
  customerIds: string[];
  days?: number;
  range?: UsageTimeRange;
  projectId?: string;
}): Promise<MeterSeries[]> {
  const apiKey = env.server.amberfloApiKey;
  if (!apiKey || customerIds.length === 0) {
    return [];
  }

  const baseUrl = env.server.amberfloBaseUrl ?? 'https://app.amberflo.io';
  const { startSec, endSec: nowSec } = resolveQueryTimeRange(days, range);

  const meterDefs = await listMeterDefinitions();

  return Promise.all(
    meterDefs.map(async (def): Promise<MeterSeries> => {
      const group = resolveMeterGroup(def);
      const base: MeterSeries = {
        meterApiName: def.meterApiName,
        meterName: def.meterName,
        label: def.displayName,
        values: [],
        description: def.description,
        unit: def.unit,
        aggregation: def.aggregation,
        dimensions: def.dimensions,
        groupId: group.id,
        groupTitle: group.title,
      };

      const queryArgs: SparseQueryArgs = {
        meterApiName: def.meterApiName,
        customerIds,
        startSec,
        nowSec,
        apiKey,
        baseUrl,
        projectId,
      };

      try {
        const dims = (def.dimensions ?? []).slice(0, MAX_BREAKDOWN_DIMENSIONS);
        const [values, meterBreakdowns, projectBreakdown] = await Promise.all([
          fetchAggregateSeries(queryArgs),
          Promise.all(
            dims.map(async (dimension) => ({
              dimension,
              series: await fetchMeterBreakdown(queryArgs, dimension),
            }))
          ),
          projectId
            ? Promise.resolve({ dimension: PROJECT_BREAKDOWN_DIMENSION, series: [] })
            : fetchMeterBreakdown(queryArgs, PROJECT_BREAKDOWN_DIMENSION).then((series) => ({
                dimension: PROJECT_BREAKDOWN_DIMENSION,
                series,
              })),
        ]);
        const breakdowns = [
          ...(projectBreakdown.series.length > 0 ? [projectBreakdown] : []),
          ...meterBreakdowns.filter((b) => b.series.length > 0),
        ];
        return { ...base, values, breakdowns };
      } catch {
        return base;
      }
    })
  );
}

/** Coerce a quota status amount (bigint | number | string) to a number. */
function toQuotaNumber(value: unknown): number | undefined {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

const normalizeJoinKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Best-effort join from a usage meter to a quota AllowanceBucket. The
 * platform has no canonical meter↔quota mapping today, so we match on a
 * normalized substring of the bucket's `resourceType` against the meter
 * name / its monitored resource types. Meters with no match render
 * without a quota ring rather than showing a fabricated ceiling.
 */
function matchBucketForMeter(
  meter: MeterSeries,
  buckets: AllowanceBucket[]
): AllowanceBucket | undefined {
  const haystacks = [meter.meterName ?? meter.meterApiName, ...(meter.dimensions ?? [])].map(
    normalizeJoinKey
  );
  return buckets.find((bucket) => {
    const needle = normalizeJoinKey(bucket.resourceType);
    if (!needle) return false;
    return haystacks.some((h) => h.includes(needle) || needle.includes(h));
  });
}

function attachQuotaLimits(meters: MeterSeries[], buckets: AllowanceBucket[]): MeterSeries[] {
  if (buckets.length === 0) return meters;
  return meters.map((meter) => {
    const bucket = matchBucketForMeter(meter, buckets);
    const status = bucket?.status as { allocated?: unknown; limit?: unknown } | undefined;
    if (!status) return meter;
    const limit = toQuotaNumber(status.limit);
    const used = toQuotaNumber(status.allocated);
    return {
      ...meter,
      ...(limit !== undefined ? { limit } : {}),
      ...(used !== undefined ? { used } : {}),
    };
  });
}

/** Bucket meters by owning service group, preserving first-seen order. */
function buildUsageGroups(meters: MeterSeries[]): UsageGroup[] {
  const byId = new Map<string, UsageGroup>();
  for (const meter of meters) {
    const id = meter.groupId ?? 'other';
    const title = meter.groupTitle ?? 'Other';
    const group = byId.get(id) ?? { id, title, meterApiNames: [] };
    group.meterApiNames.push(meter.meterApiName);
    byId.set(id, group);
  }
  return Array.from(byId.values());
}

function isAuthError(err: unknown): boolean {
  return err instanceof AuthorizationError || err instanceof AuthenticationError;
}

async function resolveProjectCustomerId(
  orgId: string,
  projectId: string
): Promise<
  | { status: 'ok'; customerId: string }
  | { status: 'no-billing-account' | 'insufficient-permissions' }
> {
  let bindings;
  try {
    bindings = await createBillingAccountBindingService().list(orgId);
  } catch (err) {
    if (isAuthError(err)) {
      return { status: 'insufficient-permissions' };
    }
    throw err;
  }

  const binding = bindings.find(
    (b) =>
      b.spec?.projectRef?.name === projectId && (!b.status?.phase || b.status.phase === 'Active')
  );
  if (!binding?.spec?.billingAccountRef?.name) {
    return { status: 'no-billing-account' };
  }

  let account;
  try {
    account = await createBillingAccountService().get(orgId, binding.spec.billingAccountRef.name);
  } catch (err) {
    if (isAuthError(err)) {
      return { status: 'insufficient-permissions' };
    }
    throw err;
  }

  const customerId = account.metadata?.uid;
  if (!customerId) {
    return { status: 'no-billing-account' };
  }

  return { status: 'ok', customerId };
}

export async function fetchOrgUsage(
  orgId: string,
  options: { days?: number; range?: UsageTimeRange; projectId?: string } = {}
): Promise<UsageFetchResult> {
  const { days = DEFAULT_DAYS, range, projectId } = options;
  const { days: resolvedDays } = resolveQueryTimeRange(days, range);

  if (!env.server.amberfloApiKey) {
    return { status: 'unconfigured', meters: [], days: resolvedDays, projectId };
  }

  const enabled = await isFeatureEnabled(FeatureFlag.UsageMeteringDashboard, orgId);
  if (!enabled) {
    return {
      status: 'feature-disabled',
      meters: [],
      days: resolvedDays,
      message: 'Usage metering is not enabled for this organization.',
      projectId,
    };
  }

  let customerIds: string[];
  if (projectId) {
    const resolved = await resolveProjectCustomerId(orgId, projectId);
    if (resolved.status !== 'ok') {
      return { status: resolved.status, meters: [], days: resolvedDays, projectId };
    }
    customerIds = [resolved.customerId];
  } else {
    let accounts;
    try {
      accounts = await createBillingAccountService().list(orgId);
    } catch (err) {
      if (isAuthError(err)) {
        return { status: 'insufficient-permissions', meters: [], days: resolvedDays };
      }
      throw err;
    }

    customerIds = [
      ...new Set(
        accounts
          .map((account) => account.metadata?.uid)
          .filter((uid): uid is string => Boolean(uid))
      ),
    ];

    if (customerIds.length === 0) {
      return { status: 'no-billing-account', meters: [], days: resolvedDays };
    }
  }

  const meters = await fetchUsageForCustomerIds({ customerIds, days, range, projectId });
  const buckets = projectId
    ? await createAllowanceBucketService()
        .list('project', projectId)
        .catch(() => [] as AllowanceBucket[])
    : await createAllowanceBucketService()
        .list('organization', orgId)
        .catch(() => [] as AllowanceBucket[]);
  const enriched = attachQuotaLimits(meters, buckets);
  return {
    status: 'ok',
    meters: enriched,
    groups: buildUsageGroups(enriched),
    days: resolvedDays,
    projectId,
  };
}

function resolveUsageProjectSelection(
  projectParam: string | null | undefined,
  projectNames: string[]
): string {
  if (!projectParam || projectParam === 'all') return 'all';
  return projectNames.includes(projectParam) ? projectParam : 'all';
}

/**
 * Resolve billing cycle windows and Amberflo usage for the org usage
 * dashboard. Shared by the Hono API route and any server callers.
 */
export async function loadOrgUsageDashboard(
  orgId: string,
  options: {
    projectParam?: string | null;
    cycleParam?: string | null;
    projectNames?: string[];
  } = {}
): Promise<OrgUsageDashboardData> {
  const { projectParam, cycleParam, projectNames = [] } = options;
  const selectedProject = resolveUsageProjectSelection(projectParam, projectNames);

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

  const usage = await fetchOrgUsage(orgId, {
    range,
    projectId: selectedProject === 'all' ? undefined : selectedProject,
  });

  return {
    usage,
    selectedProject,
    billingCycles,
    selectedBillingCycle,
  };
}
