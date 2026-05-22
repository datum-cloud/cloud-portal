// app/resources/search/search.queries.ts
import type { SearchInput, SearchResult } from './search.schema';
import { createSearchService, searchKeys, serializeKinds } from './search.service';
import { useQuery } from '@tanstack/react-query';

const service = createSearchService();

type HttpError = { status?: number };

const defaults = {
  staleTime: 30_000,
  refetchOnWindowFocus: false,
  retry: (count: number, err: unknown) => {
    const status = (err as HttpError | undefined)?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) return false;
    return count < 3;
  },
};

export function useSearchGlobal(input: SearchInput, opts?: { enabled?: boolean }) {
  return useQuery<SearchResult>({
    queryKey: searchKeys.global(input.query, serializeKinds(input.targetResources)),
    queryFn: () => service.searchGlobal(input),
    enabled: (opts?.enabled ?? true) && input.query.trim().length > 0,
    ...defaults,
  });
}

export function useSearchInProject(
  projectId: string,
  input: SearchInput,
  opts?: { enabled?: boolean }
) {
  return useQuery<SearchResult>({
    queryKey: searchKeys.project(projectId, input.query, serializeKinds(input.targetResources)),
    queryFn: () => service.searchInProject(projectId, input),
    enabled: (opts?.enabled ?? true) && !!projectId && input.query.trim().length > 0,
    ...defaults,
  });
}
