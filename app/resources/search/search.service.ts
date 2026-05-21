// app/resources/search/search.service.ts
import { toSearchResult } from './search.adapter';
import type { SearchInput, SearchResult, SearchTarget } from './search.schema';
import { createSearchMiloapisComV1Alpha1ResourceSearchQuery } from '@/modules/control-plane/search';
import type { Options } from '@/modules/control-plane/search/sdk.gen';
import type {
  CreateSearchMiloapisComV1Alpha1ResourceSearchQueryData,
  NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuerySpec as RawSearchSpec,
} from '@/modules/control-plane/search/types.gen';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

const SERVICE_NAME = 'SearchService';

export const searchKeys = {
  all: ['search'] as const,
  global: (query: string, kinds: string) => [...searchKeys.all, 'global', query, kinds] as const,
  project: (projectId: string, query: string, kinds: string) =>
    [...searchKeys.all, 'project', projectId, query, kinds] as const,
};

export function serializeKinds(kinds: SearchTarget[]): string {
  return kinds
    .map((k) => `${k.group}/${k.version}/${k.kind}`)
    .sort()
    .join(',');
}

async function runQuery(input: SearchInput, baseURL?: string): Promise<SearchResult> {
  if (!input.query.trim()) {
    return { hits: [], deniedKinds: [] };
  }

  const start = Date.now();
  const spec: RawSearchSpec = {
    query: input.query,
    limit: input.limit ?? 25,
    targetResources: input.targetResources,
    ...(input.continueToken ? { continue: input.continueToken } : {}),
  };

  try {
    const options: Options<CreateSearchMiloapisComV1Alpha1ResourceSearchQueryData> = {
      ...(baseURL ? { baseURL } : {}),
      // The generated SDK defaults Content-Type to */* for this endpoint
      // because the search OpenAPI spec doesn't declare a requestBody content
      // type. K8s aggregated apiservers strictly require application/json
      // (or yaml/protobuf) and reject the wildcard with 415. Override it here.
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        apiVersion: 'search.miloapis.com/v1alpha1',
        kind: 'ResourceSearchQuery',
        metadata: { name: `search-${Date.now()}` },
        spec,
      },
    };

    const response = await createSearchMiloapisComV1Alpha1ResourceSearchQuery(options);

    logger.service(SERVICE_NAME, baseURL ? 'searchInProject' : 'searchGlobal', {
      duration: Date.now() - start,
    });

    return toSearchResult(response.data!);
  } catch (error) {
    logger.error(`${SERVICE_NAME}.run failed`, error as Error);
    throw mapApiError(error);
  }
}

export function createSearchService() {
  return {
    async searchGlobal(input: SearchInput): Promise<SearchResult> {
      return runQuery(input);
    },
    async searchInProject(projectId: string, input: SearchInput): Promise<SearchResult> {
      return runQuery(input, getProjectScopedBase(projectId));
    },
  };
}
