import { createExportPoliciesControl } from '@/resources/control-plane';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, data, MetaFunction, Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Your Export Policies</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const exportPolicy = loaderData as IExportPolicyControlResponse;
  return metaObject(exportPolicy?.name || 'ExportPolicy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, exportPolicyId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !exportPolicyId) {
    throw new BadRequestError('Project ID and export policy ID are required');
  }

  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client);

  const exportPolicy = await exportPoliciesControl.detail(projectId, exportPolicyId);

  if (!exportPolicy) {
    throw new NotFoundError('ExportPolicy not found');
  }

  return data(exportPolicy);
};

export default function ExportPolicyDetailLayout() {
  return <Outlet />;
}
