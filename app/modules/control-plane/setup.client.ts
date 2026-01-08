/**
 * Client-side setup for the shared control-plane client.
 * Configures the client to use the browser axios instance.
 *
 * Import this file in entry.client.tsx before any React code runs.
 */
import { client } from './shared/client.gen';
import { httpClient } from '@/modules/axios/axios.client';

// Configure the shared client with browser axios instance
// All domain SDKs (iam, compute, etc.) use this single client
client.setConfig({ axios: httpClient as any });

export { client };
