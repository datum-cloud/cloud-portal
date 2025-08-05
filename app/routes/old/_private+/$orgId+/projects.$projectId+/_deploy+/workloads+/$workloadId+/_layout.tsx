import { createWorkloadsControl } from '@/resources/control-plane/workloads.control';
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface';
import { CustomError } from '@/utils/error';
import { metaObject, mergeMeta } from '@/utils/meta';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, data, LoaderFunctionArgs, MetaFunction, Outlet } from 'react-router';

export const handle = {
  breadcrumb: (data: IWorkloadControlResponse) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  const { workload } = data as any;
  return metaObject((workload as IWorkloadControlResponse)?.name || 'Workload');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, workloadId } = params;

  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !workloadId) {
    throw new CustomError('Project ID and workload ID are required', 400);
  }

  const workloadsControl = createWorkloadsControl(controlPlaneClient as Client);
  const workload = await workloadsControl.detail(projectId, workloadId);

  return data(workload);
};

export default function WorkloadLayoutPage() {
  return <Outlet />;
}
