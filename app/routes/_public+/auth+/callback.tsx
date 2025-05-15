import { routes } from '@/constants/routes'
import { authenticator } from '@/modules/auth/auth.server'
import { getAuthSession, setAuthSession } from '@/modules/cookie/auth.server'
import { setOrgSession } from '@/modules/cookie/org.server'
import { redirectWithToast } from '@/modules/cookie/toast.server'
import { setUserSession } from '@/modules/cookie/user.server'
import { IOrganization } from '@/resources/interfaces/organization.inteface'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/_index'
import { CustomError } from '@/utils/errorHandle'
import { combineHeaders } from '@/utils/misc'
import { LoaderFunctionArgs, redirect } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const authSession = await getAuthSession(request)

    // Redirect if already authenticated
    if (authSession.session) {
      return redirect(routes.home, { headers: authSession.headers })
    }

    // Authenticate user
    const credentials = await authenticator.authenticate('oidc', request)
    if (!credentials) {
      throw new CustomError('Authentication failed', 401)
    }

    const { user, ...rest } = credentials

    // Handle auth session
    const { headers: authHeaders } = await setAuthSession(request, {
      accessToken: rest.accessToken,
      refreshToken: rest.refreshToken,
      expiredAt: rest.expiredAt,
      sub: rest.sub,
      idToken: rest.idToken,
    })

    // Handle user session
    if (!user) {
      throw new CustomError('User not found', 404)
    }

    const { headers: userHeaders } = await setUserSession(request, user)

    let headers = combineHeaders(authHeaders, userHeaders)

    // Handle Organization
    const cookies = headers.getSetCookie()
    const req = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}?noCache=true`, {
      method: 'GET',
      headers: {
        Cookie: cookies?.[0],
      },
    })
    if (!req.ok) {
      const error = await req.text()
      throw new CustomError(error, req.status)
    }

    const organizations: IOrganization[] = await req.json()

    // TODO: Improve how to handle default organization. currently the process here is to take the first index of organizations
    if (organizations.length > 0) {
      // Set Default Organizations
      const { headers: orgHeaders } = await setOrgSession(request, organizations[0])
      headers = combineHeaders(headers, orgHeaders)
    }

    return redirect(
      organizations.length === 0 ? routes.account.organizations.new : routes.home,
      { headers },
    )
  } catch (error) {
    return redirectWithToast(routes.auth.logIn, {
      title: 'Authentication failed',
      description:
        (error as Error).message || 'Something went wrong with callback from provider',
      type: 'error',
    })
  }
}
