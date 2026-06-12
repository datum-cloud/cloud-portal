import { SectionCard } from '@/features/workload/cli-section';
import { useGuardedRouteData } from '@/modules/rbac';
import { useWorkloadInstances, useWorkloadInstancesWatch } from '@/resources/instances';
import { type Workload } from '@/resources/workloads';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  BookOpenIcon,
  DownloadIcon,
  LayersIcon,
  LogsIcon,
  RefreshCwIcon,
  RocketIcon,
  SearchIcon,
  SquareTerminalIcon,
  Trash2Icon,
} from 'lucide-react';
import { useParams } from 'react-router';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Settings</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Settings'));

export default function WorkloadSettingsPage() {
  const { projectId = '', workloadName = '' } = useParams();
  const { data: initialData } = useGuardedRouteData<Workload, Record<string, never>>(
    'workload-detail'
  );
  const name = (initialData as Workload | undefined)?.name ?? workloadName;

  useWorkloadInstancesWatch(projectId, workloadName);
  const { data: instances = [] } = useWorkloadInstances(projectId, workloadName, {
    staleTime: QUERY_STALE_TIME,
  });
  const cities = [...new Set(instances.map((i) => i.city).filter(Boolean))];

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-4 rounded-xl border p-4">
        <SquareTerminalIcon className="text-primary size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-primary font-semibold">Manage this workload with datumctl</p>
          <p className="text-muted-foreground text-sm">
            Use the CLI commands below to inspect, update, and manage your workload.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="https://docs.datum.net/cli/install"
            target="_blank"
            rel="noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors">
            <DownloadIcon className="size-4" />
            Install CLI
          </a>
          <a
            href="https://docs.datum.net/cli"
            target="_blank"
            rel="noreferrer"
            className="border-border hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors">
            <BookOpenIcon className="size-4" />
            CLI Docs
          </a>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <SectionCard
            icon={<SearchIcon className="size-4" />}
            title="Inspect"
            description="View workload configuration and current health across all placements."
            commands={[
              `datumctl compute workloads describe ${name}`,
              `datumctl compute workloads describe ${name} -o json`,
              `datumctl compute workloads describe ${name} -o yaml`,
            ]}
          />
          <SectionCard
            icon={<LayersIcon className="size-4" />}
            title="Instances"
            description="List all running instances for this workload, optionally filtered by city."
            commands={[
              `datumctl compute instances --workload=${name}`,
              ...(cities.length > 0
                ? [`datumctl compute instances --workload=${name} --city=${cities[0]}`]
                : []),
            ]}
          />
          <SectionCard
            icon={<RocketIcon className="size-4" />}
            title="Deploy & Scale"
            description="Re-deploy with a new image or adjust the minimum replica count per city."
            commands={[
              `datumctl compute deploy ${name} --image=<image>`,
              `datumctl compute deploy -f workload.yaml`,
              `datumctl compute scale ${name} --min=2`,
            ]}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <SectionCard
            icon={<RefreshCwIcon className="size-4" />}
            title="Restart"
            description="Trigger a rolling restart across all instances. Use the city flag to target a specific placement."
            commands={[
              `datumctl compute restart ${name}`,
              ...(cities.length > 0
                ? [`datumctl compute restart ${name} --city=${cities[0]}`]
                : []),
            ]}
          />
          <SectionCard
            icon={<SquareTerminalIcon className="size-4" />}
            title="Watch Rollout"
            description="Stream live rollout progress across all placements after a deploy or restart. Press Ctrl-C to detach without canceling."
            commands={[`datumctl compute rollout ${name}`]}
          />
          <SectionCard
            icon={<LogsIcon className="size-4" />}
            title="Stream Logs"
            description="Log streaming is coming in a future release, tail live output from any instance directly from the CLI."
            commands={[]}
          />
          <SectionCard
            icon={<Trash2Icon className="size-4" />}
            title="Danger Zone"
            description="Permanently destroys the workload and all its instances. This action cannot be undone."
            commands={[`datumctl compute destroy ${name} --yes`]}
            danger
          />
        </div>
      </div>
    </div>
  );
}
