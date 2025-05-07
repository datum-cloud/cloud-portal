import { LogoIcon } from '@/components/logo/logo-icon'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { useIsPending } from '@/hooks/useIsPending'
import { authenticator } from '@/modules/auth/auth.server'
import { setIdTokenSession } from '@/modules/cookie/id-token.server'
import { getSession, setSession } from '@/modules/cookie/session.server'
import { IAuthSession } from '@/resources/interfaces/auth.interface'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/_index'
import { CustomError } from '@/utils/errorHandle'
import { combineHeaders } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { jwtDecode } from 'jwt-decode'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import {
  LoaderFunctionArgs,
  redirect,
  useLoaderData,
  data,
  useFetcher,
  useNavigate,
} from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await getSession(request)

    // Redirect if already authenticated
    if (session.session) {
      return redirect(routes.home, { headers: session.headers })
    }

    // Authenticate user
    const credentials: IAuthSession | undefined = await authenticator.authenticate(
      'zitadel',
      request,
    )
    if (!credentials) {
      throw new CustomError('Authentication failed', 401)
    }

    const { idToken, ...rest } = credentials

    // Decode Access token
    const decoded = jwtDecode<{ sub: string; email: string }>(rest.accessToken)

    // Handle auth session
    const { headers: sessionHeaders } = await setSession(request, {
      accessToken: rest.accessToken,
      refreshToken: rest.refreshToken,
      expiredAt: rest.expiredAt,
      sub: decoded.sub,
    })

    // Handle id token session
    let idTokenHeaders: Headers | undefined
    if (idToken) {
      const idTokenResponse = await setIdTokenSession(request, idToken)
      idTokenHeaders = idTokenResponse.headers
    }

    // Combine headers
    const headers = combineHeaders(sessionHeaders, idTokenHeaders)

    // Return auth data for client loader to handle organization fetching
    return data({ success: true }, { headers: headers })
  } catch (error) {
    const errMessage =
      error instanceof CustomError
        ? error.message
        : 'Something went wrong with callback from provider'

    return data({ success: false, error: errMessage })
  }
}

export default function AuthCallbackPage() {
  const data = useLoaderData()
  const navigate = useNavigate()
  const isPending = useIsPending({ fetcherKey: 'org-list' })

  const fetcher = useFetcher({ key: 'org-list' })

  useEffect(() => {
    if (data?.success) {
      fetcher.load(ORG_LIST_PATH)
    }
  }, [data])

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, data: org } = fetcher.data

      if (!success) {
        navigate(routes.account.organizations.root)
        return
      }

      navigate(getPathWithParams(routes.org.projects.root, { orgId: org[0].id }))
      return
    }
  }, [fetcher.data, fetcher.state])

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
      <LogoIcon width={32} className="mb-4" />

      {data?.success ? (
        <>
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <h2 className="text-xl font-semibold">Authenticating...</h2>
          <p className="text-muted-foreground text-sm">
            {isPending ? 'Verifying your credentials...' : 'Setting up your account...'}
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold">Authentication failed</h2>
          <p className="text-muted-foreground text-sm">{data?.error}</p>
          <Button variant="outline" onClick={() => navigate(routes.auth.logOut)}>
            Go back to login
          </Button>
        </>
      )}
    </div>
  )
}
