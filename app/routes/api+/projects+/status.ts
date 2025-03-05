import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { CustomError } from '@/utils/errorHandle'
import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/projects/status' as const

export const loader = withMiddleware(async ({ request, context }) => {
  try {
    const { projectsControl } = context as AppLoadContext

    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const orgId = url.searchParams.get('orgId')

    if (!projectId || !orgId) {
      throw new CustomError('Project ID and Organization ID are required', 400)
    }

    const status = await projectsControl.getStatus(orgId, projectId)
    return data(status)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return data(null)
  }
}, authMiddleware)
