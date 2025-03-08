import { DateFormat } from '@/components/date-format/date-format'
import { routes } from '@/constants/routes'
import TabsLayout from '@/layouts/tabs/tabs'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { formatDistanceToNow } from 'date-fns'
import { ClockIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  AppLoadContext,
  LoaderFunctionArgs,
  Outlet,
  useLoaderData,
  useParams,
} from 'react-router'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { workloadsControl } = context as AppLoadContext
  const { projectId, workloadId } = params

  if (!projectId || !workloadId) {
    throw new CustomError('Project ID and workload ID are required', 400)
  }

  const workload = await workloadsControl.detail(projectId, workloadId)

  return workload
}, authMiddleware)

export default function WorkloadLayout() {
  const data: IWorkloadControlResponse = useLoaderData<typeof loader>()
  const { orgId, projectId, workloadId } = useParams()

  const navs = useMemo(() => {
    const pathParams = {
      orgId,
      projectId,
      workloadId,
    }

    return [
      {
        value: 'general',
        label: 'General',
        to: getPathWithParams(
          routes.projects.deploy.workloads.detail.general,
          pathParams,
        ),
      },
      {
        value: 'deployments',
        label: 'Deployments',
        to: getPathWithParams(
          routes.projects.deploy.workloads.detail.deployments,
          pathParams,
        ),
      },
      {
        value: 'instances',
        label: 'Instances',
        to: getPathWithParams(
          routes.projects.deploy.workloads.detail.instances,
          pathParams,
        ),
      },
    ]
  }, [orgId, projectId, workloadId])

  return (
    <TabsLayout
      navs={navs}
      widthClassName="w-full max-w-6xl"
      tabsTitle={{
        title: data?.name ?? 'Workload',
        description: (
          <div className="flex items-center gap-1">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <DateFormat
              className="text-sm text-muted-foreground"
              date={data?.createdAt ?? ''}
            />
            <span className="text-sm text-muted-foreground">
              (
              {formatDistanceToNow(new Date(data?.createdAt ?? ''), {
                addSuffix: true,
              })}
              )
            </span>
          </div>
        ),
      }}>
      <Outlet />
    </TabsLayout>
  )
}
