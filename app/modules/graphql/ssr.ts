import { ssrExchange } from '@urql/core';
import type { SSRData, SSRExchange } from '@urql/core';

export type { SSRData, SSRExchange };

/**
 * Creates a server-side SSR exchange that captures query results.
 * Call extractSsrData() after all queries complete to get serializable state.
 */
export function createSsrExchange(): SSRExchange {
  return ssrExchange({ isClient: false });
}

/**
 * Serializes captured SSR data to pass to the client via loader return value.
 */
export function extractSsrData(ssr: SSRExchange): SSRData {
  return ssr.extractData();
}
