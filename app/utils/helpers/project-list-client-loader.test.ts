import { queryClient } from '@/modules/tanstack/query';
import { getValidCachedQueryData } from '@/utils/helpers/project-list-client-loader';
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
