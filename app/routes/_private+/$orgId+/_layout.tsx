import { commitSession, getSession } from '@/modules/auth/authSession.server'
import { GraphqlClient } from '@/modules/graphql/graphql'
import { useApp } from '@/providers/app.provider'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { createOrganizationGql } from '@/resources/gql/organization.gql'
import { CustomError } from '@/utils/errorHandle'
import { useEffect } from 'react'
import {
  AppLoadContext,
  LoaderFunctionArgs,
  Outlet,
  data,
  useLoaderData,
} from 'react-router'

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { orgId } = params
  const { gqlClient } = context as AppLoadContext
  const organizationGql = createOrganizationGql(gqlClient as GraphqlClient)

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400)
  }

  const org: OrganizationModel = await organizationGql.getOrganizationDetail(orgId)

  // Update the current organization in session
  const session = await getSession(request.headers.get('Cookie'))
  session.set('currentOrgId', org.id)
  session.set('currentOrgEntityID', org.userEntityID)

  return data(org, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  })
}

export default function OrgLayout() {
  const org = useLoaderData<typeof loader>()

  const { setOrganization } = useApp()

  useEffect(() => {
    setOrganization(org)
  }, [org])

  return <Outlet />
}
