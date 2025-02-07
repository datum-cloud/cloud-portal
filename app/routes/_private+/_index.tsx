import type { MetaFunction } from 'react-router'
import { SITE_CONFIG } from '@/constants/brand'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/misc/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/misc/ThemeSwitcher'
import { useRequestInfo } from '@/hooks/useRequestInfo'
import { Form, useLoaderData } from 'react-router'
import { authenticateSession } from '@/modules/middleware/auth-middleware'
import { getCredentials } from '@/modules/auth/auth.server'
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
  const credentials = await getCredentials(request)
  return credentials
}, authenticateSession)

export default function Index() {
  const { t } = useTranslation()
  const credentials = useLoaderData<typeof loader>()

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
      </div>

      {JSON.stringify(credentials)}
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
