import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { Table } from '@/components/table';
import { CliBanner, SectionCard } from '@/features/workload/cli-section';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import {
  type Workload,
  createWorkloadService,
  useWorkloads,
  useWorkloadsWatch,
  workloadHealthToBadgeStatus,
} from '@/resources/workloads';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { ColumnDef } from '@tanstack/react-table';
import { RocketIcon, SearchIcon } from 'lucide-react';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, useNavigate, useParams } from 'react-router';

type LoaderData = {
  workloads: Workload[];
};

const route = defineResourceRoute<LoaderData>({
  type: 'list',
  resource: 'workloads',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view workloads.",
  metaTitle: 'Workloads',
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<LoaderData>(args, {
    resource: 'workloads',
    group: 'compute.datumapis.com',
    scope: 'project',
    fetch: async ({ projectId }) => {
      const workloads = await createWorkloadService().list(projectId!);
      return { workloads };
    },
  });

export const meta = route.meta;

export default route.Page(({ data: loaderData }) => {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { workloads: initialWorkloads } = loaderData;

  useWorkloadsWatch(projectId);

  const { data: workloads = initialWorkloads } = useWorkloads(projectId, {
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
    initialData: initialWorkloads,
  });

  const columns: ColumnDef<Workload>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        meta: { className: 'min-w-32' },
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        header: 'Image',
        accessorKey: 'image',
        cell: ({ row }) =>
          row.original.image ? (
            <span className="text-muted-foreground max-w-xs truncate font-mono text-sm">
              {row.original.image}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        header: 'Health',
        accessorKey: 'health',
        cell: ({ row }) => (
          <BadgeStatus
            status={workloadHealthToBadgeStatus(row.original.health)}
            label={row.original.health}
          />
        ),
      },
      {
        header: 'Ready',
        id: 'ready',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.currentReplicas}/{row.original.desiredReplicas}
          </span>
        ),
      },
      {
        header: 'Placements',
        id: 'placements',
        cell: ({ row }) => {
          const names = row.original.placements;
          if (!names.length) return <span className="text-muted-foreground text-sm">—</span>;
          return <span className="text-sm">{names.join(', ')}</span>;
        },
      },
      {
        header: 'Age',
        accessorKey: 'createdAt',
        cell: ({ row }) => row.original.createdAt && <DateTime date={row.original.createdAt} />,
      },
    ],
    [projectId]
  );

  if (workloads.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageTitle title="Workloads" />

        <CliBanner
          title="Deploy workloads with datumctl"
          description="Workloads are created and managed using the Datum CLI. Install datumctl, write a manifest, and deploy — workloads you create will appear here automatically."
        />

        {/* Getting started cards */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <SectionCard
            icon={<RocketIcon className="size-4" />}
            title="Deploy a workload"
            description="Create a workload manifest and deploy it to your project. The portal will reflect the new workload within seconds."
            commands={[
              `datumctl compute deploy -f workload.yaml`,
              `datumctl compute deploy --project=${projectId} -f workload.yaml`,
            ]}
          />
          <SectionCard
            icon={<SearchIcon className="size-4" />}
            title="List & inspect workloads"
            description="Confirm your workload deployed successfully and inspect its current health and placement status."
            commands={[
              `datumctl compute workloads list`,
              `datumctl compute workloads describe <name>`,
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <Table.Client
      columns={columns}
      data={workloads}
      title="Workloads"
      search="Search"
      empty="No workloads found"
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.project.detail.compute.workloads.detail.root, {
            projectId,
            workloadName: row.name,
          })
        );
      }}
    />
  );
});
