import { createExportPolicyService, type ExportPolicy } from '@/resources/export-policies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { LoaderFunctionArgs, AppLoadContext, data, MetaFunction, Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Your Export Policies</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const exportPolicy = loaderData as ExportPolicy;
  return metaObject(exportPolicy?.name || 'ExportPolicy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, exportPolicyId } = params;
  const { controlPlaneClient, requestId } = context as AppLoadContext;

  if (!projectId || !exportPolicyId) {
    throw new BadRequestError('Project ID and export policy ID are required');
  }

  const exportPolicyService = createExportPolicyService({ controlPlaneClient, requestId });

  const exportPolicy = await exportPolicyService.get(projectId, exportPolicyId);

  if (!exportPolicy) {
    throw new NotFoundError('ExportPolicy not found');
  }

  return data(exportPolicy);
};

export default function ExportPolicyDetailLayout() {
  return <Outlet />;
}
