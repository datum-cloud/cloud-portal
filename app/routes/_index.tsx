import type { MetaFunction } from '@remix-run/node'
import { SITE_CONFIG } from '@/constants/brand'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/misc/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/misc/ThemeSwitcher'
import { useRequestInfo } from '@/hooks/useRequestInfo'
import { Form, useLoaderData } from '@remix-run/react'
import { authenticateSession } from '@/modules/middleware/auth-middleware'
import { getUserSession } from '@/modules/auth/auth.server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { routes } from '@/constants/routes'
import { withMiddleware } from '@/modules/middleware/middleware'

export const meta: MetaFunction = () => {
  return [
    { title: `${SITE_CONFIG.siteTitle}` },
    { name: 'description', content: SITE_CONFIG.siteDescription },
  ]
}

export const loader = withMiddleware(async ({ request }) => {
  const user = await getUserSession(request)
  return user
}, authenticateSession)

export default function Index() {
  const { t } = useTranslation()
  const user = useLoaderData<typeof loader>()

  const requestInfo = useRequestInfo()

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-6">
      <img src="/images/logo.svg" alt="Logo" className="mb-4 h-16" />
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <ThemeSwitcher userPreference={requestInfo.userPrefs.theme} />
      </div>

      <div className="space-y-2 text-center">
        <h1 className="font-mono text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">{t('description')}</p>
        <p className="text-lg text-gray-600 dark:text-gray-300">{t('description2')}</p>
        <p className="text-lg text-gray-600 dark:text-gray-300">{JSON.stringify(user)}</p>
      </div>

      <div className="flex items-center gap-2">
        <Avatar className="size-10">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback>{user?.email.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <p className="text-lg">{user?.fullName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{user?.email}</p>
        </div>
      </div>

      {/* GitHub Button */}
      <Form method="POST" action={routes.auth.signOut}>
        <Button variant="destructive">
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </Form>

      {/* Footer */}
      <footer className="mt-10 text-sm text-gray-600 dark:text-gray-400">
        &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
