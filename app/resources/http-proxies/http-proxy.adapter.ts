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
  mode: 'Enforce' | 'Observe' | 'Disabled' = 'Enforce',
  paranoiaLevels?: { blocking?: number; detection?: number }
): ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy {
  const ruleSet: {
    type: 'OWASPCoreRuleSet';
    owaspCoreRuleSet?: {
      paranoiaLevels?: {
        blocking?: number;
        detection?: number;
      };
    };
  } = {
    type: 'OWASPCoreRuleSet',
  };

  if (
    paranoiaLevels &&
    (paranoiaLevels.blocking !== undefined || paranoiaLevels.detection !== undefined)
  ) {
    ruleSet.owaspCoreRuleSet = {
      paranoiaLevels: {
        ...(paranoiaLevels.blocking !== undefined && { blocking: paranoiaLevels.blocking }),
        ...(paranoiaLevels.detection !== undefined && { detection: paranoiaLevels.detection }),
      },
    };
  }

  return {
    apiVersion: 'networking.datumapis.com/v1alpha',
    kind: 'TrafficProtectionPolicy',
    metadata: {
      name: httpProxyName,
    },
    spec: {
      mode: mode,
      ruleSets: [ruleSet],
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

/** Extract paranoia levels from a TrafficProtectionPolicy (if present and valid) */
export function getParanoiaLevels(
  raw: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy | null | undefined
): { blocking?: number; detection?: number } | undefined {
  const owaspRuleSet = raw?.spec?.ruleSets?.find(
    (rs) => rs.type === 'OWASPCoreRuleSet'
  )?.owaspCoreRuleSet;
  const paranoiaLevels = owaspRuleSet?.paranoiaLevels;
  if (!paranoiaLevels) return undefined;

  const result: { blocking?: number; detection?: number } = {};
  if (
    paranoiaLevels.blocking !== undefined &&
    paranoiaLevels.blocking >= 1 &&
    paranoiaLevels.blocking <= 4
  ) {
    result.blocking = paranoiaLevels.blocking;
  }
  if (
    paranoiaLevels.detection !== undefined &&
    paranoiaLevels.detection >= 1 &&
    paranoiaLevels.detection <= 4
  ) {
    result.detection = paranoiaLevels.detection;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Transform raw API HttpProxy to domain HttpProxy type.
 * Optionally merge WAF (TrafficProtectionPolicy) mode and paranoia levels when provided.
 */
export function toHttpProxy(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy,
  options?: {
    trafficProtectionMode?: TrafficProtectionMode;
    paranoiaLevels?: { blocking?: number; detection?: number };
  }
): HttpProxy {
  // Find the backend rule (skip redirect rules which have no backends)
  const backendRule = raw.spec?.rules?.find((rule) => rule.backends && rule.backends.length > 0);
  const backend = backendRule?.backends?.[0] as
    | { endpoint?: string; tls?: { hostname?: string } }
    | undefined;

  // Extract all origins from all backend rules
  const origins: string[] = [];
  if (raw.spec?.rules) {
    for (const rule of raw.spec.rules) {
      if (rule.backends && rule.backends.length > 0) {
        for (const backendItem of rule.backends) {
          if (backendItem.endpoint) {
            origins.push(backendItem.endpoint);
          }
        }
      }
    }
  }

  // Check if HTTP redirect is enabled by looking for a redirect rule
  const hasRedirectRule = raw.spec?.rules?.some(
    (rule) =>
      !rule.backends &&
      rule.filters?.some(
        (filter) =>
          filter.requestRedirect?.scheme === 'https' &&
          (filter.requestRedirect?.statusCode === 301 || filter.requestRedirect?.statusCode === 302)
      )
  );

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(raw.metadata.creationTimestamp)
      : new Date(),
    endpoint: backend?.endpoint,
    origins: origins.length > 0 ? origins : undefined,
    hostnames: raw.spec?.hostnames,
    tlsHostname: backend?.tls?.hostname,
    status: raw.status,
    canonicalHostname: raw.status?.canonicalHostname,
    hostnameStatuses: raw.status?.hostnameStatuses,
    chosenName: raw.metadata?.annotations?.['app.kubernetes.io/name'] ?? '',
    enableHttpRedirect: hasRedirectRule,
    ...(options?.trafficProtectionMode !== undefined && {
      trafficProtectionMode: options.trafficProtectionMode,
    }),
    ...(options?.paranoiaLevels !== undefined && {
      paranoiaLevels: options.paranoiaLevels,
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
 * Build a map of proxy name -> paranoia levels from a list of TrafficProtectionPolicies.
 */
export function toParanoiaLevelsMap(
  list: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicyList | null | undefined
): Map<string, { blocking?: number; detection?: number }> {
  const map = new Map<string, { blocking?: number; detection?: number }>();
  const items = list?.items ?? [];
  for (const policy of items) {
    const name = policy.metadata?.name;
    const paranoiaLevels = getParanoiaLevels(policy);
    if (name && paranoiaLevels) map.set(name, paranoiaLevels);
  }
  return map;
}

/**
 * Transform raw API list to domain HttpProxyList.
 * Optionally merge WAF modes and paranoia levels from maps.
 */
export function toHttpProxyList(
  items: ComDatumapisNetworkingV1AlphaHttpProxy[],
  nextCursor?: string,
  options?: {
    trafficProtectionModeByName?: Map<string, TrafficProtectionMode>;
    paranoiaLevelsByName?: Map<string, { blocking?: number; detection?: number }>;
  }
): HttpProxyList {
  return {
    items: items.map((raw) => {
      const proxyName = raw.metadata?.name ?? '';
      const mode = options?.trafficProtectionModeByName?.get(proxyName);
      const paranoiaLevels = options?.paranoiaLevelsByName?.get(proxyName);
      return toHttpProxy(raw, { trafficProtectionMode: mode, paranoiaLevels });
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
    rules: Array<
      | { backends: Array<{ endpoint: string; tls?: { hostname: string } }> }
      | {
          filters: Array<{
            type: 'RequestRedirect';
            requestRedirect: { scheme: 'https'; statusCode: 301 };
          }>;
        }
    >;
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

  const rules: Array<
    | { backends: Array<{ endpoint: string; tls?: { hostname: string } }> }
    | {
        filters: Array<{
          type: 'RequestRedirect';
          requestRedirect: { scheme: 'https'; statusCode: 301 };
        }>;
      }
  > = [];

  // Add redirect rule first if HTTP redirect is enabled
  if (input.enableHttpRedirect) {
    rules.push({
      filters: [
        {
          type: 'RequestRedirect',
          requestRedirect: {
            scheme: 'https',
            statusCode: 301,
          },
        },
      ],
    });
  }

  // Add backend rule
  rules.push({
    backends: [backend],
  });

  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    metadata: {
      name: input.name,
      ...(metadataAnnotations ? { annotations: metadataAnnotations } : {}),
    },
    spec: {
      hostnames: input.hostnames ?? [],
      rules,
    },
  };
}

type RedirectRule = {
  filters: Array<{
    type: 'RequestRedirect';
    requestRedirect: { scheme: 'https'; statusCode: 301 };
  }>;
};
type BackendRule = {
  backends: Array<{ endpoint: string; tls?: { hostname: string } }>;
};

/**
 * Transform UpdateHttpProxyInput to API merge-patch payload.
 * Only includes `spec` fields that are actually provided so partial
 * updates (e.g. toggling Force HTTPS alone) don't clobber other fields.
 */
export function toUpdateHttpProxyPayload(input: UpdateHttpProxyInput): {
  kind: string;
  apiVersion: string;
  metadata?: { annotations: Record<string, string> };
  spec?: {
    hostnames?: string[];
    rules?: Array<BackendRule | RedirectRule>;
  };
} {
  const annotations: Record<string, string> = {};

  if (input.chosenName !== undefined) {
    annotations['app.kubernetes.io/name'] = input.chosenName;
  }

  const metadata = Object.keys(annotations).length > 0 ? { annotations } : undefined;

  // Only build rules when endpoint or enableHttpRedirect is explicitly provided
  const hasRulesChange = input.endpoint !== undefined || input.enableHttpRedirect !== undefined;

  let spec: { hostnames?: string[]; rules?: Array<BackendRule | RedirectRule> } | undefined;

  if (hasRulesChange || input.hostnames !== undefined) {
    spec = {};

    if (input.hostnames !== undefined) {
      spec.hostnames = input.hostnames;
    }

    if (hasRulesChange) {
      const rules: Array<BackendRule | RedirectRule> = [];

      if (input.enableHttpRedirect) {
        rules.push({
          filters: [
            {
              type: 'RequestRedirect',
              requestRedirect: { scheme: 'https', statusCode: 301 },
            },
          ],
        });
      }

      if (input.endpoint) {
        const backend: { endpoint: string; tls?: { hostname: string } } = {
          endpoint: input.endpoint,
        };
        if (input.tlsHostname) {
          backend.tls = { hostname: input.tlsHostname };
        }
        rules.push({ backends: [backend] });
      }

      spec.rules = rules;
    }
  }

  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    ...(metadata ? { metadata } : {}),
    ...(spec ? { spec } : {}),
  };
}
