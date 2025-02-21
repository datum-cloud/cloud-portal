import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const ROUTE_PATH = '/api/projects/locations' as const

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { locationsControl } = context as AppLoadContext

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { locationName, projectId } = formData

      return await locationsControl.deleteLocation(
        projectId as string,
        locationName as string,
      )
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)
