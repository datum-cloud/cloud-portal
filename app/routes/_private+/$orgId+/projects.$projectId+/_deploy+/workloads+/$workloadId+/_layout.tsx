import { createInstancesControl } from '@/resources/control-plane/instances.control'
import { createWorkloadDeploymentsControl } from '@/resources/control-plane/workload-deployments.control'
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { CustomError } from '@/utils/errorHandle'
import { metaObject, mergeMeta } from '@/utils/meta'
import { Client } from '@hey-api/client-axios'
import {
  AppLoadContext,
  data,
  LoaderFunctionArgs,
  MetaFunction,
  Outlet,
} from 'react-router'

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { workload } = data as any
  return metaObject(
    `${(workload as IWorkloadControlResponse)?.name || 'Workload'} Overview`,
  )
})

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, workloadId } = params

  const { controlPlaneClient } = context as AppLoadContext

  const workloadsControl = createWorkloadsControl(controlPlaneClient as Client)
  const workloadDeploymentsControl = createWorkloadDeploymentsControl(
    controlPlaneClient as Client,
  )
  const instancesControl = createInstancesControl(controlPlaneClient as Client)

  if (!projectId || !workloadId) {
    throw new CustomError('Project ID and workload ID are required', 400)
  }

  // TODO: Need Best Way to retrieve workload data from parent layout route
  // Current implementation requires duplicate workload fetch since routes use workloadId parameter instead of uid
  const workload = await workloadsControl.detail(projectId, workloadId)

  if (!workload) {
    throw new CustomError('Workload not found', 404)
  }

  const deployments = await workloadDeploymentsControl.list(projectId, workload.uid)
  const instances = await instancesControl.list(projectId, workload.uid)

  return data({ deployments, instances, workload })
}

export default function WorkloadLayoutPage() {
  return <Outlet />
}
