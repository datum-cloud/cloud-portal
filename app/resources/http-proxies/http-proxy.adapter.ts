import type {
  HttpProxy,
  HttpProxyList,
  CreateHttpProxyInput,
  UpdateHttpProxyInput,
} from './http-proxy.schema';
import type { TrafficProtectionMode } from './http-proxy.schema';
import {
  type ComDatumapisNetworkingV1AlphaHttpProxy,
  type ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy,
  type ComDatumapisNetworkingV1AlphaTrafficProtectionPolicyList,
} from '@/modules/control-plane/networking';

/**
 * Build a TrafficProtectionPolicy that targets the Gateway backing the HTTP proxy.
 * Uses OWASP Core Rule Set in Enforce mode. Policy name matches the proxy name for 1:1 lifecycle.
 */
export function toTrafficProtectionPolicyPayload(
  httpProxyName: string,
  mode: 'Enforce' | 'Observe' | 'Disabled' = 'Enforce'
): ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy {
  return {
    apiVersion: 'networking.datumapis.com/v1alpha',
    kind: 'TrafficProtectionPolicy',
    metadata: {
      name: httpProxyName,
    },
    spec: {
      mode: mode,
      ruleSets: [
        {
          type: 'OWASPCoreRuleSet',
        },
      ],
      targetRefs: [
        {
          group: 'gateway.networking.k8s.io',
          kind: 'Gateway',
          name: httpProxyName,
        },
      ],
    },
  };
}

/** Extract WAF mode from a TrafficProtectionPolicy (if present and valid) */
export function getTrafficProtectionMode(
  raw: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy | null | undefined
): TrafficProtectionMode | undefined {
  const mode = raw?.spec?.mode;
  if (mode === 'Observe' || mode === 'Enforce' || mode === 'Disabled') return mode;
  return undefined;
}

/**
 * Transform raw API HttpProxy to domain HttpProxy type.
 * Optionally merge WAF (TrafficProtectionPolicy) mode when provided.
 */
export function toHttpProxy(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy,
  options?: {
    trafficProtectionMode?: TrafficProtectionMode;
  }
): HttpProxy {
  // Type assertion for TLS field until generated types are updated
  const backend = raw.spec?.rules?.[0]?.backends?.[0] as
    | { endpoint?: string; tls?: { hostname?: string } }
    | undefined;

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(raw.metadata.creationTimestamp)
      : new Date(),
    endpoint: backend?.endpoint,
    hostnames: raw.spec?.hostnames,
    tlsHostname: backend?.tls?.hostname,
    status: raw.status,
    chosenName: raw.metadata?.annotations?.['app.kubernetes.io/name'] ?? '',
    ...(options?.trafficProtectionMode !== undefined && {
      trafficProtectionMode: options.trafficProtectionMode,
    }),
  };
}

/**
 * Build a map of proxy name -> WAF mode from a list of TrafficProtectionPolicies.
 */
export function toTrafficProtectionModeMap(
  list: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicyList | null | undefined
): Map<string, TrafficProtectionMode> {
  const map = new Map<string, TrafficProtectionMode>();
  const items = list?.items ?? [];
  for (const policy of items) {
    const name = policy.metadata?.name;
    const mode = getTrafficProtectionMode(policy);
    if (name && mode) map.set(name, mode);
  }
  return map;
}

/**
 * Transform raw API list to domain HttpProxyList.
 * Optionally merge WAF modes from map.
 */
export function toHttpProxyList(
  items: ComDatumapisNetworkingV1AlphaHttpProxy[],
  nextCursor?: string,
  options?: {
    trafficProtectionModeByName?: Map<string, TrafficProtectionMode>;
  }
): HttpProxyList {
  return {
    items: items.map((raw) => {
      const proxyName = raw.metadata?.name ?? '';
      const mode = options?.trafficProtectionModeByName?.get(proxyName);
      return toHttpProxy(raw, { trafficProtectionMode: mode });
    }),
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
  metadata: { name: string; annotations?: Record<string, string> };
  spec: {
    hostnames: string[];
    rules: Array<{ backends: Array<{ endpoint: string; tls?: { hostname: string } }> }>;
  };
} {
  const backend: { endpoint: string; tls?: { hostname: string } } = {
    endpoint: input.endpoint,
  };

  // Add TLS configuration if provided
  if (input.tlsHostname) {
    backend.tls = {
      hostname: input.tlsHostname,
    };
  }

  const annotations: Record<string, string> = {};

  if (input.chosenName) {
    annotations['app.kubernetes.io/name'] = input.chosenName;
  }

  const metadataAnnotations = Object.keys(annotations).length > 0 ? annotations : undefined;

  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    metadata: {
      name: input.name,
      ...(metadataAnnotations ? { annotations: metadataAnnotations } : {}),
    },
    spec: {
      hostnames: input.hostnames ?? [],
      rules: [
        {
          backends: [backend],
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
  metadata?: { annotations: Record<string, string> };
  spec: {
    hostnames: string[];
    rules: Array<{ backends: Array<{ endpoint: string; tls?: { hostname: string } }> }>;
  };
} {
  const backend: { endpoint: string; tls?: { hostname: string } } = {
    endpoint: input.endpoint,
  };

  // Add TLS configuration if provided
  if (input.tlsHostname) {
    backend.tls = {
      hostname: input.tlsHostname,
    };
  }

  const annotations: Record<string, string> = {};

  if (input.chosenName !== undefined) {
    annotations['app.kubernetes.io/name'] = input.chosenName;
  }

  const metadata = Object.keys(annotations).length > 0 ? { annotations } : undefined;

  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    ...(metadata ? { metadata } : {}),
    spec: {
      hostnames: input.hostnames ?? [],
      rules: [
        {
          backends: [backend],
        },
      ],
    },
  };
}
