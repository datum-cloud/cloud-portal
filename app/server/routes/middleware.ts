import { authenticator } from '@/modules/auth/auth.server';
import { createAPIFactory, APIFactory } from '@/resources/api/api-factory.server';
import { createControlPlaneFactory } from '@/resources/control-plane/control.factory';
import { ControlPlaneFactory } from '@/resources/control-plane/control.factory';
import { sessionCookie } from '@/utils/cookies/session';
import { AuthorizationError } from '@/utils/errors';
import { MiddlewareHandler } from 'hono';
import { Context } from 'hono';

// Define a type for our custom variables
export type Variables = {
  apiClient: APIFactory;
  controlPlaneFactory: ControlPlaneFactory;
};

/**
 * Authentication middleware for Hono
 * Checks if the user is authenticated before proceeding to the route handler
 */
export const isAuthenticatedMiddleware: MiddlewareHandler = async (c, next) => {
  const isAuthenticated = await authenticator.isAuthenticated(c.req.raw);

  if (!isAuthenticated) {
    throw new AuthorizationError('Unauthorized');
  }

  return await next();
};

/**
 * API Client middleware for Hono
 * Initializes the API client and makes it available in the context
 */
export const apiClientMiddleware: MiddlewareHandler<{
  Variables: Variables;
}> = async (c, next) => {
  try {
    const { data } = await sessionCookie.get(c.req.raw);
    const apiClient = createAPIFactory(data?.accessToken || '');
    const controlPlaneFactory = createControlPlaneFactory(data?.accessToken || '');

    // Make the API client available in the context
    c.set('apiClient', apiClient);
    c.set('controlPlaneFactory', controlPlaneFactory);
  } catch (error) {
    throw new Error('Failed to initialize API client');
  }

  return await next();
};
