import { commitSession, getSession } from '@/modules/auth/authSession.server'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import {
  data,
  LoaderFunctionArgs,
  Outlet,
  useLoaderData,
  useRevalidator,
  AppLoadContext,
} from 'react-router'
import { differenceInMinutes } from 'date-fns'
import { useApp } from '@/providers/app.provider'
import { useEffect } from 'react'
import PublicLayout from '@/layouts/public/public'
import WaitingPage from '@/components/waiting-page/waiting-page'
import { CustomError } from '@/utils/errorHandle'

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { orgId } = params
  const { projectsControl, organizationGql } = context as AppLoadContext

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400)
  }

  // TODO: when i remove the request, the token is not set and make the request to the api use token from other user
  const org: OrganizationModel = await organizationGql.getOrganizationDetail(orgId)

  // Update the current organization in session
  const session = await getSession(request.headers.get('Cookie'))
  session.set('currentOrgId', org.id)
  session.set('currentOrgEntityID', org.userEntityID)

  try {
    // Check for existing projects
    // TODO: remove this line when the organization process doesn't need to check the resource manager API
    // https://github.com/datum-cloud/cloud-portal/issues/43
    const projects = await projectsControl.getProjects(org.userEntityID)

    return data(
      { org, projects, isReady: true },
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      },
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Handle new org setup
    // TODO: this is temporary solution for handle delay on new organization
    // https://github.com/datum-cloud/cloud-portal/issues/43
    // Check if the organization created at is under 2 minute
    const isNewAccount = differenceInMinutes(new Date(), new Date(org.createdAt)) < 2
    if (error.status === 403 && isNewAccount) {
      return data(
        { org, projects: [], isReady: false },
        {
          headers: {
            'Set-Cookie': await commitSession(session),
          },
        },
      )
    }

    throw error
  }
}

export default function OrgLayout() {
  let interval: NodeJS.Timeout | undefined = undefined
  const { org, isReady } = useLoaderData<typeof loader>()
  const { revalidate } = useRevalidator()

  const { setOrganization } = useApp()

  useEffect(() => {
    setOrganization(org)
  }, [org])

  useEffect(() => {
    if (!isReady && !interval) {
      interval = setInterval(revalidate, 5000)
    } else if (isReady && interval) {
      clearInterval(interval)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isReady]) // Run only on mount

  return isReady ? (
    <Outlet />
  ) : (
    <PublicLayout>
      <WaitingPage title="Setting up organization" />
    </PublicLayout>
  )
}
