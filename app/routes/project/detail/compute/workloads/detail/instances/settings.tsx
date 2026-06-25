import { SectionCard } from '@/features/workload/cli-section';
import { useInstance } from '@/resources/instances';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  BookOpenIcon,
  DownloadIcon,
  LayersIcon,
  LogsIcon,
  RefreshCwIcon,
  SearchIcon,
  SquareTerminalIcon,
} from 'lucide-react';
import { useParams } from 'react-router';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Settings</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Settings'));

export default function InstanceSettingsPage() {
  const { projectId = '', workloadName = '', instanceName = '' } = useParams();

  const { data: instance } = useInstance(projectId, instanceName, {
    staleTime: QUERY_STALE_TIME,
  });

  const city = instance?.city;
  const cityCommands = city
    ? [`datumctl compute instances --workload=${workloadName} --city=${city}`]
    : [];
  const restartCityCommands = city
    ? [`datumctl compute restart ${workloadName} --city=${city}`]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-4 rounded-xl border p-4">
        <SquareTerminalIcon className="text-primary size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-primary font-semibold">Manage this instance with datumctl</p>
          <p className="text-muted-foreground text-sm">
            Use the CLI commands below to inspect and manage this instance.
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
            description="View runtime configuration, network status, and current conditions — including plain-English explanations of any failure states."
            commands={[
              `datumctl compute instances describe ${instanceName}`,
              `datumctl compute instances describe ${instanceName} -o json`,
              `datumctl compute instances describe ${instanceName} -o yaml`,
            ]}
          />
          <SectionCard
            icon={<LayersIcon className="size-4" />}
            title="List Instances"
            description="List all running instances for this workload, or filter to a specific city."
            commands={[`datumctl compute instances --workload=${workloadName}`, ...cityCommands]}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <SectionCard
            icon={<RefreshCwIcon className="size-4" />}
            title="Restart"
            description="Trigger a rolling restart of the parent workload. Use the city flag to restart only instances in the same location as this one."
            commands={[`datumctl compute restart ${workloadName}`, ...restartCityCommands]}
          />
          <SectionCard
            icon={<SquareTerminalIcon className="size-4" />}
            title="Watch Rollout"
            description="Stream live rollout progress across all placements after a deploy or restart."
            commands={[`datumctl compute rollout ${workloadName}`]}
          />
          <SectionCard
            icon={<LogsIcon className="size-4" />}
            title="Stream Logs"
            description="Log streaming is coming in a future release! You'll be able to tail live output from this instance directly from the CLI."
            commands={[]}
          />
        </div>
      </div>
    </div>
  );
}
