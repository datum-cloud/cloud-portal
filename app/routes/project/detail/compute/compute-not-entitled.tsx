import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import { toast } from '@datum-cloud/datum-ui/toast';
import { GlobeIcon, LayoutDashboardIcon, ServerIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';

const features = [
  {
    icon: ServerIcon,
    title: 'Deploy containerized workloads',
    description:
      "Run and scale containerized applications across Datum's global infrastructure with flexible scheduling and resource controls.",
  },
  {
    icon: LayoutDashboardIcon,
    title: 'Monitor compute instances',
    description:
      'Get real-time visibility into your running instances, resource utilization, and workload health from a single view.',
  },
  {
    icon: GlobeIcon,
    title: 'Global reach, local control',
    description:
      'Place workloads close to your users with location constraints and automatic failover across regions.',
  },
];

export function ComputeNotEntitled({ entitlementRequested = false }: { entitlementRequested?: boolean }) {
  const fetcher = useFetcher();
  const submitting = fetcher.state !== 'idle';
  const requested = entitlementRequested || fetcher.data !== undefined;

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data !== undefined) {
      toast.success('Access requested — an employee will review your request shortly.');
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="flex flex-col gap-6">
      <EmptyContent
        title="Compute is not enabled for this project"
        subtitle="Your project doesn't have an active compute service entitlement. Request access to start deploying workloads."
        actions={[
          {
            as: 'button' as const,
            label: submitting ? 'Requesting…' : requested ? 'Access requested' : 'Request access',
            disabled: submitting || requested,
            onClick: () =>
              fetcher.submit(null, { method: 'POST', action: '?_action=request-compute' }),
          },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="shadow-none">
            <CardContent className="flex flex-col gap-3 p-5">
              <Icon className="text-muted-foreground h-5 w-5" />
              <span className="text-sm font-medium">{title}</span>
              <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
