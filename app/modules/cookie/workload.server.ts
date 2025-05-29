import { isProduction } from '@/utils/misc';
import { createCookie } from 'react-router';

export const deletedWorkloadIdsCookie = createCookie('_deleted-workload-ids', {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 1, // 1 hour
  secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
  secure: isProduction(),
});
