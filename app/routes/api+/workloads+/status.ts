import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { CustomError } from '@/utils/errorHandle'
import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/workloads/status' as const

export const loader = withMiddleware(async ({ request, context }) => {
  try {
    const { workloadsControl } = context as AppLoadContext

    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const workloadId = url.searchParams.get('workloadId')

    if (!projectId || !workloadId) {
      throw new CustomError('Project ID and Workload ID are required', 400)
    }

    const status = await workloadsControl.getStatus(projectId, workloadId)
    return data(status)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return data(null)
    // throw new CustomError('Failed to get workload status', 500)
  }
}, authMiddleware)
