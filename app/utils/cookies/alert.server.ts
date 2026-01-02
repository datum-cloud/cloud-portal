import { env } from '@/utils/env/env.server';
import { createCookie, createCookieSessionStorage } from 'react-router';

export const ALERT_SESSION_KEY = '_alerts';

/**
 * Alert preferences cookie configuration
 * Stores all alert dismissal states in a single cookie
 */
export const alertCookie = createCookie(ALERT_SESSION_KEY, {
  path: '/',
  domain: new URL(env.public.appUrl).hostname,
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365, // 1 year
  secrets: [env.server.sessionSecret],
  secure: env.isProd,
});

/**
 * Creates a session storage based on the alert cookie.
 */
export const alertSessionStorage = createCookieSessionStorage({
  cookie: alertCookie,
});

/**
 * Type for the response object from alert operations
 */
type AlertResponse = {
  isClosed: boolean;
  headers: Headers;
};

/**
 * Creates an alert response with the provided data and cookie header
 */
const createAlertResponse = (isClosed: boolean, cookieHeader: string): AlertResponse => ({
  isClosed,
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
});

/**
 * Gets the closed state for a specific alert
 * @param request Request object
 * @param alertKey Unique key identifying the alert (e.g., 'projects_understanding')
 * @returns Response with alert state and headers
 */
export async function getAlertState(request: Request, alertKey: string): Promise<AlertResponse> {
  const session = await alertSessionStorage.getSession(request.headers.get('Cookie'));
  const alerts = (session.get(ALERT_SESSION_KEY) as Record<string, boolean>) || {};
  const isClosed = alerts[alertKey] === true;
  const cookieHeader = await alertSessionStorage.commitSession(session);

  return createAlertResponse(isClosed, cookieHeader);
}

/**
 * Sets an alert as closed
 * @param request Request object
 * @param alertKey Unique key identifying the alert (e.g., 'projects_understanding')
 * @returns Response with alert state and headers
 */
export async function setAlertClosed(request: Request, alertKey: string): Promise<AlertResponse> {
  const session = await alertSessionStorage.getSession(request.headers.get('Cookie'));
  const alerts = (session.get(ALERT_SESSION_KEY) as Record<string, boolean>) || {};
  alerts[alertKey] = true;
  session.set(ALERT_SESSION_KEY, alerts);
  const cookieHeader = await alertSessionStorage.commitSession(session);

  return createAlertResponse(true, cookieHeader);
}

/**
 * Destroys all alert preferences (clears the cookie)
 * @param request Request object
 * @returns Response with headers for destroying the cookie
 */
export async function destroyAlertState(request: Request): Promise<AlertResponse> {
  const session = await alertSessionStorage.getSession(request.headers.get('Cookie'));
  const cookieHeader = await alertSessionStorage.destroySession(session);

  return createAlertResponse(false, cookieHeader);
}
