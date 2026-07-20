import { CliBanner, SectionCard } from '@/features/workload/cli-section';
import { useInstance } from '@/resources/instances';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { LayersIcon, LogsIcon, RefreshCwIcon, SearchIcon, SquareTerminalIcon } from 'lucide-react';
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
      <CliBanner
        title="Manage this instance with datumctl"
        description="Use the CLI commands below to inspect and manage this instance."
      />

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
