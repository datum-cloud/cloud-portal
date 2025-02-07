import { authenticateSession } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { getSession, updateSession } from '@/modules/auth/auth-session.server'
import { redirect } from 'react-router';
import { routes } from '@/constants/routes'
import { AxiosError } from 'axios'
import { Outlet, useLoaderData } from 'react-router';
import { authApi } from '@/resources/api/auth'

export const loader = withMiddleware(async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'))
  const user = session.get('user')

  if (!user) {
    return redirect(routes.auth.signIn)
  }

  try {
    /* 
    - Update user info based on the access token
    - If the access token is expired or invalid, redirect to the sign-in page
    - If the access token is valid, update the user info 
    */
    await authApi.setToken(request)
    const userInfo = await authApi.getUserInfo()

    return {
      user: userInfo,
    }
  } catch (error) {
    // TODO: implement best practices for error handle
    if (
      error instanceof AxiosError &&
      error.response &&
      error.response.status >= 400 &&
      error.response.status < 500
    ) {
      return redirect(routes.auth.signOut)
    }
    throw error
  }
}, authenticateSession)

export default function PrivateLayout() {
  const { user } = useLoaderData<typeof loader>()
  console.log(user)
  return (
    <div>
      <Outlet />
    </div>
  )
}
