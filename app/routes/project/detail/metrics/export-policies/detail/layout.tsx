import { createExportPolicyService, type ExportPolicy } from '@/resources/export-policies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { LoaderFunctionArgs, data, MetaFunction, Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Your Export Policies</span>,
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
  return <Outlet />;
}
