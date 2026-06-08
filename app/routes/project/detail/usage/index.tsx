import { fetchProjectUsage, type MeterSeries } from '@/modules/billing';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { createProjectService } from '@/resources/projects';
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const project = await createProjectService().get(projectId);
  const enabled = await isFeatureEnabled(
    FeatureFlag.UsageMeteringDashboard,
    project.organizationId
  );
  if (!enabled) {
    throw data('Usage metering is not enabled for this organization', { status: 404 });
  }

  const result = await fetchProjectUsage(projectId);
  return data(result);
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
