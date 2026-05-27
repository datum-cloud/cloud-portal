import type {
  HttpProxy,
  HttpProxyList,
  CreateHttpProxyInput,
  UpdateHttpProxyInput,
  BasicAuthUser,
  ProxyPathRule,
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

type BackendRuleRaw = NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['spec']>['rules'] extends
  | (infer R)[]
  | undefined
  ? R
  : never;

type RuleEditability =
  | { kind: 'simple' }
  | { kind: 'host-only'; hostHeader: string }
  | { kind: 'advanced' };

/**
 * Classify a single backend rule by whether the portal form can represent it.
 *
 * A rule is editable when it has:
 * - exactly one backend with no backend-level filters
 * - either zero rule-level filters (`simple`), or exactly one
 *   requestHeaderModifier filter that sets a single `Host` header (`host-only`)
 *
 * Anything else is `advanced` — the portal renders a read-only banner.
 *
 * Matches are not inspected here; path/match validation is the catch-all
 * detection's job.
 */
function classifyBackendRule(rule: BackendRuleRaw): RuleEditability {
  if (!rule.backends || rule.backends.length !== 1) return { kind: 'advanced' };
  const backendLevelFilters = (rule.backends[0] as { filters?: unknown[] }).filters;
  if (backendLevelFilters && backendLevelFilters.length > 0) return { kind: 'advanced' };

  const filters = rule.filters ?? [];
  if (filters.length === 0) return { kind: 'simple' };
  if (filters.length > 1) return { kind: 'advanced' };

  const filter = filters[0];
  if (!filter.requestHeaderModifier) return { kind: 'advanced' };
  const rhm = filter.requestHeaderModifier;
  if ((rhm.add && rhm.add.length > 0) || (rhm.remove && rhm.remove.length > 0)) {
    return { kind: 'advanced' };
  }
  const setHeaders = rhm.set ?? [];
  if (setHeaders.length !== 1) return { kind: 'advanced' };
  if (setHeaders[0].name.toLowerCase() !== 'host') return { kind: 'advanced' };
  return { kind: 'host-only', hostHeader: setHeaders[0].value };
}

/**
 * Decide which `spec.rules[]` entry is the catch-all.
 *
 * Convention (per the datumctl path-routing wiki): the catch-all is the rule
 * that matches `PathPrefix /` and sits last. We accept a rule with no `matches`
 * block as a catch-all too (Gateway API treats it as PathPrefix `/`). When
 * several candidates exist we take the last one, matching the documented
 * convention; when none exist we fall back to the last backend rule so callers
 * still get a sensible default origin.
 *
 * Returns the index into the backend-rules array, or -1 when there are none.
 */
function pickCatchAllIndex(backendRules: BackendRuleRaw[]): number {
  let lastCatchAll = -1;
  for (let i = 0; i < backendRules.length; i++) {
    const matches = backendRules[i].matches;
    if (!matches || matches.length === 0) {
      lastCatchAll = i;
      continue;
    }
    if (
      matches.length === 1 &&
      matches[0].path?.type === 'PathPrefix' &&
      matches[0].path?.value === '/' &&
      !matches[0].headers?.length
    ) {
      lastCatchAll = i;
    }
  }
  if (lastCatchAll !== -1) return lastCatchAll;
  return backendRules.length > 0 ? backendRules.length - 1 : -1;
}

/**
 * Validate that a non-catch-all rule's matches block is one the form supports:
 * exactly one path match (Exact or PathPrefix) and no header matches.
 */
function parseExtraPathMatch(
  rule: BackendRuleRaw
): { type: 'Exact' | 'PathPrefix'; value: string } | null {
  const matches = rule.matches ?? [];
  if (matches.length !== 1) return null;
  const m = matches[0];
  if (m.headers && m.headers.length > 0) return null;
  const path = m.path;
  if (!path || !path.value) return null;
  if (path.type !== 'Exact' && path.type !== 'PathPrefix') return null;
  return { type: path.type, value: path.value };
}

export function classifyHttpProxyComplexity(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): HttpProxyComplexity {
  const rules = raw.spec?.rules ?? [];
  const backendRules = rules.filter(
    (r): r is BackendRuleRaw & { backends: NonNullable<BackendRuleRaw['backends']> } =>
      !!r.backends && r.backends.length > 0
  );

  if (backendRules.length === 0) return 'simple';

  const catchAllIdx = pickCatchAllIndex(backendRules);
  let sawHostHeader = false;

  for (let i = 0; i < backendRules.length; i++) {
    const rule = backendRules[i];
    const ruleClass = classifyBackendRule(rule);
    if (ruleClass.kind === 'advanced') return 'advanced';
    if (ruleClass.kind === 'host-only') sawHostHeader = true;

    if (i !== catchAllIdx) {
      // Non-catch-all rules must have a form-representable single path match.
      if (!parseExtraPathMatch(rule)) return 'advanced';
    }
  }

  return sawHostHeader ? 'host-only' : 'simple';
}

/**
 * Validate a Host header override value.
 *
 * Returns null if valid, or a user-facing error string if invalid.
 *
 * The Host header is forwarded verbatim by Envoy to the upstream, so it must
 * be a single literal hostname. Wildcards (e.g. `*.example.com`) belong in
 * `spec.hostnames` (route matching) but are meaningless in a Host header:
 * no upstream certificate or virtual host can match a wildcard literal.
 *
 * IP literals (IPv4 and bracketed IPv6) are technically permitted by RFC 7230
 * but rejected here: upstream TLS certificates and virtual hosts cannot match
 * an IP literal in the Host header, so the request would fail in practice.
 *
 * Rules (per spec FR-5 and ui-patterns):
 * - Empty / whitespace-only → valid (means "no override").
 * - Whitespace-only (non-empty after trim) → error.
 * - Contains internal whitespace → error.
 * - Contains a wildcard (`*`) → error.
 * - Bare IPv4 (\d{1,3}(\.\d{1,3}){3}) → error (TLS cert won't match an IP).
 * - Bare or bracketed IPv6 → error (TLS cert won't match an IP).
 * - Exceeds 253 characters → error.
 * - Illegal characters (not RFC 1123 hostname + optional port) → error.
 * - Valid: localhost, RFC 1123 hostnames, hostname:port.
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

  // Wildcards: a Host header must be a single literal hostname. Wildcards
  // belong in spec.hostnames, not here — upstream certs and virtual hosts
  // cannot match a wildcard literal.
  if (value.includes('*')) {
    return 'Wildcards are not valid in a Host header. Enter a single literal hostname such as api.example.com.';
  }

  // Bare IPv6: contains '::' or is wrapped in '[...]' — check before port stripping
  // so that '::1' (which port-strip would parse as host=':' + port='1') is caught here.
  // IP literals are technically valid per RFC 7230 but no upstream TLS cert or
  // virtual host can match an IP, so the request would fail in practice.
  if (value.includes('::') || value.startsWith('[')) {
    return 'Upstream TLS certificates will not match an IP. Use a hostname such as localhost or api.example.internal.';
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

  // Bare IPv4: exactly four dot-separated numeric groups (no TLD).
  // IP literals are technically valid per RFC 7230 but no upstream TLS cert or
  // virtual host can match an IP, so the request would fail in practice.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostPart)) {
    return 'Upstream TLS certificates will not match an IP. Use a hostname such as localhost or api.example.internal.';
  }

  // Length check (on the full value including port)
  if (value.length > 253) {
    return 'Hostnames must be 253 characters or fewer.';
  }

  // RFC 1123 hostname validation: labels are [a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?
  const labelRe = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  const labels = hostPart.split('.');
  const allLabelsValid = labels.every((label) => label === 'localhost' || labelRe.test(label));
  if (!allLabelsValid || hostPart === '') {
    return 'Enter a valid hostname (letters, numbers, hyphens, and dots only).';
  }

  return null;
}

/**
 * Pick the rule that represents the default (catch-all) backend.
 *
 * Resolves to the same rule the rest of the form treats as "the proxy's
 * origin": its endpoint, Host header, TLS hostname, and connector all come
 * from here. Non-catch-all rules with backends are surfaced as
 * `HttpProxy.extraPaths`.
 */
export function getCatchAllBackendRule(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): BackendRuleRaw | undefined {
  const backendRules = (raw.spec?.rules ?? []).filter(
    (r): r is BackendRuleRaw & { backends: NonNullable<BackendRuleRaw['backends']> } =>
      !!r.backends && r.backends.length > 0
  );
  if (backendRules.length === 0) return undefined;
  const idx = pickCatchAllIndex(backendRules);
  return idx >= 0 ? backendRules[idx] : undefined;
}

/**
 * Extract the Host header value from the catch-all rule's filters.
 * Matches case-insensitively per RFC 7230.
 * Returns empty string if no Host filter is present.
 */
export function extractHostHeader(raw: ComDatumapisNetworkingV1AlphaHttpProxy): string {
  const backendRule = getCatchAllBackendRule(raw);
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
  // Find the catch-all backend rule (its endpoint/host header/TLS map onto
  // the top-level form fields). Non-catch-all backend rules become extraPaths.
  const allBackendRules = (raw.spec?.rules ?? []).filter(
    (rule): rule is BackendRuleRaw & { backends: NonNullable<BackendRuleRaw['backends']> } =>
      !!rule.backends && rule.backends.length > 0
  );
  const catchAllIdx = pickCatchAllIndex(allBackendRules);
  const backendRule = catchAllIdx >= 0 ? allBackendRules[catchAllIdx] : undefined;
  const backend = backendRule?.backends?.[0] as
    | { endpoint?: string; tls?: { hostname?: string }; connector?: { name: string } }
    | undefined;

  // Extract all origins from all backend rules
  const origins: string[] = [];
  for (const rule of allBackendRules) {
    for (const backendItem of rule.backends) {
      if (backendItem.endpoint) origins.push(backendItem.endpoint);
    }
  }

  // Build extraPaths from every backend rule that isn't the catch-all.
  // classifyHttpProxyComplexity guarantees these parse cleanly when the
  // complexity is editable; when it's 'advanced' we still surface what we can
  // so the read-only view has something to render.
  const extraPaths: ProxyPathRule[] = [];
  for (let i = 0; i < allBackendRules.length; i++) {
    if (i === catchAllIdx) continue;
    const rule = allBackendRules[i];
    const match = parseExtraPathMatch(rule);
    if (!match) continue;
    const ruleBackend = rule.backends[0] as
      | { endpoint?: string; tls?: { hostname?: string }; connector?: { name: string } }
      | undefined;
    if (!ruleBackend?.endpoint) continue;
    let perRuleHostHeader: string | undefined;
    for (const filter of rule.filters ?? []) {
      const setHeaders = filter.requestHeaderModifier?.set ?? [];
      const hostEntry = setHeaders.find((h) => h.name.toLowerCase() === 'host');
      if (hostEntry) {
        perRuleHostHeader = hostEntry.value;
        break;
      }
    }
    extraPaths.push({
      ...(rule.name ? { name: rule.name } : {}),
      match,
      endpoint: ruleBackend.endpoint,
      ...(ruleBackend.tls?.hostname && { tlsHostname: ruleBackend.tls.hostname }),
      ...(perRuleHostHeader && { hostHeader: perRuleHostHeader }),
      ...(ruleBackend.connector && { connector: ruleBackend.connector }),
    });
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
    ...(extraPaths.length > 0 && { extraPaths }),
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
  name?: string;
  matches?: Array<{ path?: { type: 'Exact' | 'PathPrefix'; value: string } }>;
  backends: Array<{ endpoint: string; tls?: { hostname: string }; connector?: { name: string } }>;
  filters?: Array<{
    type: 'RequestHeaderModifier';
    requestHeaderModifier: { set: Array<{ name: string; value: string }> };
  }>;
};

/**
 * Serialize a domain-level ProxyPathRule into an API backend rule.
 */
function extraPathToBackendRule(path: ProxyPathRule): BackendRule {
  const backend: BackendRule['backends'][0] = {
    endpoint: path.endpoint,
    ...(path.tlsHostname && { tls: { hostname: path.tlsHostname } }),
    ...(path.connector && { connector: path.connector }),
  };
  const filters: BackendRule['filters'] = [];
  const trimmedHostHeader = path.hostHeader?.trim();
  if (trimmedHostHeader) {
    filters.push({
      type: 'RequestHeaderModifier',
      requestHeaderModifier: { set: [{ name: 'Host', value: trimmedHostHeader }] },
    });
  }
  return {
    ...(path.name ? { name: path.name } : {}),
    matches: [{ path: { type: path.match.type, value: path.match.value } }],
    backends: [backend],
    ...(filters.length > 0 && { filters }),
  };
}

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
    input.hostHeader !== undefined ||
    input.extraPaths !== undefined;

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

      // Extra paths sit between the optional redirect rule and the catch-all
      // backend rule. Explicit input (including []) replaces; undefined keeps
      // the proxy's current extras.
      const effectiveExtraPaths = input.extraPaths ?? currentProxy?.extraPaths ?? [];
      for (const path of effectiveExtraPaths) {
        rules.push(extraPathToBackendRule(path));
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
