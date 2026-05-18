import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import {
  createExportPolicyService,
  type ExportPolicy,
  useExportPolicy,
} from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import {
  LoaderFunctionArgs,
  MetaFunction,
  Outlet,
  data,
  useLoaderData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: (exportPolicy: ExportPolicy) => <span>{exportPolicy?.name ?? 'Export Policy'}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const exportPolicy = loaderData as ExportPolicy;
  return metaObject(exportPolicy?.name || 'ExportPolicy');
});

export const loader = withLoaderErrors(async ({ params }: LoaderFunctionArgs) => {
  const { projectId, exportPolicyId } = params;

  if (!projectId || !exportPolicyId) {
    throw new BadRequestError('Project ID and export policy ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const exportPolicyService = createExportPolicyService();

  const exportPolicy = await exportPolicyService.get(projectId, exportPolicyId);

  if (!exportPolicy) {
    throw new NotFoundError('Export Policy', exportPolicyId);
  }

  return data(exportPolicy);
});

export default function ExportPolicyDetailLayout() {
  const { projectId, exportPolicyId } = useParams();
  const exportPolicy = useLoaderData<typeof loader>();

  // Seed cache synchronously with SSR data (eliminates skeleton flash on first render)
  useExportPolicy(projectId ?? '', exportPolicyId ?? '', {
    initialData: exportPolicy,
    initialDataUpdatedAt: Date.now(),
  });

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
}
