import { DateFormat } from '@/components/date-format/date-format'
import { MoreActions } from '@/components/more-actions/more-actions'
import { PageTitle } from '@/components/page-title/page-title'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { routes } from '@/constants/routes'
import { WorkloadFlow } from '@/features/workload/flow/flow'
import { WorkloadHelper } from '@/features/workload/helper'
import { WorkloadOverview } from '@/features/workload/overview'
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import {
  IInstanceControlResponse,
  IWorkloadControlResponse,
  IWorkloadDeploymentControlResponse,
} from '@/resources/interfaces/workload.interface'
import { ROUTE_PATH as WORKLOADS_ACTIONS_ROUTE_PATH } from '@/routes/api+/workloads+/actions'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { motion } from 'framer-motion'
import { ClockIcon, PencilIcon } from 'lucide-react'
import { useMemo } from 'react'
import { MetaFunction, useParams, useRouteLoaderData, useSubmit } from 'react-router'
import { Link } from 'react-router-dom'

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find(
    (match) =>
      match.id ===
      'routes/_private+/$orgId+/projects.$projectId+/_deploy+/workloads+/$workloadId+/_layout',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any

  const { workload } = match.data
  return metaObject(
    `${(workload as IWorkloadControlResponse)?.name || 'Workload'} Overview`,
  )
})

export default function WorkloadOverviewPage() {
  const submit = useSubmit()
  const { confirm } = useConfirmationDialog()
  const { orgId, projectId, workloadId } = useParams()

  // revalidate every 10 seconds to keep deployment list fresh
  useRevalidateOnInterval({ enabled: true, interval: 10000 })

  const { deployments, instances, workload } = useRouteLoaderData(
    'routes/_private+/$orgId+/projects.$projectId+/_deploy+/workloads+/$workloadId+/_layout',
  )

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
      confirmInputLabel: `Type "${data?.name}" to confirm.`,
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

  const workloadMappingData = useMemo(() => {
    if (workload) {
      return WorkloadHelper.mappingSpecToForm(workload)
    }

    return {}
  }, [workload])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex w-full flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mx-auto flex w-full max-w-6xl flex-col gap-6">
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

      <Tabs defaultValue="overview" className="w-full gap-6">
        <div className="mx-auto w-full max-w-6xl border-b pb-6">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="graph">Graph View</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview">
          <WorkloadOverview
            workload={workload as IWorkloadControlResponse}
            deployments={deployments as IWorkloadDeploymentControlResponse[]}
            instances={instances as IInstanceControlResponse[]}
          />
        </TabsContent>
        <TabsContent value="graph" className="max-h-screen min-h-[1024px]">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <WorkloadFlow workloadData={workloadMappingData as any} />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
