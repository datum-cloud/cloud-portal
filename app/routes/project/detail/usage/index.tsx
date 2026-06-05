import { client } from '@/modules/control-plane/shared/client.gen';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createProjectService } from '@/resources/projects';
import { env } from '@/utils/env/env.server';
import { AuthenticationError, AuthorizationError, BadRequestError } from '@/utils/errors';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { format } from 'date-fns';
import { BarChart3Icon } from 'lucide-react';
import { LoaderFunctionArgs, data, useLoaderData } from 'react-router';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MeterSeries {
  meterApiName: string;
  label: string;
  values: { timestamp: number; value: number }[];
}

interface MeterDefinition {
  meterName: string;
  displayName: string;
}

async function listMeterDefinitions(): Promise<MeterDefinition[]> {
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const apiKey = env.server.amberfloApiKey;
  if (!apiKey) {
    return data({ status: 'unconfigured' as const, meters: [] });
  }

  // Resolve BillingAccount uid (= Amberflo customerId) for this project.
  const project = await createProjectService().get(projectId);

  // Gate the page on the org-level feature flag — deep-link should 404 when off.
  const enabled = await isFeatureEnabled(
    FeatureFlag.UsageMeteringDashboard,
    project.organizationId
  );
  if (!enabled) {
    throw data('Usage metering is not enabled for this organization', { status: 404 });
  }

  // Bindings + account lookup go through the resource layer so the
  // service-level error mapping (`mapApiError` → AuthorizationError /
  // AuthenticationError) drives the graceful "insufficient-permissions"
  // state instead of re-implementing the status-code check inline.
  let bindings;
  try {
    bindings = await createBillingAccountBindingService().list(project.organizationId);
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof AuthenticationError) {
      return data({ status: 'insufficient-permissions' as const, meters: [] });
    }
    throw err;
  }

  const binding = bindings.find((b) => b.spec?.projectRef?.name === projectId);
  if (!binding) {
    return data({ status: 'no-billing-account' as const, meters: [] });
  }

  const billingAccountName = binding.spec?.billingAccountRef?.name;
  if (!billingAccountName) {
    return data({ status: 'no-billing-account' as const, meters: [] });
  }

  let account;
  try {
    account = await createBillingAccountService().get(project.organizationId, billingAccountName);
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof AuthenticationError) {
      return data({ status: 'insufficient-permissions' as const, meters: [] });
    }
    throw err;
  }

  const customerId = account.metadata?.uid;
  if (!customerId) {
    return data({ status: 'no-billing-account' as const, meters: [] });
  }

  const baseUrl = env.server.amberfloBaseUrl;
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - 30 * 24 * 3600;

  const meterDefs = await listMeterDefinitions();

  const meters = await Promise.all(
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
            filter: { customerId: [customerId] },
            groupBy: ['customerId'],
          }),
        });

        if (!resp.ok) {
          return { meterApiName: meterName, label: displayName, values: [] };
        }

        const json = (await resp.json()) as {
          clientMeters?: { values?: { secondsSinceEpochUtc: number; value: number }[] }[];
        };
        const raw = json.clientMeters?.[0]?.values ?? [];
        return {
          meterApiName: meterName,
          label: displayName,
          values: raw.map((v) => ({ timestamp: v.secondsSinceEpochUtc * 1000, value: v.value })),
        };
      } catch {
        return { meterApiName: meterName, label: displayName, values: [] };
      }
    })
  );

  return data({ status: 'ok' as const, meters });
};

function MeterChart({ meter }: { meter: MeterSeries }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{meter.label}</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {meter.values.length === 0 ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={meter.values} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
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
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function UsagePage() {
  const result = useLoaderData<typeof loader>();

  if (result.status === 'unconfigured') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <BarChart3Icon className="text-muted-foreground h-10 w-10" />
        <p className="text-lg font-medium">Usage data not available</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Configure <code>AMBERFLO_API_KEY</code> to enable this view.
        </p>
      </div>
    );
  }

  if (result.status === 'insufficient-permissions') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <BarChart3Icon className="text-muted-foreground h-10 w-10" />
        <p className="text-lg font-medium">Usage data not available</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Billing permissions are still being provisioned for this organization. Check back soon or
          contact your admin.
        </p>
      </div>
    );
  }

  if (result.status === 'no-billing-account') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <BarChart3Icon className="text-muted-foreground h-10 w-10" />
        <p className="text-lg font-medium">No billing account linked</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          This project does not have a billing account binding. Contact your organization admin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Usage</h1>
        <p className="text-muted-foreground text-sm">Resource consumption for this project.</p>
      </div>
      {result.meters.length === 0 || result.meters.every((m) => m.values.length === 0) ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <BarChart3Icon className="text-muted-foreground h-10 w-10" />
          <p className="text-lg font-medium">No usage to display</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Usage data will appear here once this project starts consuming resources.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {result.meters.map((meter) => (
            <MeterChart key={meter.meterApiName} meter={meter} />
          ))}
        </div>
      )}
    </div>
  );
}
