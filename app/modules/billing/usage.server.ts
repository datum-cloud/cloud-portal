import type {
  MeterBreakdownSeries,
  MeterDefinition,
  MeterPoint,
  MeterSeries,
  UsageFetchResult,
  UsageGroup,
} from './usage.types';
import { client } from '@/modules/control-plane/shared/client.gen';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createProjectService } from '@/resources/projects';
import { env } from '@/utils/env/env.server';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';

const DEFAULT_DAYS = 30;

// Cap the number of dimensions we fan breakdown queries out for, per
// meter. Each dimension is an extra Amberflo round-trip, so we bound the
// loader's fan-out; the UI only surfaces a handful of tabs anyway.
const MAX_BREAKDOWN_DIMENSIONS = 3;

export async function listMeterDefinitions(): Promise<MeterDefinition[]> {
  try {
    const axios = client.getConfig().axios;
    if (!axios) return [];
    const baseUrl = axios.defaults?.baseURL ?? '';
    const resp = await axios.get(`${baseUrl}/apis/billing.miloapis.com/v1alpha1/meterdefinitions`);
    const items: {
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
        meterName: item.spec?.meterName ?? '',
        displayName: item.spec?.displayName ?? item.spec?.meterName ?? '',
        description: item.spec?.description,
        unit: item.spec?.measurement?.unit,
        aggregation: item.spec?.measurement?.aggregation,
        dimensions: item.spec?.measurement?.dimensions ?? [],
        monitoredResourceTypes: item.spec?.monitoredResourceTypes ?? [],
      }))
      .filter((m) => m.meterName);
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
  groupInfo?: Record<string, string>;
  groupColumns?: Record<string, string>;
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
  return Array.from(totalsByTs.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

interface SparseQueryArgs {
  meterName: string;
  customerIds: string[];
  startSec: number;
  nowSec: number;
  apiKey: string;
  baseUrl: string;
}

/** POST Amberflo `/usage/sparse`. Returns the raw grouped client meters. */
async function querySparse(args: SparseQueryArgs, groupBy: string[]): Promise<SparseClientMeter[]> {
  const { meterName, customerIds, startSec, nowSec, apiKey, baseUrl } = args;
  const resp = await fetch(`${baseUrl}/usage/sparse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      meterApiName: meterName,
      timeRange: { startTimeInSeconds: startSec, endTimeInSeconds: nowSec },
      filter: { customerId: customerIds },
      groupBy,
    }),
  });
  if (!resp.ok) return [];
  const json = (await resp.json()) as { clientMeters?: SparseClientMeter[] };
  return json.clientMeters ?? [];
}

/** Aggregate series for a meter, summed across the supplied customers. */
async function fetchAggregateSeries(args: SparseQueryArgs): Promise<MeterPoint[]> {
  return aggregateMeterValues(await querySparse(args, ['customerId']));
}

/** One series per value of `dimension`, summed across the supplied customers. */
async function fetchMeterBreakdown(
  args: SparseQueryArgs,
  dimension: string
): Promise<MeterBreakdownSeries[]> {
  const clientMeters = await querySparse(args, [dimension]);
  return clientMeters
    .map((cm) => {
      const groupInfo = cm.groupInfo ?? cm.groupColumns ?? {};
      const groupValue = groupInfo[dimension] ?? Object.values(groupInfo)[0] ?? 'unknown';
      return { groupValue, values: clientMeterToPoints(cm) };
    })
    .filter((series) => series.values.length > 0);
}

export async function fetchUsageForCustomerIds({
  customerIds,
  days = DEFAULT_DAYS,
}: {
  customerIds: string[];
  days?: number;
}): Promise<MeterSeries[]> {
  const apiKey = env.server.amberfloApiKey;
  if (!apiKey || customerIds.length === 0) {
    return [];
  }

  const baseUrl = env.server.amberfloBaseUrl ?? 'https://app.amberflo.io';
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - days * 24 * 3600;

  const meterDefs = await listMeterDefinitions();

  return Promise.all(
    meterDefs.map(async (def): Promise<MeterSeries> => {
      const group = resolveMeterGroup(def);
      const base: MeterSeries = {
        meterApiName: def.meterName,
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
        meterName: def.meterName,
        customerIds,
        startSec,
        nowSec,
        apiKey,
        baseUrl,
      };

      try {
        const dims = (def.dimensions ?? []).slice(0, MAX_BREAKDOWN_DIMENSIONS);
        const [values, breakdowns] = await Promise.all([
          fetchAggregateSeries(queryArgs),
          Promise.all(
            dims.map(async (dimension) => ({
              dimension,
              series: await fetchMeterBreakdown(queryArgs, dimension),
            }))
          ),
        ]);
        return { ...base, values, breakdowns: breakdowns.filter((b) => b.series.length > 0) };
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
  const haystacks = [meter.meterApiName, ...(meter.dimensions ?? [])].map(normalizeJoinKey);
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

export async function fetchProjectUsage(
  projectId: string,
  days = DEFAULT_DAYS
): Promise<UsageFetchResult> {
  if (!env.server.amberfloApiKey) {
    return { status: 'unconfigured', meters: [], days };
  }

  const project = await createProjectService().get(projectId);
  const enabled = await isFeatureEnabled(
    FeatureFlag.UsageMeteringDashboard,
    project.organizationId
  );
  if (!enabled) {
    return {
      status: 'feature-disabled',
      meters: [],
      days,
      message: 'Usage metering is not enabled for this organization.',
    };
  }

  let bindings;
  try {
    bindings = await createBillingAccountBindingService().list(project.organizationId);
  } catch (err) {
    if (isAuthError(err)) {
      return { status: 'insufficient-permissions', meters: [], days };
    }
    throw err;
  }

  const binding = bindings.find(
    (b) =>
      b.spec?.projectRef?.name === projectId && (!b.status?.phase || b.status.phase === 'Active')
  );
  if (!binding?.spec?.billingAccountRef?.name) {
    return { status: 'no-billing-account', meters: [], days };
  }

  let account;
  try {
    account = await createBillingAccountService().get(
      project.organizationId,
      binding.spec.billingAccountRef.name
    );
  } catch (err) {
    if (isAuthError(err)) {
      return { status: 'insufficient-permissions', meters: [], days };
    }
    throw err;
  }

  const customerId = account.metadata?.uid;
  if (!customerId) {
    return { status: 'no-billing-account', meters: [], days };
  }

  const meters = await fetchUsageForCustomerIds({ customerIds: [customerId], days });
  const buckets = await createAllowanceBucketService()
    .list('project', projectId)
    .catch(() => [] as AllowanceBucket[]);
  const enriched = attachQuotaLimits(meters, buckets);
  return { status: 'ok', meters: enriched, groups: buildUsageGroups(enriched), days };
}

export async function fetchOrgUsage(orgId: string, days = DEFAULT_DAYS): Promise<UsageFetchResult> {
  if (!env.server.amberfloApiKey) {
    return { status: 'unconfigured', meters: [], days };
  }

  const enabled = await isFeatureEnabled(FeatureFlag.UsageMeteringDashboard, orgId);
  if (!enabled) {
    return {
      status: 'feature-disabled',
      meters: [],
      days,
      message: 'Usage metering is not enabled for this organization.',
    };
  }

  let accounts;
  try {
    accounts = await createBillingAccountService().list(orgId);
  } catch (err) {
    if (isAuthError(err)) {
      return { status: 'insufficient-permissions', meters: [], days };
    }
    throw err;
  }

  const customerIds = accounts
    .map((account) => account.metadata?.uid)
    .filter((uid): uid is string => Boolean(uid));

  if (customerIds.length === 0) {
    return { status: 'no-billing-account', meters: [], days };
  }

  const meters = await fetchUsageForCustomerIds({ customerIds, days });
  const buckets = await createAllowanceBucketService()
    .list('organization', orgId)
    .catch(() => [] as AllowanceBucket[]);
  const enriched = attachQuotaLimits(meters, buckets);
  return { status: 'ok', meters: enriched, groups: buildUsageGroups(enriched), days };
}
