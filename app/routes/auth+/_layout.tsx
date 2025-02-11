import { routes } from '@/constants/routes'
import PublicLayout from '@/layouts/public/public'
import { getDomainPathname } from '@/utils/misc.server'
import { LoaderFunctionArgs, Outlet, redirect } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  const pathname = getDomainPathname(request)

  if (pathname === routes.auth.root) {
    return redirect(routes.auth.signIn)
  }

  return {}
}

export default function layout() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  )
}
