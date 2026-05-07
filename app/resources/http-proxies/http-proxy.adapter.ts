import type {
  HttpProxy,
  HttpProxyList,
  CreateHttpProxyInput,
  UpdateHttpProxyInput,
  BasicAuthUser,
} from './http-proxy.schema';
import type { TrafficProtectionMode } from './http-proxy.schema';
import {
  type ComDatumapisNetworkingV1AlphaHttpProxy,
  type ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy,
  type ComDatumapisNetworkingV1AlphaTrafficProtectionPolicyList,
} from '@/modules/control-plane/networking';

/**
 * Classify the complexity of an HTTPProxy resource for portal rendering.
 *
 * - 'simple':    No rule-level filters on the backend rule (or no backend rules).
 *                Portal renders the full form without a host header value.
 * - 'host-only': The backend rule (rule 0 with backends) has exactly one filter:
 *                a requestHeaderModifier that sets exactly one header whose name
 *                is 'host' (case-insensitive), with no add/remove operations.
 *                Portal renders the full form with the hostHeader field populated.
 * - 'advanced':  Any other filter combination (multiple filters, non-Host header,
 *                multiple set entries, add/remove, backend-level filters, or
 *                multiple backend rules). Portal renders a read-only banner.
 */
export type HttpProxyComplexity = 'simple' | 'host-only' | 'advanced';

export function classifyHttpProxyComplexity(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): HttpProxyComplexity {
  const rules = raw.spec?.rules ?? [];

  // Find the backend rule (has backends). Redirect rules are benign and ignored.
  const backendRules = rules.filter((r) => r.backends && r.backends.length > 0);

  // Multiple backend rules → advanced
  if (backendRules.length > 1) return 'advanced';

  const backendRule = backendRules[0];
  if (!backendRule) return 'simple';

  // Any backend-level filter → advanced
  if (
    backendRule.backends?.some((b) => {
      const bf = (b as { filters?: unknown[] }).filters;
      return bf && bf.length > 0;
    })
  ) {
    return 'advanced';
  }

  const filters = backendRule.filters ?? [];

  // No rule-level filters → simple
  if (filters.length === 0) return 'simple';

  // More than one rule-level filter → advanced
  if (filters.length > 1) return 'advanced';

  const filter = filters[0];

  // Filter is not a requestHeaderModifier → advanced
  if (!filter.requestHeaderModifier) return 'advanced';

  const rhm = filter.requestHeaderModifier;

  // requestHeaderModifier has add or remove → advanced
  if ((rhm.add && rhm.add.length > 0) || (rhm.remove && rhm.remove.length > 0)) {
    return 'advanced';
  }

  const setHeaders = rhm.set ?? [];

  // Not exactly one set header → advanced
  if (setHeaders.length !== 1) return 'advanced';

  // The one set header is not 'host' (case-insensitive) → advanced
  if (setHeaders[0].name.toLowerCase() !== 'host') return 'advanced';

  return 'host-only';
}

/**
 * Validate a Host header override value.
 *
 * Returns null if valid, or a user-facing error string if invalid.
 *
 * Rules (per spec FR-5 and ui-patterns):
 * - Empty / whitespace-only → valid (means "no override").
 * - Whitespace-only (non-empty after trim) → error.
 * - Contains internal whitespace → error.
 * - Bare IPv4 (\d{1,3}(\.\d{1,3}){3}) → error.
 * - Bare IPv6 (contains '::' or wrapped in '[') → error.
 * - Exceeds 253 characters → error.
 * - Illegal characters (not RFC 1123 hostname + optional port) → error.
 * - Valid: localhost, *.localhost, *.internal, RFC 1123 hostnames, hostname:port.
 */
export function validateHostHeader(value: string): string | null {
  // Empty is valid (passthrough)
  if (!value) return null;

  // Whitespace-only
  if (value.trim() === '') {
    return 'Enter a hostname or leave the field blank.';
  }

  // Internal whitespace
  if (/\s/.test(value)) {
    return 'Hostnames cannot contain spaces.';
  }

  // Bare IPv6: contains '::' or is wrapped in '[...]' — check before port stripping
  // so that '::1' (which port-strip would parse as host=':' + port='1') is caught here.
  if (value.includes('::') || value.startsWith('[')) {
    return 'IP addresses are not valid Host header values. Use a hostname such as localhost or api.example.internal.';
  }

  // Separate optional port suffix (hostname:port)
  let hostPart = value;
  const portMatch = value.match(/^(.+):(\d{1,5})$/);
  if (portMatch) {
    const portNum = Number(portMatch[2]);
    if (portNum >= 1 && portNum <= 65535) {
      hostPart = portMatch[1];
    }
    // If port is out of range, fall through to character validation
  }

  // Bare IPv4: exactly four dot-separated numeric groups (no TLD)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostPart)) {
    return 'IP addresses are not valid Host header values. Use a hostname such as localhost or api.example.internal.';
  }

  // Length check (on the full value including port)
  if (value.length > 253) {
    return 'Hostnames must be 253 characters or fewer.';
  }

  // RFC 1123 hostname validation: labels are [a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?
  // Wildcards (*) are permitted as the leading label only.
  // hostPart may be dotted labels, with an optional leading '*.'
  const normalised = hostPart.startsWith('*.') ? hostPart.slice(2) : hostPart;
  const labelRe = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  const labels = normalised.split('.');
  const allLabelsValid = labels.every(
    (label) => label === 'localhost' || labelRe.test(label) || label === '*'
  );
  if (!allLabelsValid || normalised === '') {
    return 'Enter a valid hostname (letters, numbers, hyphens, and dots only).';
  }

  return null;
}

/**
 * Extract the Host header value from an HTTPProxy resource's rule-0 filters.
 * Matches case-insensitively per RFC 7230.
 * Returns empty string if no Host filter is present.
 */
export function extractHostHeader(raw: ComDatumapisNetworkingV1AlphaHttpProxy): string {
  const backendRule = raw.spec?.rules?.find((r) => r.backends && r.backends.length > 0);
  const filters = backendRule?.filters ?? [];
  for (const filter of filters) {
    const setHeaders = filter.requestHeaderModifier?.set ?? [];
    const hostEntry = setHeaders.find((h) => h.name.toLowerCase() === 'host');
    if (hostEntry) return hostEntry.value;
  }
  return '';
}

/**
 * Generate htpasswd file content from a list of users using SHA1 hashing.
 * Uses the Web Crypto API (available in Node.js 15+, Bun, and browsers).
 */
export async function generateHtpasswd(users: BasicAuthUser[]): Promise<string> {
  const lines = await Promise.all(
    users.map(async (u) => {
      const data = new TextEncoder().encode(u.password);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-1', data);
      const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      return `${u.username}:{SHA}${hashBase64}`;
    })
  );
  return lines.join('\n');
}

/**
 * Build a SecurityPolicy body targeting the Gateway backing the HTTP proxy.
 * Policy name matches the proxy name for 1:1 lifecycle.
 * The basicAuth.users field references the Secret `{httpProxyName}-basic-auth`.
 */
export function toSecurityPolicyPayload(httpProxyName: string): object {
  return {
    apiVersion: 'gateway.envoyproxy.io/v1alpha1',
    kind: 'SecurityPolicy',
    metadata: {
      name: httpProxyName,
    },
    spec: {
      targetRefs: [
        {
          group: 'gateway.networking.k8s.io',
          kind: 'Gateway',
          name: httpProxyName,
        },
      ],
      basicAuth: {
        users: {
          name: `${httpProxyName}-basic-auth`,
        },
      },
    },
  };
}

/**
 * Parse usernames from a Kubernetes Secret containing an htpasswd file.
 * The Secret's data['.htpasswd'] is base64-encoded; each line is "username:hash".
 */
export function parseHtpasswdUsernames(secret: unknown): string[] {
  const encoded = (secret as { data?: { '.htpasswd'?: string } } | null)?.data?.['.htpasswd'];
  if (!encoded) return [];
  try {
    const content = atob(encoded);
    return content
      .split('\n')
      .map((line) => line.split(':')[0])
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Extract basic auth state from a SecurityPolicy resource.
 * Returns enabled: false when the argument is null/undefined (404 case).
 * Pass usernames parsed from the associated htpasswd Secret to populate counts.
 */
export function getBasicAuthState(
  securityPolicy: unknown,
  usernames: string[] = []
): {
  enabled: boolean;
  userCount: number;
  usernames: string[];
} {
  if (!securityPolicy) {
    return { enabled: false, userCount: 0, usernames: [] };
  }
  return { enabled: true, userCount: usernames.length, usernames };
}

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
    basicAuth?: { enabled: boolean; userCount: number; usernames: string[] };
  }
): HttpProxy {
  // Find the backend rule (skip redirect rules which have no backends)
  const backendRule = raw.spec?.rules?.find((rule) => rule.backends && rule.backends.length > 0);
  const backend = backendRule?.backends?.[0] as
    | { endpoint?: string; tls?: { hostname?: string }; connector?: { name: string } }
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

  // Check if HTTP redirect is enabled by looking for a redirect rule.
  // Rule has no backends (undefined or []) and a filter that redirects to HTTPS (301/302).
  const hasRedirectRule = raw.spec?.rules?.some((rule) => {
    const noBackends = !rule.backends || rule.backends.length === 0;
    if (!noBackends || !rule.filters?.length) return false;
    return rule.filters.some((filter) => {
      const redirect = filter.requestRedirect;
      if (!redirect || redirect.scheme !== 'https') return false;
      const code = Number(redirect.statusCode);
      return code === 301 || code === 302;
    });
  });

  // Extract Host header from rule-level filters (case-insensitive per RFC 7230)
  const hostHeader = extractHostHeader(raw);

  // FR-4: classify the underlying resource so callers can decide between
  // editable form and read-only banner without re-reading the raw resource.
  const complexity = classifyHttpProxyComplexity(raw);

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
    ...(hostHeader && { hostHeader }),
    complexity,
    status: raw.status,
    canonicalHostname: raw.status?.canonicalHostname,
    hostnameStatuses: raw.status?.hostnameStatuses,
    chosenName: raw.metadata?.annotations?.['app.kubernetes.io/name'] ?? '',
    enableHttpRedirect: hasRedirectRule,
    ...(backend?.connector && { connector: backend.connector }),
    ...(options?.trafficProtectionMode !== undefined && {
      trafficProtectionMode: options.trafficProtectionMode,
    }),
    ...(options?.paranoiaLevels !== undefined && {
      paranoiaLevels: options.paranoiaLevels,
    }),
    ...(options?.basicAuth !== undefined && {
      basicAuthEnabled: options.basicAuth.enabled,
      basicAuthUserCount: options.basicAuth.userCount,
      basicAuthUsernames: options.basicAuth.usernames,
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
    basicAuthByName?: Map<string, { enabled: boolean; userCount: number; usernames: string[] }>;
  }
): HttpProxyList {
  return {
    items: items.map((raw) => {
      const proxyName = raw.metadata?.name ?? '';
      const mode = options?.trafficProtectionModeByName?.get(proxyName);
      const paranoiaLevels = options?.paranoiaLevelsByName?.get(proxyName);
      const basicAuth = options?.basicAuthByName?.get(proxyName);
      return toHttpProxy(raw, {
        trafficProtectionMode: mode,
        paranoiaLevels,
        ...(basicAuth !== undefined && { basicAuth }),
      });
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
      | {
          backends: Array<{ endpoint: string; tls?: { hostname: string } }>;
          filters?: Array<{
            type: 'RequestHeaderModifier';
            requestHeaderModifier: { set: Array<{ name: string; value: string }> };
          }>;
        }
      | {
          matches?: Array<{
            path?: { type: 'PathPrefix'; value: string };
            headers?: Array<{ name: string; type: 'Exact'; value: string }>;
          }>;
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
    ...(input.tlsHostname && { tls: { hostname: input.tlsHostname } }),
  };

  const annotations: Record<string, string> = {};

  if (input.chosenName) {
    annotations['app.kubernetes.io/name'] = input.chosenName;
  }

  const metadataAnnotations = Object.keys(annotations).length > 0 ? annotations : undefined;

  // Build rule-level filters for the backend rule
  const backendRuleFilters: Array<{
    type: 'RequestHeaderModifier';
    requestHeaderModifier: {
      set: Array<{ name: string; value: string }>;
    };
  }> = [];

  const trimmedHostHeader = input.hostHeader?.trim();
  if (trimmedHostHeader) {
    backendRuleFilters.push({
      type: 'RequestHeaderModifier',
      requestHeaderModifier: {
        set: [{ name: 'Host', value: trimmedHostHeader }],
      },
    });
  }

  const rules: Array<
    | {
        backends: Array<{ endpoint: string; tls?: { hostname: string } }>;
        filters?: Array<{
          type: 'RequestHeaderModifier';
          requestHeaderModifier: { set: Array<{ name: string; value: string }> };
        }>;
      }
    | {
        matches?: Array<{
          path?: { type: 'PathPrefix'; value: string };
          headers?: Array<{ name: string; type: 'Exact'; value: string }>;
        }>;
        filters: Array<{
          type: 'RequestRedirect';
          requestRedirect: { scheme: 'https'; statusCode: 301 };
        }>;
      }
  > = [];

  // Force HTTPS: redirect only when request was received as HTTP (x-forwarded-proto: http) to avoid redirect loops behind TLS-terminating load balancers.
  if (input.enableHttpRedirect) {
    rules.push({
      matches: [
        {
          path: { type: 'PathPrefix', value: '/' },
          headers: [{ name: 'x-forwarded-proto', type: 'Exact', value: 'http' }],
        },
      ],
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

  // Add backend rule (with optional Host header filter)
  rules.push({
    backends: [backend],
    ...(backendRuleFilters.length > 0 && { filters: backendRuleFilters }),
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
  matches?: Array<{
    path?: { type: 'PathPrefix'; value: string };
    headers?: Array<{ name: string; type: 'Exact'; value: string }>;
  }>;
  filters: Array<{
    type: 'RequestRedirect';
    requestRedirect: { scheme: 'https'; statusCode: 301 };
  }>;
};
type BackendRule = {
  backends: Array<{ endpoint: string; tls?: { hostname: string }; connector?: { name: string } }>;
  filters?: Array<{
    type: 'RequestHeaderModifier';
    requestHeaderModifier: { set: Array<{ name: string; value: string }> };
  }>;
};

/**
 * Transform UpdateHttpProxyInput to API merge-patch payload.
 *
 * When `currentProxy` is provided, its values are used as defaults so that
 * callers only need to pass the fields they're changing. This prevents
 * accidental removal of fields like `connector` or `tls` that the caller
 * didn't intend to touch.
 */
export function toUpdateHttpProxyPayload(
  input: UpdateHttpProxyInput,
  currentProxy?: HttpProxy
): {
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

  const hasRulesChange =
    input.endpoint !== undefined ||
    input.enableHttpRedirect !== undefined ||
    input.hostHeader !== undefined;

  let spec: { hostnames?: string[]; rules?: Array<BackendRule | RedirectRule> } | undefined;

  if (hasRulesChange || input.hostnames !== undefined) {
    spec = {};

    if (input.hostnames !== undefined) {
      spec.hostnames = input.hostnames;
    }

    if (hasRulesChange) {
      const rules: Array<BackendRule | RedirectRule> = [];

      const effectiveRedirect = input.enableHttpRedirect ?? currentProxy?.enableHttpRedirect;
      if (effectiveRedirect) {
        rules.push({
          matches: [
            {
              path: { type: 'PathPrefix', value: '/' },
              headers: [{ name: 'x-forwarded-proto', type: 'Exact', value: 'http' }],
            },
          ],
          filters: [
            {
              type: 'RequestRedirect',
              requestRedirect: { scheme: 'https', statusCode: 301 },
            },
          ],
        });
      }

      const effectiveEndpoint = input.endpoint ?? currentProxy?.endpoint;
      if (effectiveEndpoint) {
        const effectiveTls = input.tlsHostname ?? currentProxy?.tlsHostname;

        // Determine effective host header: explicit input > current proxy value
        // A defined-but-empty string in input means "clear the host header"
        const effectiveHostHeader =
          input.hostHeader !== undefined
            ? input.hostHeader.trim()
            : (currentProxy?.hostHeader?.trim() ?? '');

        const backendFilters: BackendRule['filters'] = [];
        if (effectiveHostHeader) {
          backendFilters.push({
            type: 'RequestHeaderModifier',
            requestHeaderModifier: {
              set: [{ name: 'Host', value: effectiveHostHeader }],
            },
          });
        }

        const backend: BackendRule['backends'][0] = {
          endpoint: effectiveEndpoint,
          ...(effectiveTls && { tls: { hostname: effectiveTls } }),
          ...(currentProxy?.connector && { connector: currentProxy.connector }),
        };
        rules.push({
          backends: [backend],
          ...(backendFilters.length > 0 && { filters: backendFilters }),
        });
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
