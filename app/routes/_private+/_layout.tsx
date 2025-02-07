import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { Outlet, useLoaderData, redirect } from 'react-router'
import { routes } from '@/constants/routes'
import { AxiosError } from 'axios'
import { profileGql } from '@/resources/gql/profile.gql'
import { getCredentials } from '@/modules/auth/auth.server'

export const loader = withMiddleware(async ({ request }) => {
  try {
    const credentials = await getCredentials(request)
    /* 
    - Update user info based on the access token
    - If the access token is expired or invalid, redirect to the sign-in page
    - If the access token is valid, update the user info 
    */

    await profileGql.setToken(request)
    const user = await profileGql.getUserProfile(credentials.userId)

    return user
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
}, authMiddleware)

export default function PrivateLayout() {
  const user = useLoaderData<typeof loader>()
  console.log(user)
  return (
    <div>
      <Outlet />
    </div>
  )
}
