import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { iamOrganizationsService } from '@/resources/api/iam/organizations.factory'
import { AxiosInstance } from 'axios'
import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/organizations' as const

export const loader = withMiddleware(async ({ context, request }) => {
  const { cache, apiClient } = context as AppLoadContext

  const url = new URL(request.url)
  const noCache = url.searchParams.get('noCache')

  // Try to get cached networks if caching is enabled
  const [isCached, cachedOrganizations] = await Promise.all([
    !noCache && cache.hasItem('organizations'),
    !noCache && cache.getItem('organizations'),
  ])

  // Return cached networks if available and caching is enabled
  if (isCached && cachedOrganizations) {
    return data(cachedOrganizations)
  }

  // get default organization
  const orgService = iamOrganizationsService(apiClient as AxiosInstance)
  const organizations = await orgService.list()

  await cache.setItem('organizations', organizations)
  return data(organizations)
}, authMiddleware)
