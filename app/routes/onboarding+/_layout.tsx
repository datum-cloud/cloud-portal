import { Outlet, redirect } from '@remix-run/react'
import { Header } from '@/components/header/header.component'
import { routes } from '@/constants/routes'

import { withMiddleware } from '@/modules/middleware/middleware'
import { authenticateSession } from '@/modules/middleware/auth-middleware'
import { getDomainPathname } from '@/utils/misc.server'

export const loader = withMiddleware(async ({ request }) => {
  const pathname = getDomainPathname(request)

  // @TODO: Check if user has already onboarded

  // If user access onboard root, redirect to home
  if (pathname === routes.onboarding.root) {
    return redirect(routes.onboarding.project)
  }

  return {}
}, authenticateSession)

export default function OnboardLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <div className="mx-auto w-full max-w-2xl flex-1 p-4 md:px-6 md:py-10">
        <Outlet />
      </div>
    </div>
  )
}
