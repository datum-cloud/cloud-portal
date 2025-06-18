import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { CustomError } from '@/utils/errorHandle';
import { mergeMeta, metaObject } from '@/utils/meta';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, data, MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: (data: IExportPolicyControlResponse) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  const { exportPolicy } = data as any;
  return metaObject((exportPolicy as IExportPolicyControlResponse)?.name || 'Export Policy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, exportPolicyId } = params;

  const { controlPlaneClient } = context as AppLoadContext;

  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client);

  if (!projectId || !exportPolicyId) {
    throw new CustomError('Project ID and export policy ID are required', 400);
  }

  const exportPolicy = await exportPoliciesControl.detail(projectId, exportPolicyId);

  if (!exportPolicy) {
    throw new CustomError('Export policy not found', 404);
  }

  return data(exportPolicy);
};
