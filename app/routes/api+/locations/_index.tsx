import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createLocationsControl } from '@/resources/control-plane/locations.control'
import { CustomError } from '@/utils/errorHandle'
import { Client } from '@hey-api/client-axios'
import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/locations' as const

export const loader = withMiddleware(async ({ request, context }) => {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const { controlPlaneClient } = context as AppLoadContext
  const locationsControl = createLocationsControl(controlPlaneClient as Client)

  const locations = await locationsControl.list(projectId)
  return data(locations)
}, authMiddleware)
