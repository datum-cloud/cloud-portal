import { createQueryClient, getQueryClient, shouldRetryQuery } from './query';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { environmentManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'bun:test';

const wasServer = environmentManager.isServer();

afterEach(() => {
  environmentManager.setIsServer(() => wasServer);
});

describe('createQueryClient', () => {
  it('applies the portal query defaults', () => {
    const queries = createQueryClient().getDefaultOptions().queries;

    expect(queries?.staleTime).toBe(QUERY_STALE_TIME);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.retry).toBe(shouldRetryQuery);
  });
});

describe('getQueryClient', () => {
  it('returns a new client for every server call, so requests never share a cache', () => {
    environmentManager.setIsServer(() => true);

    const first = getQueryClient();
    first.setQueryData(['organizations', 'list', undefined], ['alice-org']);
    const second = getQueryClient();

    expect(second).not.toBe(first);
    expect(second.getQueryData(['organizations', 'list', undefined])).toBeUndefined();
  });

  it('returns the same client for every browser call, so clientLoaders read the provider cache', () => {
    environmentManager.setIsServer(() => false);

    expect(getQueryClient()).toBe(getQueryClient());
  });
});
