/**
 * Middleware System for React Router Loaders and Actions
 *
 * This module provides a flexible middleware system for React Router loader and action functions.
 * It allows you to chain multiple middleware functions that can process requests before they reach
 * the final handler.
 */
import { ActionFunction, LoaderFunction, LoaderFunctionArgs, data } from 'react-router';

/**
 * Represents the next middleware function in the chain
 */
export type NextFunction = () => Promise<Response>;

/**
 * Middleware function type definition
 * @param request The incoming Request object
 * @param next Function to call the next middleware in chain
 */
export type MiddlewareFunction = (request: Request, next: NextFunction) => Promise<Response>;

/**
 * Class that manages the middleware chain execution
 */
class MiddlewareChain {
  private middlewares: MiddlewareFunction[] = [];

  /**
   * Adds a middleware function to the chain
   * @param middleware The middleware function to add
   */
  use(middleware: MiddlewareFunction) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Executes the middleware chain
   * @param request The incoming Request object
   * @param finalHandler The final handler to call after all middleware
   */
  async execute(request: Request, finalHandler: NextFunction): Promise<Response> {
    let index = 0;

    const next = async (): Promise<Response> => {
      if (index >= this.middlewares.length) {
        return finalHandler();
      }

      const middleware = this.middlewares[index++];
      return middleware(request, next);
    };

    return next();
  }
}

/**
 * Creates a middleware chain from the given middleware functions
 * @param middlewares Array of middleware functions to chain together
 * @example
 * ```ts
 * const middleware = createMiddleware(
 *   authMiddleware,
 *   loggingMiddleware
 * );
 * ```
 */
export function createMiddleware(...middlewares: MiddlewareFunction[]) {
  const chain = new MiddlewareChain();
  middlewares.forEach((middleware) => chain.use(middleware));

  return (request: Request, finalHandler: NextFunction) => {
    return chain.execute(request, finalHandler);
  };
}

/**
 * Context for storing auth headers that need to be merged with loader responses
 */
const authHeadersContext = new WeakMap<Request, Headers>();

/**
 * Context for storing refreshed session data
 */
const refreshedSessionContext = new WeakMap<Request, any>();

/**
 * Gets auth headers from the request context
 */
export function getAuthHeaders(request: Request): Headers | undefined {
  return authHeadersContext.get(request);
}

/**
 * Sets auth headers in the request context
 */
export function setAuthHeaders(request: Request, headers: Headers): void {
  authHeadersContext.set(request, headers);
}

/**
 * Gets refreshed session data from the request context
 */
export function getRefreshedSession(request: Request): any | undefined {
  return refreshedSessionContext.get(request);
}

/**
 * Sets refreshed session data in the request context
 */
export function setRefreshedSession(request: Request, session: any): void {
  refreshedSessionContext.set(request, session);
}

/**
 * Higher-order function that wraps a loader/action with middleware
 * @param handler The loader or action function to wrap
 * @param middleware Array of middleware functions to apply
 * @example
 * ```ts
 * // Example loader with authentication and logging middleware
 * export const loader = withMiddleware(
 *   async ({ request }) => {
 *     const data = await fetchData();
 *     return json({ data });
 *   },
 *   authMiddleware,
 *   loggingMiddleware
 * );
 *
 * // Example action with validation and error handling middleware
 * export const action = withMiddleware(
 *   async ({ request }) => {
 *     const formData = await request.formData();
 *     const result = await saveData(formData);
 *     return json({ success: true });
 *   },
 *   validateFormMiddleware,
 *   errorHandlerMiddleware
 * );
 * ```
 *
 * The middleware can modify the request/response or handle errors:
 * ```ts
 * // Authentication middleware example
 * export const authMiddleware = async (request: Request, next: NextFunction) => {
 *   const session = await getSession(request.headers.get('Cookie'));
 *   if (!session.has('userId')) {
 *     return redirect('/login');
 *   }
 *   return next();
 * }
 *
 * // Validation middleware example
 * export const validateFormMiddleware = async (request: Request, next: NextFunction) => {
 *   const formData = await request.formData();
 *   const errors = validateForm(formData);
 *   if (errors) {
 *     return json({ errors }, { status: 400 });
 *   }
 *   return next();
 * }
 *
 * // Error handling middleware example
 * export const errorHandlerMiddleware = async (request: Request, next: NextFunction) => {
 *   try {
 *     return await next();
 *   } catch (error) {
 *     console.error(error);
 *     return json({ error: 'An error occurred' }, { status: 500 });
 *   }
 * }
 * ```
 */
export function withMiddleware(
  handler: LoaderFunction | ActionFunction,
  ...middleware: MiddlewareFunction[]
) {
  return async ({ request, ...rest }: LoaderFunctionArgs) => {
    const next = async () => {
      const result = await handler({ request, ...rest });
      // Return result directly if it's not a Response
      return result;
    };

    const response = await createMiddleware(...middleware)(request, next as NextFunction);

    if (response instanceof Response) {
      // If it's already a Response, return it directly
      return response;
    }

    // Check if there are auth headers to merge with non-Response returns
    const authHeaders = getAuthHeaders(request);
    if (authHeaders && response && typeof response === 'object' && response !== null) {
      // Check if this looks like a data() return (has data property or is a plain object)
      // React Router's data() returns a Response, but loaders can also return plain objects
      // If it's a plain object, we need to wrap it with data() and headers
      const responseObj = response as Record<string, unknown>;
      if ('data' in responseObj) {
        // This might be a data() return - try to preserve its structure
        const dataResponse = responseObj as { data: unknown; headers?: Headers };
        const { combineHeaders } = await import('@/utils/helpers/path.helper');
        const mergedHeaders = combineHeaders(
          authHeaders,
          dataResponse.headers ? new Headers(dataResponse.headers) : undefined
        );
        // Re-wrap with data() to ensure proper React Router handling
        return data(dataResponse.data, { headers: mergedHeaders });
      } else {
        // Plain object return - wrap with data() and auth headers
        return data(responseObj, { headers: authHeaders });
      }
    }

    // Return non-Response data directly
    return response;
  };
}
