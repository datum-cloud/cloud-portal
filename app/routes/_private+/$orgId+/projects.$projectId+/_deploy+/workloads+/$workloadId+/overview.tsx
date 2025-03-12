import { DateFormat } from '@/components/date-format/date-format'
import { MoreActions } from '@/components/more-actions/more-actions'
import { PageTitle } from '@/components/page-title/page-title'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { DeploymentsTable } from '@/features/workload/deployments-table'
import { WorkloadGeneralCard } from '@/features/workload/general-card'
import { InstancesTable } from '@/features/workload/instances-table'
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { createInstancesControl } from '@/resources/control-plane/instances.control'
import { createWorkloadDeploymentsControl } from '@/resources/control-plane/workload-deployments.control'
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { ROUTE_PATH as WORKLOADS_ACTIONS_ROUTE_PATH } from '@/routes/api+/workloads+/actions'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { Client } from '@hey-api/client-axios'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { ClockIcon, PencilIcon } from 'lucide-react'
import {
  LoaderFunctionArgs,
  AppLoadContext,
  data,
  useLoaderData,
  Link,
  useParams,
  useSubmit,
} from 'react-router'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
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
}, authMiddleware)

export default function OverviewWorkload() {
  const submit = useSubmit()
  const { confirm } = useConfirmationDialog()
  const { orgId, projectId, workloadId } = useParams()

  // revalidate every 10 seconds to keep deployment list fresh
  useRevalidateOnInterval({ enabled: true, interval: 10000 })

  const { deployments, instances, workload } = useLoaderData<typeof loader>()

  const deleteWorkload = async () => {
    const data = workload as IWorkloadControlResponse
    await confirm({
      title: 'Delete Workload',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{data?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${data?.name} to confirm.`,
      confirmInputPlaceholder: 'Type the workload name to confirm deletion',
      confirmValue: data?.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            workloadId: data?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: WORKLOADS_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'workload-resources',
            navigate: false,
          },
        )
      },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}>
        <PageTitle
          title={(workload as IWorkloadControlResponse)?.name ?? 'Workload'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateFormat
                className="text-muted-foreground text-sm"
                date={(workload as IWorkloadControlResponse)?.createdAt ?? ''}
              />
              <span className="text-muted-foreground text-sm">
                (
                {formatDistanceToNow(
                  new Date((workload as IWorkloadControlResponse)?.createdAt ?? ''),
                  {
                    addSuffix: true,
                  },
                )}
                )
              </span>
            </div>
          }
          actions={
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Link
                  className="flex items-center gap-2"
                  to={getPathWithParams(routes.projects.deploy.workloads.detail.manage, {
                    orgId,
                    projectId,
                    workloadId,
                  })}>
                  <PencilIcon className="size-4" />
                  Edit
                </Link>
              </Button>
              <MoreActions
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-9 rounded-md border px-3"
                actions={[
                  {
                    key: 'delete',
                    label: 'Delete',
                    variant: 'destructive',
                    action: deleteWorkload,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-1/2">
        <WorkloadGeneralCard workload={workload} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}>
        <DeploymentsTable data={deployments} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.4 }}>
        <InstancesTable data={instances} />
      </motion.div>
    </motion.div>
  )
}
