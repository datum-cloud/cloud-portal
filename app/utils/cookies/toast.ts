/**
 * Server-Side Toasts.
 * Implementation based on github.com/epicweb-dev/epic-stack
 */
import { env } from '@/utils/config/env.server';
import { isProduction, combineHeaders } from '@/utils/helpers/misc.helper';
import { createCookieSessionStorage, data as dataFn, redirect } from 'react-router';
import { z } from 'zod';

const ToastSchema = z.object({
  description: z.string(),
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  title: z.string().optional(),
  type: z.enum(['message', 'success', 'error']).default('message'),
});

export type Toast = z.infer<typeof ToastSchema>;
export type ToastInput = z.input<typeof ToastSchema>;

export const TOAST_COOKIE_KEY = '_toast';
export const toastCookie = createCookieSessionStorage({
  cookie: {
    name: TOAST_COOKIE_KEY,
    domain: new URL(env.APP_URL).hostname,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
    secure: isProduction(),
  },
});

export async function getToastSession(request: Request) {
  const session = await toastCookie.getSession(request.headers.get('Cookie'));
  const result = ToastSchema.safeParse(session.get(TOAST_COOKIE_KEY));
  const toast = result.success ? result.data : null;

  return {
    toast,
    headers: toast
      ? new Headers({
          'Set-Cookie': await toastCookie.commitSession(session),
        })
      : null,
  };
}

export async function createToastHeaders(toastInput: ToastInput) {
  const session = await toastCookie.getSession();
  const toast = ToastSchema.parse(toastInput);

  session.flash(TOAST_COOKIE_KEY, toast);

  const cookie = await toastCookie.commitSession(session);
  return new Headers({ 'Set-Cookie': cookie });
}

export async function redirectWithToast(url: string, toast: ToastInput, init?: ResponseInit) {
  return redirect(url, {
    ...init,
    headers: combineHeaders(init?.headers, await createToastHeaders(toast)),
  });
}

export async function dataWithToast<T>(data: T, toast: ToastInput, init?: ResponseInit) {
  return dataFn(data, {
    ...init,
    headers: combineHeaders(init?.headers, await createToastHeaders(toast)),
  });
}
