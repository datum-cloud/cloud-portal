import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createEndpointSlicesControl } from '@/resources/control-plane/endpoint-slices.control'
import { getPathWithParams } from '@/utils/path'
import { redirectWithToast } from '@/utils/toast'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const ROUTE_PATH = '/api/connect/endpoint-slices/actions' as const

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const endpointSlicesControl = createEndpointSlicesControl(controlPlaneClient as Client)

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { id, projectId, orgId } = formData

      await endpointSlicesControl.delete(projectId as string, id as string)

      return redirectWithToast(
        getPathWithParams(routes.projects.connect.endpointSlices.root, {
          orgId: orgId as string,
          projectId: projectId as string,
        }),
        {
          title: 'Endpoint slice deleted successfully',
          description: 'The endpoint slice has been deleted successfully',
          type: 'success',
        },
      )
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)
