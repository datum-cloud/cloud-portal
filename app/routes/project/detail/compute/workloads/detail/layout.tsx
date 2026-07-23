import { BadgeStatus } from '@/components/badge/badge-status';
import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import {
  createWorkloadService,
  useWorkload,
  workloadHealthToBadgeStatus,
  workloadKeys,
  type Workload,
} from '@/resources/workloads';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { RefreshCwIcon } from 'lucide-react';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, useMatches, useParams } from 'react-router';

const route = defineResourceRoute<Workload>({
  type: 'detail',
  resource: 'workloads',
  paramName: 'workloadName',
  notFoundLabel: 'Workload',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this workload.",
  breadcrumb: ({ data }) => <span>{data?.name ?? 'Workload'}</span>,
  metaTitle: ({ data }) => data?.name ?? 'Workload',
  seedCache: ({ data, projectId, id }) => {
    const d = data as Workload;
    return [[workloadKeys.detail(projectId, id), d]] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<Workload, Record<string, never>>(args, {
    resource: 'workloads',
    group: 'compute.datumapis.com',
    scope: 'project',
    paramName: 'workloadName',
    notFoundLabel: 'Workload',
    fetch: ({ projectId, id }) => createWorkloadService().get(projectId!, id),
  });

export const handle = route.handle;
export const meta = route.meta;

export default route.Page(({ data: initialWorkload }) => {
  const { projectId = '', workloadName = '' } = useParams();
  const matches = useMatches();
  const isInsideInstanceLayout = matches.some(
    (m) => (m.handle as { instanceLayout?: boolean } | null)?.instanceLayout === true
  );

  const {
    data: queryData,
    refetch,
    isFetching,
  } = useWorkload(projectId, workloadName, {
    initialData: initialWorkload,
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const workload = queryData ?? initialWorkload;

  const navItems: SubNavigationTab[] = useMemo(() => {
    const params = { projectId, workloadName: workload?.name ?? workloadName };
    const { detail } = paths.project.detail.compute.workloads;
    return [
      { label: 'Overview', href: getPathWithParams(detail.root, params) },
      { label: 'Activity', href: getPathWithParams(detail.activity, params) },
      { label: 'Metrics', href: getPathWithParams(detail.metrics, params) },
      { label: 'Settings', href: getPathWithParams(detail.settings, params) },
    ];
  }, [projectId, workloadName, workload?.name]);

  // When viewing an instance, let the instance layout own the full SubLayout.
  if (isInsideInstanceLayout) {
    return <Outlet />;
  }

  return (
    <SubLayout
      title={workload?.name}
      actions={
        <div className="flex items-center gap-3">
          {workload && (
            <BadgeStatus
              status={workloadHealthToBadgeStatus(workload.health)}
              label={workload.health}
            />
          )}
          <Button
            type="secondary"
            theme="outline"
            size="small"
            loading={isFetching}
            icon={<RefreshCwIcon className="size-4" />}
            onClick={() => {
              void refetch();
            }}>
            Refresh
          </Button>
        </div>
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
});
