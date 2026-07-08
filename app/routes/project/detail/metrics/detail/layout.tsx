import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import {
  createExportPolicyService,
  exportPolicyKeys,
  type ExportPolicy,
} from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { skipRevalidateWithinSameProjectResource } from '@/utils/helpers/revalidate.helper';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, useParams } from 'react-router';

const route = defineResourceRoute<ExportPolicy>({
  type: 'detail',
  resource: 'exportpolicies',
  paramName: 'exportPolicyId',
  notFoundLabel: 'Export Policy',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this export policy.",
  breadcrumb: ({ data }) => <span>{data?.name ?? 'Export Policy'}</span>,
  metaTitle: ({ data }) => data?.name ?? 'ExportPolicy',
  seedCache: ({ data, projectId, id }) => {
    const d = data as ExportPolicy;
    return [[exportPolicyKeys.detail(projectId, id), d]] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<ExportPolicy, Record<string, never>>(args, {
    resource: 'exportpolicies',
    group: 'telemetry.miloapis.com',
    scope: 'project',
    paramName: 'exportPolicyId',
    notFoundLabel: 'Export Policy',
    fetch: ({ projectId, id }) => createExportPolicyService().get(projectId!, id),
  });

export const handle = route.handle;
export const meta = route.meta;

export const shouldRevalidate = skipRevalidateWithinSameProjectResource('exportPolicyId');

export default route.Page(({ data: exportPolicy }) => {
  const { projectId, exportPolicyId } = useParams();

  const navItems: SubNavigationTab[] = useMemo(() => {
    const id = exportPolicyId ?? exportPolicy?.name ?? '';
    return [
      {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.metrics.detail.overview, {
          projectId,
          exportPolicyId: id,
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.metrics.detail.activity, {
          projectId,
          exportPolicyId: id,
        }),
      },
      {
        label: 'Settings',
        href: getPathWithParams(paths.project.detail.metrics.detail.settings, {
          projectId,
          exportPolicyId: id,
        }),
      },
    ];
  }, [projectId, exportPolicyId, exportPolicy?.name]);

  return (
    <SubLayout title={exportPolicy?.name ?? 'Export Policy'} navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
});
