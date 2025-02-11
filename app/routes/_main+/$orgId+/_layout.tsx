import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { organizationGql } from '@/resources/gql/organization.gql'
import { data, LoaderFunctionArgs, redirect } from 'react-router'
import { getPathWithParams } from '@/utils/path'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { differenceInMinutes } from 'date-fns'
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { orgId } = params

  if (!orgId) {
    throw new Response('No organization ID found', { status: 401 })
  }

  const org: OrganizationModel = await organizationGql.getOrganizationDetail(orgId)

  // Update the current organization in session
  const session = await getSession(request.headers.get('Cookie'))
  session.set('currentOrgId', org.id)
  session.set('currentOrgEntityID', org.userEntityID)

  const controlPlaneToken = session.get('controlPlaneToken')

  try {
    // Check for existing projects
    await projectsControl.setToken(request, controlPlaneToken)
    const projects = await projectsControl.getProjects(org.userEntityID)

    return data(
      { org, projects },
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      },
    )
  } catch (error) {
    // Handle new org setup
    // TODO: this is temporary solution for handle delay when create a account for the first time
    // https://github.com/datum-cloud/cloud-portal/issues/43
    // Check if the organization created at is under 2 minute

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).response?.status === 403) {
      const isNewAccount = differenceInMinutes(new Date(), new Date(org.createdAt)) < 2

      if (isNewAccount) {
        return redirect(getPathWithParams(routes.org.setup, { orgId }), {
          headers: {
            'Set-Cookie': await commitSession(session),
          },
        })
      }
    }

    throw error
  }
}
