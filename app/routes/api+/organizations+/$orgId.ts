import { routes } from '@/constants/routes'
import { GraphqlClient } from '@/modules/graphql/graphql'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { createOrganizationGql } from '@/resources/gql/organization.gql'
import {
  NewOrganizationSchema,
  newOrganizationSchema,
} from '@/resources/schemas/organization.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { CustomError } from '@/utils/errorHandle'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { find } from 'es-toolkit/compat'
import { AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/organizations/:orgId' as const

export const loader = withMiddleware(async ({ context, params }) => {
  const { orgId } = params

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400)
  }

  const { gqlClient, cache } = context as AppLoadContext
  const organizationGql = createOrganizationGql(gqlClient as GraphqlClient)
  const key = `organizations:${orgId}`

  const isCached = await cache.hasItem(key)
  if (isCached) {
    const org = await cache.getItem(key)
    return data(org)
  }

  const org = await organizationGql.getOrganizationDetail(orgId)

  await cache.setItem(key, org)

  return data(org)
}, authMiddleware)

export const action = withMiddleware(async ({ request, context, params }) => {
  const { gqlClient, cache } = context as AppLoadContext
  const { orgId } = params

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400)
  }

  const organizationGql = createOrganizationGql(gqlClient as GraphqlClient)

  try {
    switch (request.method) {
      case 'PUT': {
        const clonedRequest = request.clone()
        const formData = await clonedRequest.formData()
        await validateCSRF(formData, clonedRequest.headers)

        // Validate form data with Zod
        const parsed = parseWithZod(formData, { schema: newOrganizationSchema })
        const payload = parsed.payload as NewOrganizationSchema

        await organizationGql.updateOrganization(orgId, payload.name)

        // Change the cache value
        await cache.removeItem(`organizations:${orgId}`)
        const organizations = await cache.getItem('organizations')
        if (organizations) {
          const updatedOrg = find(
            organizations as OrganizationModel[],
            (org: OrganizationModel) => org.id === orgId,
          )
          if (updatedOrg) {
            updatedOrg.name = payload.name
          }
          await cache.setItem('organizations', organizations)
        }

        return dataWithToast(
          { success: true, name: payload.name },
          {
            title: 'Organization updated successfully',
            description: 'You have successfully updated an organization.',
            type: 'success',
          },
        )
      }
      case 'DELETE': {
        await organizationGql.deleteOrganization(orgId)
        await cache.removeItem(`organizations:${orgId}`)

        const organizations = await cache.getItem('organizations')

        if (organizations) {
          const filtered = (organizations as OrganizationModel[]).filter(
            (org: OrganizationModel) => org.id !== orgId,
          )
          await cache.setItem('organizations', filtered)
        }

        return redirectWithToast(routes.account.organizations.root, {
          title: 'Organization deleted successfully',
          description: 'You have successfully deleted an organization.',
          type: 'success',
        })
      }
      default:
        throw new Error('Method not allowed')
    }
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description:
        error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    })
  }
}, authMiddleware)
