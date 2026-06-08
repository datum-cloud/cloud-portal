import { client } from '@/modules/control-plane/shared/client.gen';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createProjectService } from '@/resources/projects';
import { env } from '@/utils/env/env.server';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';

export interface MeterSeries {
  meterApiName: string;
  label: string;
  values: { timestamp: number; value: number }[];
}

export interface MeterDefinition {
  meterName: string;
  displayName: string;
}

export type UsageFetchStatus =
  | 'ok'
  | 'unconfigured'
  | 'insufficient-permissions'
  | 'no-billing-account'
  | 'feature-disabled';

export interface UsageFetchResult {
  status: UsageFetchStatus;
  meters: MeterSeries[];
  days: number;
  message?: string;
}

export interface SummarizedMeterUsage {
  meterApiName: string;
  label: string;
  total: number;
  recentDaily: { date: string; value: number }[];
}

const DEFAULT_DAYS = 30;
const ASSISTANT_DAILY_DETAIL_DAYS = 7;

export async function listMeterDefinitions(): Promise<MeterDefinition[]> {
  try {
    const axios = client.getConfig().axios;
    if (!axios) return [];
    const baseUrl = axios.defaults?.baseURL ?? '';
    const resp = await axios.get(`${baseUrl}/apis/billing.miloapis.com/v1alpha1/meterdefinitions`);
    const items: { spec?: { meterName?: string; displayName?: string } }[] = resp.data?.items ?? [];
    return items
      .map((item) => ({
        meterName: item.spec?.meterName ?? '',
        displayName: item.spec?.displayName ?? item.spec?.meterName ?? '',
      }))
      .filter((m) => m.meterName);
  } catch {
    return [];
  }
}

function aggregateMeterValues(
  clientMeters: { values?: { secondsSinceEpochUtc: number; value: number }[] }[] | undefined
): { timestamp: number; value: number }[] {
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

  const baseUrl = env.server.amberfloBaseUrl;
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - days * 24 * 3600;
  const meterDefs = await listMeterDefinitions();

  return Promise.all(
    meterDefs.map(async ({ meterName, displayName }): Promise<MeterSeries> => {
      try {
        const resp = await fetch(`${baseUrl}/usage/sparse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            meterApiName: meterName,
            timeRange: { startTimeInSeconds: startSec, endTimeInSeconds: nowSec },
            filter: { customerId: customerIds },
            groupBy: ['customerId'],
          }),
        });

        if (!resp.ok) {
          return { meterApiName: meterName, label: displayName, values: [] };
        }

        const json = (await resp.json()) as {
          clientMeters?: { values?: { secondsSinceEpochUtc: number; value: number }[] }[];
        };

        const values =
          customerIds.length === 1
            ? (json.clientMeters?.[0]?.values ?? []).map((v) => ({
                timestamp: v.secondsSinceEpochUtc * 1000,
                value: v.value,
              }))
            : aggregateMeterValues(json.clientMeters);

        return { meterApiName: meterName, label: displayName, values };
      } catch {
        return { meterApiName: meterName, label: displayName, values: [] };
      }
    })
  );
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
  return { status: 'ok', meters, days };
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
  return { status: 'ok', meters, days };
}

export function sumMeterValues(values: { value: number }[]): number {
  return values.reduce((acc, v) => acc + v.value, 0);
}

/** Collapse sparse samples into daily totals for assistant context. */
export function summarizeMetersForAssistant(
  meters: MeterSeries[],
  detailDays = ASSISTANT_DAILY_DETAIL_DAYS
): SummarizedMeterUsage[] {
  const cutoffMs = Date.now() - detailDays * 24 * 3600 * 1000;

  return meters.map((meter) => {
    const dailyByDate = new Map<string, number>();
    for (const { timestamp, value } of meter.values) {
      if (timestamp < cutoffMs) continue;
      const date = new Date(timestamp).toISOString().slice(0, 10);
      dailyByDate.set(date, (dailyByDate.get(date) ?? 0) + value);
    }

    const recentDaily = Array.from(dailyByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      meterApiName: meter.meterApiName,
      label: meter.label,
      total: sumMeterValues(meter.values),
      recentDaily,
    };
  });
}
