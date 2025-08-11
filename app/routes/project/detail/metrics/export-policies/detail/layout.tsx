import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { CustomError } from '@/utils/error';
import { mergeMeta, metaObject } from '@/utils/meta';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, data, MetaFunction, Outlet } from 'react-router';

export const handle = {
  breadcrumb: (data: IExportPolicyControlResponse) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  const { exportPolicy } = data as any;
  return metaObject((exportPolicy as IExportPolicyControlResponse)?.name || 'ExportPolicy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, exportPolicyId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !exportPolicyId) {
    throw new CustomError('Project ID and export policy ID are required', 400);
  }

  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client);

  const exportPolicy = await exportPoliciesControl.detail(projectId, exportPolicyId);

  if (!exportPolicy) {
    throw new CustomError('ExportPolicy not found', 404);
  }

  return data(exportPolicy);
};

export default function ExportPolicyDetailLayout() {
  return <Outlet />;
}
