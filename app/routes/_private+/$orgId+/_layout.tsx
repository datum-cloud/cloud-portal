import { commitSession, getSession } from '@/modules/auth/authSession.server'
import { useApp } from '@/providers/app.provider'
import { ROUTE_PATH as ORG_DETAIL_PATH } from '@/routes/api+/organizations+/$orgId'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { useEffect } from 'react'
import { LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { orgId } = params

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400)
  }

  const res = await fetch(
    `${process.env.APP_URL}${getPathWithParams(ORG_DETAIL_PATH, { orgId })}`,
    {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('Cookie') || '',
      },
    },
  )

  const org = await res.json()

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
