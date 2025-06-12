import { env } from '@/utils/config/env.server';
import { createCookie } from 'react-router';

export const workloadCookie = createCookie('_workload', {
  path: '/',
  domain: new URL(env.APP_URL).hostname,
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 1, // 1 hour
  secrets: [env.SESSION_SECRET],
});
