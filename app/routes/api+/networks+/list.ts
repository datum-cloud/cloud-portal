import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createNetworksControl } from '@/resources/control-plane/networks.control'
import { CustomError } from '@/utils/errorHandle'
import { Client } from '@hey-api/client-axios'
import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/networks/list' as const

export const loader = withMiddleware(async ({ request, context }) => {
  const { controlPlaneClient, cache } = context as AppLoadContext
  const networksControl = createNetworksControl(controlPlaneClient as Client)

  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const key = `networks:${projectId}`
  const isCached = await cache.hasItem(key)

  if (isCached) {
    const networks = await cache.getItem(key)
    return data(networks)
  }

  const networks = await networksControl.getNetworks(projectId)

  await cache.setItem(key, networks)

  return data(networks)
}, authMiddleware)
