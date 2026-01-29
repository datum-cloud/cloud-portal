// app/modules/gqlts/request-context.ts
// Universal request context reader - works in both browser and server
// Reads from the shared globalThis store set up by axios middleware

export interface RequestContext {
  requestId: string;
  token: string;
  userId?: string;
}

// Must match the key in @/modules/axios/request-context.ts
const STORE_KEY = '__request_context_store__';

/**
 * Gets the current request context from the shared store.
 * Returns undefined on client or when outside request context.
 */
export function getRequestContext(): RequestContext | undefined {
  if (typeof window !== 'undefined') return undefined;

  try {
    const store = (globalThis as any)[STORE_KEY];
    if (store && typeof store.getStore === 'function') {
      return store.getStore();
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Checks if we're running on the server with a valid auth context.
 */
export function hasServerContext(): boolean {
  const ctx = getRequestContext();
  return !!ctx?.token;
}
