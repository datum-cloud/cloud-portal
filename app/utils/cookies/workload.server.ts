import { env } from '@/utils/env/env.server';
import { createCookie } from 'react-router';

export const deletedWorkloadIdsCookie = createCookie('_deleted-workload-ids', {
  path: '/',
  domain: new URL(env.public.appUrl).hostname,
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 1, // 1 hour
  secrets: [env.server.sessionSecret],
  secure: env.isProd,
});
