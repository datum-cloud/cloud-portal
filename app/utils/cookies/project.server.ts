import { env } from '@/utils/env/env.server';
import { createCookie, createCookieSessionStorage } from 'react-router';

/**
 * Session key for the project cookie
 */
export const PROJECT_SESSION_KEY = '_project';

/**
 * Project cookie configuration
 */
export const projectCookie = createCookie(PROJECT_SESSION_KEY, {
  path: '/',
  domain: new URL(env.public.appUrl).hostname,
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 1, // 1 days
  secrets: [env.server.sessionSecret],
  secure: env.isProd,
});

export const projectSessionStorage = createCookieSessionStorage({ cookie: projectCookie });

/**
 * Type for the response object from project session operations
 */
type ProjectSessionResponse = {
  projectId?: string;
  headers: Headers;
};

/**
 * Creates a session response with the provided data and cookie header
 * @param projectId Project ID to include in the response
 * @param cookieHeader Cookie header value
 * @returns Response object with session data and headers
 */
const createProjectResponse = (
  projectId: string | undefined,
  cookieHeader: string
): ProjectSessionResponse => ({
  ...(projectId ? { projectId } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
});

/**
 * Clears the project session
 * @param request Request object
 * @returns Empty response with cleared session headers
 */
export async function clearProjectSession(request: Request): Promise<ProjectSessionResponse> {
  const session = await projectSessionStorage.getSession(request.headers.get('Cookie'));
  session.unset(PROJECT_SESSION_KEY);
  return createProjectResponse(undefined, await projectSessionStorage.commitSession(session));
}

/**
 * Gets the project ID from the session
 * @param request Request object
 * @returns Project ID and session headers
 */
export async function getProjectSession(request: Request): Promise<ProjectSessionResponse> {
  const session = await projectSessionStorage.getSession(request.headers.get('Cookie'));
  const projectId = session.get(PROJECT_SESSION_KEY);
  return createProjectResponse(projectId, await projectSessionStorage.commitSession(session));
}

/**
 * Sets the project ID in the session
 * @param request Request object
 * @param projectId Project ID
 * @returns Updated project ID and session headers
 */
export async function setProjectSession(
  request: Request,
  projectId: string
): Promise<ProjectSessionResponse> {
  const session = await projectSessionStorage.getSession(request.headers.get('Cookie'));
  session.set(PROJECT_SESSION_KEY, projectId);
  return createProjectResponse(projectId, await projectSessionStorage.commitSession(session));
}

/**
 * Destroys the project session
 * @param request Request object
 * @returns Response with headers for destroying the session
 */
export async function destroyProjectSession(request: Request): Promise<ProjectSessionResponse> {
  const session = await projectSessionStorage.getSession(request.headers.get('Cookie'));
  const cookieHeader = await projectSessionStorage.destroySession(session);

  return createProjectResponse(undefined, cookieHeader);
}
