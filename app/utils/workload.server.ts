import { isProduction } from './misc'
import { createCookie } from 'react-router'

export const deletedWorkloadIdsCookie = createCookie('_deleted-workload-ids', {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  secure: isProduction(),
  httpOnly: true,
  expires: new Date(Date.now() + 5 * 60 * 1000),
})
