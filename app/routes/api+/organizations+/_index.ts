import { authMiddleware } from '@/modules/middleware/auth.middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api'
import { CustomError } from '@/utils/errorHandle'
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
    return data({ success: true, data: cachedOrganizations })
  }

  try {
    // get default organization
    const orgAPI = iamOrganizationsAPI(apiClient as AxiosInstance)
    const organizations = await orgAPI.list()

    await cache.setItem('organizations', organizations)
    return data({ success: true, data: organizations })
  } catch (error) {
    return data({ success: false, error: (error as CustomError).statusText })
  }
}, authMiddleware)
