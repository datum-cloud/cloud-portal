import { BadgeStatus } from '@/components/badge/badge-status';
import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import {
  createInstanceService,
  instanceKeys,
  instanceStatusToBadgeStatus,
  useInstance,
  type Instance,
} from '@/resources/instances';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, useParams } from 'react-router';

const route = defineResourceRoute<Instance>({
  type: 'detail',
  resource: 'instances',
  paramName: 'instanceName',
  notFoundLabel: 'Instance',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this instance.",
  breadcrumb: ({ data }) => <span>{data?.name ?? 'Instance'}</span>,
  metaTitle: ({ data }) => data?.name ?? 'Instance',
  seedCache: ({ data, projectId, id }) => {
    const d = data as Instance;
    return [[instanceKeys.detail(projectId, id), d]] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<Instance, Record<string, never>>(args, {
    resource: 'instances',
    group: 'compute.datumapis.com',
    scope: 'project',
    paramName: 'instanceName',
    notFoundLabel: 'Instance',
    fetch: ({ projectId, id }) => createInstanceService().get(projectId!, id),
  });

// instanceLayout flag lets the parent workload layout detect it's nested inside an
// instance route via useMatches() — avoids coupling to URL shape.
export const handle = { ...route.handle, instanceLayout: true };
export const meta = route.meta;

export default route.Page(({ data: initialInstance }) => {
  const { projectId = '', workloadName = '', instanceName = '' } = useParams();

  const { data: instance } = useInstance(projectId, instanceName, {
    initialData: initialInstance,
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const navItems: SubNavigationTab[] = useMemo(() => {
    const params = { projectId, workloadName, instanceName };
    const { instances } = paths.project.detail.compute.workloads.detail;
    return [
      { label: 'Overview', href: getPathWithParams(instances.detail, params) },
      { label: 'Settings', href: getPathWithParams(instances.settings, params) },
    ];
  }, [projectId, workloadName, instanceName]);

  return (
    <SubLayout
      title={instance?.name ?? instanceName}
      actions={
        instance && (
          <BadgeStatus
            status={instanceStatusToBadgeStatus(instance.status)}
            label={instance.status}
          />
        )
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
});
