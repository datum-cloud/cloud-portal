import * as i18n from '@/modules/i18n/i18n'
import { isProduction } from '@/utils/misc'
import { createCookie } from 'react-router'
import { RemixI18Next } from 'remix-i18next/server'

export const localeCookie = createCookie('lng', {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  secure: isProduction(),
  httpOnly: true,
})

export default new RemixI18Next({
  detection: {
    supportedLanguages: i18n.supportedLngs,
    fallbackLanguage: i18n.fallbackLng,
    cookie: localeCookie,
  },
  // Configuration for i18next used when
  // translating messages server-side only.
  i18next: {
    ...i18n,
  },
})
