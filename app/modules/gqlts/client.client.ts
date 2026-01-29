import { buildProxyPath } from './endpoints';
import { createClient as createGqltsClient } from './generated';
import type { GqlScope } from './types';

/**
 * Creates a Gqlts client for client-side use.
 * Routes through proxy which handles auth via session cookies.
 */
export function createGqlClient(scope: GqlScope) {
  const path = buildProxyPath(scope);

  return createGqltsClient({
    url: path,
  });
}

export type { GqlScope } from './types';
