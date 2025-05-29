/**
 * Server-Side Toasts.
 * Implementation based on github.com/epicweb-dev/epic-stack
 */
import { isProduction, combineHeaders } from '@/utils/misc';
import { createCookieSessionStorage, data as dataFn, redirect } from 'react-router';
import { z } from 'zod';

export const TOAST_SESSION_FLASH_KEY = '_toast_flash';

export const toastSessionStorage = createCookieSessionStorage({
  cookie: {
    name: TOAST_SESSION_FLASH_KEY,
    domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
    secure: isProduction(),
  },
});

const ToastSchema = z.object({
  description: z.string(),
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  title: z.string().optional(),
  type: z.enum(['message', 'success', 'error']).default('message'),
});

export type Toast = z.infer<typeof ToastSchema>;
export type ToastInput = z.input<typeof ToastSchema>;

export async function getToastSession(request: Request) {
  const session = await toastSessionStorage.getSession(request.headers.get('Cookie'));
  const result = ToastSchema.safeParse(session.get(TOAST_SESSION_FLASH_KEY));
  const toast = result.success ? result.data : null;

  return {
    toast,
    headers: toast
      ? new Headers({
          'Set-Cookie': await toastSessionStorage.commitSession(session),
        })
      : null,
  };
}

export async function createToastHeaders(toastInput: ToastInput) {
  const session = await toastSessionStorage.getSession();
  const toast = ToastSchema.parse(toastInput);

  session.flash(TOAST_SESSION_FLASH_KEY, toast);

  const cookie = await toastSessionStorage.commitSession(session);
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
