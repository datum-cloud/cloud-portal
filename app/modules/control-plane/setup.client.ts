/**
 * Client-side setup for the shared control-plane client.
 * Configures the client to use the browser axios instance.
 *
 * Call `configureBrowserClient()` explicitly from the client entry point
 * before hydration runs.
 */
import { client } from './shared/client.gen';
import { httpClient } from '@/modules/axios/axios.client';

/**
 * Configure the shared client with the browser axios instance so all domain
 * SDKs (iam, compute, etc.) use this single, correctly-wired client. This is
 * what wires up the browser `/api/proxy` baseURL, credentials, 401→logout
 * redirect, AppError transformation, and Sentry breadcrumbs (see
 * axios.client.ts).
 *
 * Exported as a function (rather than run as a bare-import side effect) so
 * `"sideEffects": false` tree-shaking can't drop the registration from the
 * production client bundle — see app/entry.client.tsx.
 */
export function configureBrowserClient(): void {
  client.setConfig({ axios: httpClient as any });
}

export { client };
