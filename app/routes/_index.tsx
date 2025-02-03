import type { MetaFunction } from '@remix-run/node'
import { SITE_CONFIG } from '@/constants/brand'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/misc/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/misc/ThemeSwitcher'
import { useRequestInfo } from '@/hooks/useRequestInfo'

export const meta: MetaFunction = () => {
  return [
    { title: `${SITE_CONFIG.siteTitle}` },
    { name: 'description', content: SITE_CONFIG.siteDescription },
  ]
}

export default function Index() {
  const { t } = useTranslation()
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

      {/* GitHub Button */}
      <div>
        <a
          href="https://github.com/datum-cloud/cloud-portal"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600">
          <svg
            className="mr-2 h-5 w-5"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24">
            <title>Github</title>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.799 8.207 11.387.6.113.793-.258.793-.577v-2.243c-3.337.724-4.042-1.607-4.042-1.607-.546-1.387-1.334-1.757-1.334-1.757-1.09-.745.083-.73.083-.73 1.204.084 1.835 1.237 1.835 1.237 1.072 1.836 2.809 1.305 3.493.997.108-.776.42-1.306.763-1.606-2.665-.302-5.467-1.332-5.467-5.926 0-1.31.468-2.383 1.235-3.223-.123-.302-.535-1.518.117-3.166 0 0 1.008-.322 3.3 1.23a11.56 11.56 0 013.003-.405c1.02.005 2.045.138 3.003.405 2.292-1.552 3.3-1.23 3.3-1.23.652 1.648.24 2.864.117 3.166.768.84 1.234 1.914 1.234 3.223 0 4.61-2.805 5.62-5.477 5.915.431.373.815 1.104.815 2.222v3.293c0 .32.192.694.8.576C20.563 21.8 24 17.301 24 12 24 5.37 18.63 0 12 0z"
            />
          </svg>
          GitHub
        </a>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-sm text-gray-600 dark:text-gray-400">
        &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
