import { fetchOrgUsage, sumMeterValues, type MeterSeries } from '@/modules/billing';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { format } from 'date-fns';
import { BarChart3Icon, ExternalLinkIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  data,
  useLoaderData,
  useParams,
} from 'react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const meta: MetaFunction = mergeMeta(() => metaObject('Usage'));

export const handle = {
  breadcrumb: () => <span>Usage</span>,
};

/**
 * Org-wide usage dashboard.
 *
 * Port of the per-project `routes/project/detail/usage/index.tsx` to the
 * org scope. Where the project page resolves a single BillingAccount UID
 * from the project's binding and queries Amberflo for that one customer,
 * this loader lists every BillingAccount in the org's namespace and
 * fans the per-meter query across all of their UIDs in a single
 * `filter.customerId` array — Amberflo sums them server-side, so the
 * UI shape stays identical to the project view.
 *
 * Feature-flag gate is `UsageMeteringDashboard` — the same flag the
 * per-project usage page uses — so the org and project usage surfaces
 * flip on together. The org nav item is hidden on flag-off orgs by the
 * org layout's loader; the flag is re-checked here too so deep-links
 * 404 instead of rendering an empty page on disabled orgs.
 */

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw data('Organization is required', { status: 400 });
  }

  const enabled = await isFeatureEnabled(FeatureFlag.UsageMeteringDashboard, orgId);
  if (!enabled) {
    throw data('Usage metering is not enabled for this organization', { status: 404 });
  }

  const result = await fetchOrgUsage(orgId);
  return data(result);
};

/**
 * Two-column section layout — title + copy on the left, content on the
 * right. Lifted from `routes/account/billing/detail.tsx`. Kept local
 * here so the two consumers can evolve independently until a third
 * page justifies pulling the primitive into `app/components`.
 */
const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="border-border grid grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
};

/**
 * Heuristic formatter. Without `MeterDefinition.spec.unit` (not yet on
 * the API) we sniff the meter name to pick a sensible unit. Once unit
 * metadata lands this collapses to `formatByUnit(value, def.spec.unit)`.
 */
function formatMeterValue(meterName: string, value: number): string {
  const lower = meterName.toLowerCase();
  if (lower.includes('transfer') || lower.includes('bytes')) {
    return formatBytes(value);
  }
  if (lower.includes('duration') || lower.endsWith('_seconds')) {
    return formatDuration(value);
  }
  return value.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(seconds >= 600 ? 0 : 1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(seconds >= 36000 ? 0 : 1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

/**
 * Tabular summary that mirrors the Figma "Usage summary" card. One row
 * per meter, totals computed client-side from the same series the chart
 * cards below render — so a missing meter (defined but no samples)
 * shows `0` rather than disappearing, and the two surfaces stay
 * consistent without a second round-trip.
 */
function UsageSummaryTable({ meters }: { meters: MeterSeries[] }) {
  if (meters.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No meters defined yet for this organization.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-border border-b text-left">
              <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Service</th>
              <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Usage</th>
            </tr>
          </thead>
          <tbody>
            {meters.map((meter) => (
              <tr key={meter.meterApiName} className="border-border/60 border-b last:border-b-0">
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="bg-muted size-2 rounded-full" aria-hidden="true" />
                    {meter.label}
                  </div>
                </td>
                <td className="text-muted-foreground px-4 py-3 text-sm tabular-nums">
                  {formatMeterValue(meter.meterApiName, sumMeterValues(meter.values))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/**
 * Per-meter chart card. Headline total (formatted via `formatMeterValue`)
 * sits in the card header, sparse-usage series renders as a filled area
 * chart. Empty meters (defined but zero samples in the window) render
 * a quiet placeholder rather than a flat baseline, so the user can tell
 * "no data yet" apart from "rendered but value is 0".
 */
function MeterCard({ meter }: { meter: MeterSeries }) {
  const total = sumMeterValues(meter.values);
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">{meter.label}</CardTitle>
          <p className="text-muted-foreground text-xs">Last 30 days</p>
        </div>
        <div className="text-foreground text-sm font-medium tabular-nums">
          {formatMeterValue(meter.meterApiName, total)}
        </div>
      </CardHeader>
      <CardContent>
        {meter.values.length === 0 ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={meter.values} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${meter.meterApiName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--foreground)', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={55}
                tick={{ fill: 'var(--foreground)', fontSize: 11 }}
              />
              <Tooltip
                labelFormatter={(ts) => format(new Date(ts as number), 'MMM d, yyyy HH:mm')}
                formatter={(value) => [
                  formatMeterValue(meter.meterApiName, typeof value === 'number' ? value : 0),
                  meter.label,
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                fill={`url(#fill-${meter.meterApiName})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Centered placeholder used by every non-OK loader status. */
function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon icon={BarChart3Icon} className="text-muted-foreground size-10" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </div>
  );
}

export default function OrgUsagePage() {
  const result = useLoaderData<typeof loader>();
  const { orgId } = useParams();

  const sortedMeters = useMemo(() => {
    if (result.status !== 'ok') return [];
    // Stable display order: meters with usage first, then alphabetical
    // by label. Keeps the busiest rows above the fold without flapping
    // between renders.
    return [...result.meters].sort((a, b) => {
      const aHas = a.values.length > 0 ? 1 : 0;
      const bHas = b.values.length > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return a.label.localeCompare(b.label);
    });
  }, [result]);

  // Shared page header — present on every status so the breadcrumb /
  // chrome doesn't shift around when the body switches between the
  // dashboard and an empty state.
  const header = (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <PageTitle title="Usage" titleClassName="text-3xl" />
      <a
        href="https://www.datum.net/pricing"
        target="_blank"
        rel="noreferrer noopener"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        View pricing plans
        <Icon icon={ExternalLinkIcon} className="size-3.5" />
      </a>
    </header>
  );

  if (result.status === 'unconfigured') {
    return (
      <div className="flex w-full flex-col gap-6">
        {header}
        <EmptyState
          title="Usage data not available"
          body={
            <>
              Configure{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">AMBERFLO_API_KEY</code> on the
              cloud-portal server to enable this dashboard.
            </>
          }
        />
      </div>
    );
  }

  if (result.status === 'insufficient-permissions') {
    return (
      <div className="flex w-full flex-col gap-6">
        {header}
        <EmptyState
          title="Usage data not available"
          body="Billing permissions are still being provisioned for this organization. Check back soon or contact your admin."
        />
      </div>
    );
  }

  if (result.status === 'no-billing-account') {
    return (
      <div className="flex w-full flex-col gap-6">
        {header}
        <EmptyState
          title="No billing accounts yet"
          body={`Create a billing account for "${orgId ?? 'this organization'}" to start tracking usage. Account-level management lives under your user-level Billing Accounts area.`}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {header}

      <div className="border-border border-t">
        <Section
          title="Usage summary"
          description="A snapshot of every metered service for this organization in the current window. ">
          <UsageSummaryTable meters={sortedMeters} />
        </Section>

        <Section
          title="Service usage"
          description="Per-service consumption over the last 30 days. Each chart sums usage across every project in the organization.">
          {sortedMeters.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-12 text-center text-sm">
                No meters defined yet for this organization.
              </CardContent>
            </Card>
          ) : (
            sortedMeters.map((meter) => <MeterCard key={meter.meterApiName} meter={meter} />)
          )}
        </Section>
      </div>
    </div>
  );
}
