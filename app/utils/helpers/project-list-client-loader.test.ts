import { queryClient } from '@/modules/tanstack/query';
import {
  getValidCachedQueryData,
  readValidCachedQueryData,
} from '@/utils/helpers/project-list-client-loader';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'bun:test';

type TestListItem = { name: string };

describe('getValidCachedQueryData', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('returns cached data when the query is fresh', () => {
    const key = ['proxies', 'proj-a'] as const;
    queryClient.setQueryData<TestListItem[]>(key, [{ name: 'edge-1' }]);
    expect(getValidCachedQueryData<TestListItem[]>(key)).toEqual([{ name: 'edge-1' }]);
  });

  it('returns undefined after invalidateQueries marks the list stale', async () => {
    const key = ['proxies', 'proj-a'] as const;
    queryClient.setQueryData<TestListItem[]>(key, [{ name: 'edge-1' }]);
    await queryClient.invalidateQueries({ queryKey: key });
    expect(getValidCachedQueryData<TestListItem[]>(key)).toBeUndefined();
  });

  it('returns undefined when there is no cached data', () => {
    expect(getValidCachedQueryData(['proxies', 'missing'])).toBeUndefined();
  });
});

describe('mount after invalidation', () => {
  it('an invalidated inactive list fetches once when a default-options observer mounts', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000 } } });
    const key = ['secrets', 'list', 'p1'] as const;
    let fetches = 0;
    const queryFn = async () => {
      fetches++;
      return [{ name: 'fresh' }];
    };
    qc.setQueryData<TestListItem[]>(key, [{ name: 'stale' }]);
    await qc.invalidateQueries({ queryKey: key, refetchType: 'none' });
    expect(fetches).toBe(0);

    const observer = new QueryObserver(qc, { queryKey: key, queryFn });
    const unsubscribe = observer.subscribe(() => undefined);
    await qc.getQueryCache().find({ queryKey: key })?.promise;
    expect(fetches).toBe(1);
    expect(readValidCachedQueryData<TestListItem[]>(qc, key)).toEqual([{ name: 'fresh' }]);

    // A second observer on fresh data does not fetch again.
    const second = new QueryObserver(qc, { queryKey: key, queryFn });
    const unsubscribeSecond = second.subscribe(() => undefined);
    expect(fetches).toBe(1);

    unsubscribe();
    unsubscribeSecond();
  });
});
