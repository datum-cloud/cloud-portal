import { ActionFunction, LoaderFunction, LoaderFunctionArgs } from 'react-router'

export type NextFunction = () => Promise<Response>

export type MiddlewareFunction = (
  request: Request,
  next: NextFunction,
) => Promise<Response>

class MiddlewareChain {
  private middlewares: MiddlewareFunction[] = []

  use(middleware: MiddlewareFunction) {
    this.middlewares.push(middleware)
    return this
  }

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

export function createMiddleware(...middlewares: MiddlewareFunction[]) {
  const chain = new MiddlewareChain()
  middlewares.forEach((middleware) => chain.use(middleware))

  return (request: Request, finalHandler: NextFunction) => {
    return chain.execute(request, finalHandler)
  }
}

export function withMiddleware(
  handler: LoaderFunction | ActionFunction,
  ...middleware: MiddlewareFunction[]
) {
  return async ({ request, ...rest }: LoaderFunctionArgs) => {
    const next = async () => {
      const result = await handler({ request, ...rest })
      return result
    }

    return createMiddleware(...middleware)(request, next as NextFunction)
  }
}
