import type { SearchHit, SearchResult, SearchTarget } from './search.schema';
import type {
  NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuery as RawSearchQuery,
  NetMiloapisGoSearchPkgApisSearchV1Alpha1SearchResult as RawSearchHit,
} from '@/modules/control-plane/search';

export function toSearchHit(raw: RawSearchHit): SearchHit {
  const resource = (raw.resource ?? {}) as {
    apiVersion?: string;
    kind?: string;
    metadata?: {
      uid?: string;
      name?: string;
      namespace?: string;
      annotations?: Record<string, string>;
    };
    spec?: { domainName?: string };
  };
  const metadata = resource.metadata ?? {};
  const spec = resource.spec ?? {};
  return {
    uid: metadata.uid ?? '',
    name: metadata.name ?? '',
    // Domain + DNSZone use spec.domainName in their tables; undefined for kinds without it.
    displayName: spec.domainName,
    description: metadata.annotations?.['kubernetes.io/description'] || undefined,
    namespace: metadata.namespace,
    apiVersion: resource.apiVersion ?? '',
    kind: resource.kind ?? '',
    relevanceScore: raw.relevanceScore ?? 0,
    tenant: {
      name: raw.tenant?.name ?? '',
      type: raw.tenant?.type ?? '',
    },
  };
}

export function toSearchResult(raw: RawSearchQuery): SearchResult {
  const status = raw.status as
    | undefined
    | {
        results?: RawSearchHit[];
        continue?: string;
        // Field name assumed pending milo-os/search PR #92 confirmation.
        // Until confirmed, deniedKinds is silently inert (acceptable per spec risk register).
        deniedTargetResources?: SearchTarget[];
      };
  return {
    hits: (status?.results ?? []).map(toSearchHit),
    nextContinueToken: status?.continue,
    deniedKinds: status?.deniedTargetResources ?? [],
  };
}
