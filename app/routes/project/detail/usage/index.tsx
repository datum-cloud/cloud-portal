import {
  listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding,
  readBillingMiloapisComV1Alpha1NamespacedBillingAccount,
} from '@/modules/control-plane/billing';
import { createProjectService } from '@/resources/projects';
import { env } from '@/utils/env/env.server';
import { BadRequestError } from '@/utils/errors';
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
  values: { timestamp: number; value: number }[];
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

  const meterNames = (env.server.amberfloMeterNames ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  if (meterNames.length === 0) {
    return data({ status: 'no-meters' as const, meters: [] });
  }

  // Resolve BillingAccount uid (= Amberflo customerId) for this project.
  const projectService = createProjectService();
  const project = await projectService.get(projectId);
  const orgNamespace = `organization-${project.organizationId}`;

  let bindingsResp;
  try {
    bindingsResp = await listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding({
      path: { namespace: orgNamespace },
    });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 403 || status === 401) {
      return data({ status: 'insufficient-permissions' as const, meters: [] });
    }
    throw err;
  }

  const binding = bindingsResp.data?.items?.find((b) => b.spec?.projectRef?.name === projectId);

  if (!binding) {
    return data({ status: 'no-billing-account' as const, meters: [] });
  }

  const billingAccountName = binding.spec?.billingAccountRef?.name;
  if (!billingAccountName) {
    return data({ status: 'no-billing-account' as const, meters: [] });
  }

  let accountResp;
  try {
    accountResp = await readBillingMiloapisComV1Alpha1NamespacedBillingAccount({
      path: { namespace: orgNamespace, name: billingAccountName },
    });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 403 || status === 401) {
      return data({ status: 'insufficient-permissions' as const, meters: [] });
    }
    throw err;
  }

  const customerId = accountResp.data?.metadata?.uid;
  if (!customerId) {
    return data({ status: 'no-billing-account' as const, meters: [] });
  }

  const baseUrl = env.server.amberfloBaseUrl ?? 'https://app.amberflo.io';
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - 30 * 24 * 3600;

  const meters = await Promise.all(
    meterNames.map(async (meterApiName: string): Promise<MeterSeries> => {
      try {
        const resp = await fetch(`${baseUrl}/usage/sparse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            meterApiName,
            timeRange: { startTimeInSeconds: startSec, endTimeInSeconds: nowSec },
            filter: { customerId: [customerId] },
            groupBy: ['customerId'],
          }),
        });

        if (!resp.ok) {
          return { meterApiName, values: [] };
        }

        const json = (await resp.json()) as {
          clientMeters?: { values?: { secondsSinceEpochUtc: number; value: number }[] }[];
        };
        const raw = json.clientMeters?.[0]?.values ?? [];
        return {
          meterApiName,
          values: raw.map((v) => ({ timestamp: v.secondsSinceEpochUtc * 1000, value: v.value })),
        };
      } catch {
        return { meterApiName, values: [] };
      }
    })
  );

  return data({ status: 'ok' as const, meters });
};

function MeterChart({ meter }: { meter: MeterSeries }) {
  const label = meter.meterApiName.split('/').pop() ?? meter.meterApiName;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base capitalize">{label.replace(/-/g, ' ')}</CardTitle>
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
          Configure <code>AMBERFLO_API_KEY</code> and <code>AMBERFLO_METER_NAMES</code> to enable
          this view.
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

  if (result.status === 'no-meters') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <BarChart3Icon className="text-muted-foreground h-10 w-10" />
        <p className="text-lg font-medium">No meters configured</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Set <code>AMBERFLO_METER_NAMES</code> to a comma-separated list of Amberflo meter API
          names.
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
      <div className="grid gap-6 md:grid-cols-2">
        {result.meters.map((meter: MeterSeries) => (
          <MeterChart key={meter.meterApiName} meter={meter} />
        ))}
      </div>
    </div>
  );
}
