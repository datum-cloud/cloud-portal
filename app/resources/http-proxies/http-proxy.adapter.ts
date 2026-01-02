import type {
  HttpProxy,
  HttpProxyList,
  CreateHttpProxyInput,
  UpdateHttpProxyInput,
} from './http-proxy.schema';
import { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';

/**
 * Transform raw API HttpProxy to domain HttpProxy type
 */
export function toHttpProxy(raw: ComDatumapisNetworkingV1AlphaHttpProxy): HttpProxy {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    endpoint: raw.spec?.rules?.[0]?.backends?.[0]?.endpoint,
    hostnames: raw.spec?.hostnames,
    status: raw.status,
  };
}

/**
 * Transform raw API list to domain HttpProxyList
 */
export function toHttpProxyList(
  items: ComDatumapisNetworkingV1AlphaHttpProxy[],
  nextCursor?: string
): HttpProxyList {
  return {
    items: items.map(toHttpProxy),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Transform CreateHttpProxyInput to API payload
 */
export function toCreateHttpProxyPayload(input: CreateHttpProxyInput): {
  kind: string;
  apiVersion: string;
  metadata: { name: string };
  spec: {
    hostnames: string[];
    rules: Array<{ backends: Array<{ endpoint: string }> }>;
  };
} {
  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    metadata: {
      name: input.name,
    },
    spec: {
      hostnames: input.hostnames ?? [],
      rules: [
        {
          backends: [
            {
              endpoint: input.endpoint,
            },
          ],
        },
      ],
    },
  };
}

/**
 * Transform UpdateHttpProxyInput to API payload
 */
export function toUpdateHttpProxyPayload(input: UpdateHttpProxyInput): {
  kind: string;
  apiVersion: string;
  spec: {
    hostnames: string[];
    rules: Array<{ backends: Array<{ endpoint: string }> }>;
  };
} {
  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    spec: {
      hostnames: input.hostnames ?? [],
      rules: [
        {
          backends: [
            {
              endpoint: input.endpoint,
            },
          ],
        },
      ],
    },
  };
}
