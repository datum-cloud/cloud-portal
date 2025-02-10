/**
 * Middleware System for React Router Loaders and Actions
 *
 * This module provides a flexible middleware system for React Router loader and action functions.
 * It allows you to chain multiple middleware functions that can process requests before they reach
 * the final handler.
 */

import { ActionFunction, LoaderFunction, LoaderFunctionArgs } from 'react-router'

/**
 * Represents the next middleware function in the chain
 */
export type NextFunction = () => Promise<Response>

/**
 * Middleware function type definition
 * @param request The incoming Request object
 * @param next Function to call the next middleware in chain
 */
export type MiddlewareFunction = (
  request: Request,
  next: NextFunction,
) => Promise<Response>

/**
 * Class that manages the middleware chain execution
 */
class MiddlewareChain {
  private middlewares: MiddlewareFunction[] = []

  /**
   * Adds a middleware function to the chain
   * @param middleware The middleware function to add
   */
  use(middleware: MiddlewareFunction) {
    this.middlewares.push(middleware)
    return this
  }

  /**
   * Executes the middleware chain
   * @param request The incoming Request object
   * @param finalHandler The final handler to call after all middleware
   */
  async execute(request: Request, finalHandler: NextFunction): Promise<Response> {
    let index = 0

    const next = async (): Promise<Response> => {
      if (index >= this.middlewares.length) {
        return finalHandler()
      }

      const middleware = this.middlewares[index++]
      return middleware(request, next)
    }

    return next()
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
  const chain = new MiddlewareChain()
  middlewares.forEach((middleware) => chain.use(middleware))

  return (request: Request, finalHandler: NextFunction) => {
    return chain.execute(request, finalHandler)
  }
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
      const result = await handler({ request, ...rest })
      // Return result directly if it's not a Response
      return result
    }

    const response = await createMiddleware(...middleware)(request, next as NextFunction)

    if (response instanceof Response) {
      // If it's already a Response, return it directly
      return response
    }

    // Return non-Response data directly
    return response
  }
}
