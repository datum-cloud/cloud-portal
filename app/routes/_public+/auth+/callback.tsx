import { LogoIcon } from '@/components/logo/logo-icon'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { authenticator } from '@/modules/auth/auth.server'
import { getAuthSession, setAuthSession } from '@/modules/cookie/auth.server'
import { setUserSession } from '@/modules/cookie/user.server'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/_index'
import { CustomError } from '@/utils/errorHandle'
import { combineHeaders } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import {
  LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigation,
  data,
  useFetcher,
  useNavigate,
} from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const authSession = await getAuthSession(request)

    // Redirect if already authenticated
    if (authSession.session) {
      return redirect(routes.home, { headers: authSession.headers })
    }

    // Authenticate user
    const credentials = await authenticator.authenticate('oauth2', request)
    if (!credentials) {
      throw new CustomError('Authentication failed', 401)
    }

    const { user, ...rest } = credentials

    // Handle user session
    if (!user) {
      throw new CustomError('User not found', 404)
    }

    // Handle auth session
    const { headers: authHeaders } = await setAuthSession(request, {
      accessToken: rest.accessToken,
      refreshToken: rest.refreshToken,
      expiredAt: rest.expiredAt,
      // sub: rest.sub,
      // idToken: rest.idToken,
    })

    const { headers: userHeaders } = await setUserSession(request, user)

    const headers = combineHeaders(authHeaders, userHeaders)

    // Return auth data for client loader to handle organization fetching
    return data({ success: true, user }, { headers: headers })
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
  const navigation = useNavigation()
  const navigate = useNavigate()

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

      navigate(getPathWithParams(routes.org.root, { orgId: org[0].id }))
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
            {navigation.state === 'loading'
              ? 'Verifying your credentials...'
              : 'Setting up your account...'}
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
