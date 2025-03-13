import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control'
import { getPathWithParams } from '@/utils/path'
import { redirectWithToast } from '@/utils/toast.server'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const ROUTE_PATH = '/api/workloads/actions' as const

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const workloadsControl = createWorkloadsControl(controlPlaneClient as Client)

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { workloadId, projectId, orgId } = formData
      await workloadsControl.delete(projectId as string, workloadId as string)

      return redirectWithToast(
        getPathWithParams(routes.projects.deploy.workloads.root, {
          orgId: orgId as string,
          projectId: projectId as string,
        }),
        {
          title: 'Workload deleted successfully',
          description: 'The workload has been deleted successfully',
          type: 'success',
        },
      )
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)
