import { routes } from '@/constants/routes'
import { setOrgSession } from '@/modules/cookie/org.server'
import { redirectWithToast } from '@/modules/cookie/toast.server'
import { useApp } from '@/providers/app.provider'
import { ROUTE_PATH as ORG_DETAIL_PATH } from '@/routes/api+/organizations+/$orgId'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { useEffect } from 'react'
import { LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router'

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
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

    const { headers } = await setOrgSession(request, org)

    return data(org, { headers })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return redirectWithToast(routes.account.organizations.root, {
      title: 'Error',
      description: 'Organization not found',
      type: 'error',
    })
  }
}

export default function OrgLayout() {
  const org = useLoaderData<typeof loader>()

  const { setOrganization } = useApp()

  useEffect(() => {
    if (org) {
      setOrganization(org)
    }
  }, [org])

  return <Outlet />
}
