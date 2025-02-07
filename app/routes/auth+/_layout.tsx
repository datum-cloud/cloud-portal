import { routes } from '@/constants/routes'
import { getDomainPathname } from '@/utils/misc.server'
import { LoaderFunctionArgs } from 'react-router';
import { Outlet, redirect } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const pathname = getDomainPathname(request)

  if (pathname === routes.auth.root) {
    return redirect(routes.auth.signIn)
  }

  return {}
}

export default function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Outlet />
      </div>
    </div>
  )
}
