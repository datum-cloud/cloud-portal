import { routes } from '@/constants/routes'
import { redirectWithToast } from '@/modules/cookie/toast.server'
import { authMiddleware } from '@/modules/middleware/auth.middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createHttpRoutesControl } from '@/resources/control-plane/http-routes.control'
import { getPathWithParams } from '@/utils/path'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const ROUTE_PATH = '/api/connect/http-routes/actions' as const

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const httpRoutesControl = createHttpRoutesControl(controlPlaneClient as Client)

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { id, projectId, orgId } = formData

      await httpRoutesControl.delete(projectId as string, id as string)

      return redirectWithToast(
        getPathWithParams(routes.projects.connect.httpRoutes.root, {
          orgId: orgId as string,
          projectId: projectId as string,
        }),
        {
          title: 'HTTP route deleted successfully',
          description: 'HTTP route has been deleted successfully',
          type: 'success',
        },
      )
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)
