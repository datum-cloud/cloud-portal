import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const ROUTE_PATH = '/api/projects/resources' as const

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { projectsControl, cache } = context as AppLoadContext

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { projectName, orgId: orgEntityId } = formData

      // Invalidate the projects cache
      await cache.removeItem(`projects:${orgEntityId}`)

      return await projectsControl.deleteProject(
        orgEntityId as string,
        projectName as string,
      )
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)
