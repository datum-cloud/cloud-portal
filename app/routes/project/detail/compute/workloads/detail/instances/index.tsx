import { TextCopy } from '@/components/text-copy/text-copy';
import { useInstance, type InstanceCondition } from '@/resources/instances';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { formatUptime, splitSlashValue } from '@/utils/helpers/compute.helper';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import {
  BoxIcon,
  CheckCircle2Icon,
  CircleIcon,
  CpuIcon,
  GlobeIcon,
  LinkIcon,
  TimerIcon,
  WifiIcon,
  XCircleIcon,
} from 'lucide-react';
import { useParams } from 'react-router';

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="rounded-xl py-0 shadow-none">
      <div className="flex items-start gap-3 p-4">
        <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </span>
          <span className="text-foreground truncate font-semibold">{value}</span>
          {sub && <span className="text-muted-foreground truncate text-xs">{sub}</span>}
        </div>
      </div>
    </Card>
  );
}

function ConditionIcon({ status }: { status: InstanceCondition['status'] }) {
  if (status === 'True')
    return <CheckCircle2Icon className="text-success mt-0.5 size-4 shrink-0" />;
  if (status === 'False')
    return <XCircleIcon className="text-destructive mt-0.5 size-4 shrink-0" />;
  return <CircleIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />;
}

export default function InstanceOverviewPage() {
  const { projectId = '', instanceName = '' } = useParams();

  const { data: instance } = useInstance(projectId, instanceName, {
    staleTime: QUERY_STALE_TIME,
  });

  if (!instance) return null;

  const { main: imageShort, sub: imageRegistry } = splitSlashValue(instance.image ?? '');
  const { main: instanceTypeShort, sub: instanceTypeProvider } = splitSlashValue(
    instance.instanceType ?? ''
  );

  const firstPort = instance.ports[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<TimerIcon className="size-4" />}
          label="Uptime"
          value={formatUptime(instance.createdAt)}
          sub={`Since ${instance.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
        />
        <StatCard
          icon={<GlobeIcon className="size-4" />}
          label="Region"
          value={instance.city ?? '—'}
        />
        {instance.instanceType && (
          <StatCard
            icon={<CpuIcon className="size-4" />}
            label="Instance Type"
            value={instanceTypeShort}
            sub={instanceTypeProvider}
          />
        )}
        {instance.image && (
          <StatCard
            icon={<BoxIcon className="size-4" />}
            label="Image"
            value={imageShort}
            sub={imageRegistry}
          />
        )}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Network */}
        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Network</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pt-0 pb-5">
            {instance.externalIP && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  External Endpoint
                </span>
                <div className="bg-muted/50 flex items-start gap-2 rounded-lg px-3 py-2.5">
                  <LinkIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                  <TextCopy
                    value={instance.externalIP}
                    className="text-primary min-w-0 text-sm break-all"
                  />
                </div>
              </div>
            )}
            {instance.internalIP && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Internal IP
                </span>
                <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2.5">
                  <WifiIcon className="text-muted-foreground size-3.5 shrink-0" />
                  <TextCopy
                    value={instance.internalIP}
                    text={firstPort ? `${instance.internalIP} :${firstPort}` : instance.internalIP}
                    className="min-w-0 truncate font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Health Conditions */}
          {instance.conditions.length > 0 && (
            <Card className="rounded-xl shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Health Conditions</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pt-0 pb-5">
                <dl className="divide-border divide-y text-sm">
                  {instance.conditions.map((c) => (
                    <div key={c.type} className="flex items-start gap-2.5 py-2.5">
                      <ConditionIcon status={c.status} />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium">{c.type}</span>
                        {(c.message || c.reason) && (
                          <span className="text-muted-foreground text-xs">
                            {c.message || c.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Runtime */}
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Runtime</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <dl className="divide-border divide-y text-sm">
                {instance.image && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground shrink-0">Image</dt>
                    <dd className="min-w-0 truncate text-right font-mono text-xs">
                      {instance.image}
                    </dd>
                  </div>
                )}
                {instance.ports.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground shrink-0">Ports</dt>
                    <dd className="font-mono text-xs">{instance.ports.join(', ')}</dd>
                  </div>
                )}
                {instance.placement && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground shrink-0">Placement</dt>
                    <dd>{instance.placement}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground shrink-0">Created</dt>
                  <dd>
                    {instance.createdAt.toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZoneName: 'short',
                    })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
