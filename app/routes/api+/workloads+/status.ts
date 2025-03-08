import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { CustomError } from '@/utils/errorHandle'
import { dataWithToast } from '@/utils/toast.server'
import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/workloads/status' as const

export const loader = withMiddleware(async ({ request, context }) => {
  try {
    const { workloadsControl, workloadDeploymentsControl, instancesControl } =
      context as AppLoadContext

    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const projectId = url.searchParams.get('projectId')
    const id = url.searchParams.get('id')

    if (!projectId || !id) {
      throw new CustomError('Project ID and ID are required', 400)
    }

    if (type === 'deployment') {
      const status = await workloadDeploymentsControl.getStatus(projectId, id)
      return data(status)
    } else if (type === 'workload') {
      const status = await workloadsControl.getStatus(projectId, id)
      return data(status)
    } else if (type === 'instance') {
      const status = await instancesControl.getStatus(projectId, id)
      return data(status)
    }

    return dataWithToast(null, {
      title: 'Invalid workload type',
      description: 'Please try again later',
      type: 'error',
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return data(null)
  }
}, authMiddleware)
