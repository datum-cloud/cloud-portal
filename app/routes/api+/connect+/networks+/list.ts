import { authMiddleware } from '@/modules/middleware/auth.middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createNetworksControl } from '@/resources/control-plane/networks.control'
import { CustomError } from '@/utils/errorHandle'
import { Client } from '@hey-api/client-axios'
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router'

export const ROUTE_PATH = '/api/connect/networks/list' as const

export const loader = withMiddleware(async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext
  const networksControl = createNetworksControl(controlPlaneClient as Client)

  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')
  const noCache = url.searchParams.get('noCache')

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const key = `networks:${projectId}`

  // Try to get cached networks if caching is enabled
  const [isCached, cachedNetworks] = await Promise.all([
    !noCache && cache.hasItem(key),
    !noCache && cache.getItem(key),
  ])

  // Return cached networks if available and caching is enabled
  if (isCached && cachedNetworks) {
    return data(cachedNetworks)
  }

  // Fetch fresh networks from control plane
  const networks = await networksControl.list(projectId)

  // Cache the fresh networks if caching is enabled
  await cache.setItem(key, networks).catch((error) => {
    console.error('Failed to cache networks:', error)
  })
  return data(networks)
}, authMiddleware)
