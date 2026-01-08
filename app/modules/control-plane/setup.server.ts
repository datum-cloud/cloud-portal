/**
 * Server-side setup for the shared control-plane client.
 * Configures the client to use the server axios instance with AsyncLocalStorage.
 *
 * Import this file in server entry points before using any generated API functions.
 */
import { client } from './shared/client.gen';
import { http } from '@/modules/axios/axios.server';

// Configure the shared client with server axios instance
// Token and requestId will be auto-injected via AsyncLocalStorage
// All domain SDKs (iam, compute, etc.) use this single client
client.setConfig({ axios: http as any });

export { client };
