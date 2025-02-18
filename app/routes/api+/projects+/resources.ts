import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const ROUTE_PATH = '/api/projects/resources' as const

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { projectsControl } = context as AppLoadContext

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { projectName, orgId } = formData

      return await projectsControl.deleteProject(orgId as string, projectName as string)
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)
