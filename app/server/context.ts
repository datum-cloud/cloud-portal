// app/server/context.ts
/**
 * Typed React Router load-context definitions.
 *
 * React Router v8 always passes a `RouterContextProvider` instance as the
 * loader/action `context` argument — there is no more plain `AppLoadContext`
 * object to attach ad-hoc fields to. Each value that used to live directly on
 * `AppLoadContext` is now its own typed context created with `createContext()`
 * and populated in `getLoadContext` (see `app/server/entry.ts`). Loaders and
 * actions read values back out via `context.get(theContext)`.
 */
import type { Logger } from '@/modules/logger';
import type { IAccessTokenSession } from '@/utils/auth/auth.types';
import { createContext } from 'react-router';

/** Per-request id. Set by Hono's `requestId()` middleware. */
export const requestIdContext = createContext<string>('');

/** CSP nonce for the current request. Set by Hono's `secureHeaders()` middleware. */
export const cspNonceContext = createContext<string>('');

/** Validated session for the current request, if any. Set by `sessionMiddleware()`. */
export const sessionContext = createContext<IAccessTokenSession | null>(null);

/** Request-scoped logger, constructed once per request in `getLoadContext`. */
export const loggerContext = createContext<Logger>();
