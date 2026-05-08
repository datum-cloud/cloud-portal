import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import {
  createExportPolicyService,
  type ExportPolicy,
  useExportPolicy,
} from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, exportPolicyId } = params;

  if (!projectId || !exportPolicyId) {
    throw new BadRequestError('Project ID and export policy ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const exportPolicyService = createExportPolicyService();

  const exportPolicy = await exportPolicyService.get(projectId, exportPolicyId);

  if (!exportPolicy) {
    throw new NotFoundError('ExportPolicy not found');
  }

  return data(exportPolicy);
};

export default function ExportPolicyDetailLayout() {
  const { projectId, exportPolicyId } = useParams();
  const exportPolicy = useLoaderData<typeof loader>();

  // Seed cache synchronously with SSR data (eliminates skeleton flash on first render)
  useExportPolicy(projectId ?? '', exportPolicyId ?? '', {
    initialData: exportPolicy,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: NavItem[] = useMemo(() => {
    const id = exportPolicyId ?? exportPolicy?.name ?? '';
    return [
      {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.metrics.detail.overview, {
          projectId,
          exportPolicyId: id,
        }),
        type: 'link',
      },
      {
        title: 'Activity',
        href: getPathWithParams(paths.project.detail.metrics.detail.activity, {
          projectId,
          exportPolicyId: id,
        }),
        type: 'link',
      },
      {
        title: 'Settings',
        href: getPathWithParams(paths.project.detail.metrics.detail.settings, {
          projectId,
          exportPolicyId: id,
        }),
        type: 'link',
      },
    ];
  }, [projectId, exportPolicyId, exportPolicy?.name]);

  return (
    <SubLayout
      sidebarHeader={
        <div className="flex flex-col gap-5.5">
          <BackButton
            className="hidden md:flex"
            to={getPathWithParams(paths.project.detail.metrics.root, {
              projectId,
            })}>
            Back to Export Policies
          </BackButton>
          <span className="text-primary text-sm font-semibold">Manage Export Policy</span>
        </div>
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
