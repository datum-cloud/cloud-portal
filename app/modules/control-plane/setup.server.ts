/**
 * Server-side setup for the shared control-plane client.
 * Configures the client to use the server axios instance with AsyncLocalStorage.
 *
 * Call `configureServerClient()` explicitly from the server entry point before
 * using any generated API functions.
 */
import { client } from './shared/client.gen';
import { http } from '@/modules/axios/axios.server';

/**
 * Configure the shared client with the server axios instance so all domain
 * SDKs (iam, compute, etc.) use this single, correctly-wired client. Token
 * and requestId are auto-injected via AsyncLocalStorage.
 *
 * Exported as a function (rather than run as a bare-import side effect) so
 * `"sideEffects": false` tree-shaking can't drop the registration from the
 * production server bundle — see app/server/entry.ts.
 */
export function configureServerClient(): void {
  client.setConfig({ axios: http as any });
}

export { client };
