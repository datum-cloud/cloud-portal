/**
 * Server-side fetch helpers for plugin origins.
 *
 * Plugin assets and manifests are always fetched by the portal server, never
 * the browser. When a plugin's `assets.caBundle` is set (an internal CA fronting
 * the asset origin), it is handed to the TLS layer through an undici
 * dispatcher, which Node's `fetch` accepts as the `dispatcher` init option.
 */
import { Agent, type Dispatcher } from 'undici';

export interface TlsOptions {
  ca?: string;
  cert?: string;
  key?: string;
  rejectUnauthorized?: boolean;
}

export interface TlsFetchInit extends RequestInit {
  dispatcher?: Dispatcher;
}

const dispatchers = new Map<string, Agent>();

/**
 * Returns a shared dispatcher that connects with the given TLS options, so
 * repeated requests with the same trust and identity reuse one connection pool.
 */
export function tlsDispatcher(tls: TlsOptions): Agent {
  const key = JSON.stringify([tls.ca, tls.cert, tls.key, tls.rejectUnauthorized]);
  let dispatcher = dispatchers.get(key);
  if (!dispatcher) {
    dispatcher = new Agent({ connect: { ...tls } });
    dispatchers.set(key, dispatcher);
  }
  return dispatcher;
}

/**
 * Builds fetch init that trusts a plugin's optional CA bundle. Returns the
 * given init unchanged when no bundle is configured.
 */
export function withCaBundle(init: RequestInit, caBundle?: string): TlsFetchInit {
  const trimmed = caBundle?.trim();
  if (!trimmed) return init;
  return { ...init, dispatcher: tlsDispatcher({ ca: trimmed }) };
}
