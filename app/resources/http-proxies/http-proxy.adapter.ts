import type {
  HttpProxy,
  HttpProxyList,
  CreateHttpProxyInput,
  UpdateHttpProxyInput,
  BasicAuthUser,
  ProxyBackend,
  ProxyBackendKind,
  ProxyLoadBalancer,
  ProxyRoute,
} from './http-proxy.schema';
import type { TrafficProtectionMode, WafRuleExclusions } from './http-proxy.schema';
import { buildAttachmentMapsFromPolicies } from './http-proxy.waf-attach';
import {
  type ComDatumapisNetworkingV1AlphaHttpProxy,
  type ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy,
  type ComDatumapisNetworkingV1AlphaTrafficProtectionPolicyList,
} from '@/modules/control-plane/networking';

/** Response header the portal manages for HSTS. Matched case-insensitively. */
export const HSTS_HEADER = 'Strict-Transport-Security';
/** One year, the value the TLS card writes. */
export const HSTS_HEADER_VALUE = 'max-age=31536000';

type RuleFilter = NonNullable<
  NonNullable<
    NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['spec']>['rules']
  >[number]['filters']
>[number];

/**
 * True for the one filter shape the portal writes for the Host header
 * override: a requestHeaderModifier that only `set`s a single `Host` entry.
 */
function isPortalHostHeaderFilter(filter: RuleFilter): boolean {
  const rhm = filter.requestHeaderModifier;
  if (!rhm) return false;
  if ((rhm.add && rhm.add.length > 0) || (rhm.remove && rhm.remove.length > 0)) return false;
  const set = rhm.set ?? [];
  return set.length === 1 && set[0].name.toLowerCase() === 'host';
}

/**
 * True for the one filter shape the portal writes for HSTS: a
 * responseHeaderModifier that only `set`s a single `Strict-Transport-Security`.
 */
function isPortalHstsFilter(filter: RuleFilter): boolean {
  const rhm = filter.responseHeaderModifier;
  if (!rhm) return false;
  if ((rhm.add && rhm.add.length > 0) || (rhm.remove && rhm.remove.length > 0)) return false;
  const set = rhm.set ?? [];
  return set.length === 1 && set[0].name.toLowerCase() === HSTS_HEADER.toLowerCase();
}

/** A rule as it arrives from the API, before we know which shape it is. */
type RawRule = {
  backends?: Array<Record<string, unknown>>;
  filters?: RuleFilter[];
  matches?: unknown[];
  [key: string]: unknown;
};

/**
 * True for the force-HTTPS rule the portal synthesizes: no backends, plus a
 * filter redirecting to https with a 301/302.
 */
export function isPortalRedirectRule(rule: RawRule): boolean {
  if (rule.backends && rule.backends.length > 0) return false;
  return (rule.filters ?? []).some((filter) => {
    const redirect = filter.requestRedirect;
    if (!redirect || redirect.scheme !== 'https') return false;
    const code = Number(redirect.statusCode);
    return code === 301 || code === 302;
  });
}

/** True when a rule carries at least one backend. */
function ruleHasBackends(rule: RawRule): boolean {
  return !!rule.backends && rule.backends.length > 0;
}

/**
 * Filter types the route editor understands well enough to leave a rule
 * editable. Anything else means the rule is doing something the portal did
 * not write, so the Backends tab shows it read-only rather than risk a write
 * that reorders or drops it.
 */
const KNOWN_RULE_FILTER_TYPES = new Set(['RequestHeaderModifier', 'ResponseHeaderModifier']);

/** The API's default when `weight` is unset. */
const DEFAULT_BACKEND_WEIGHT = 1;

/** Which of the four mutually exclusive backend kinds this backend is. */
function backendKind(backend: Record<string, unknown>): ProxyBackendKind {
  if (backend.networkService) return 'networkService';
  if (backend.instance) return 'instance';
  // Checked after instance/networkService because a connector backend also
  // carries `endpoint` — there it is the tunnel's target, not a direct origin.
  if (backend.connector) return 'connector';
  return 'endpoint';
}

function toProxyBackend(
  backend: Record<string, unknown>,
  ruleIndex: number,
  backendIndex: number
): ProxyBackend {
  const kind = backendKind(backend);
  const tls = backend.tls as { hostname?: string } | undefined;
  const ns = backend.networkService as { name?: string; port?: string } | undefined;
  const connector = backend.connector as { name?: string } | undefined;
  const instance = backend.instance as { name?: string; port?: number } | undefined;
  const ownFilters = backend.filters as unknown[] | undefined;

  return {
    key: `${ruleIndex}:${backendIndex}`,
    kind,
    ...(typeof backend.endpoint === 'string' && backend.endpoint
      ? { endpoint: backend.endpoint }
      : {}),
    ...(ns?.name ? { networkService: { name: ns.name, port: ns.port ?? '' } } : {}),
    ...(connector?.name ? { connector: { name: connector.name } } : {}),
    ...(instance?.name ? { instance: { name: instance.name, port: instance.port ?? 0 } } : {}),
    ...(tls?.hostname ? { tlsHostname: tls.hostname } : {}),
    weight: typeof backend.weight === 'number' ? backend.weight : DEFAULT_BACKEND_WEIGHT,
    // A backend-level filter is scoped to this backend alone and the editor has
    // no field for it, so editing the backend would have to drop or guess it.
    editable:
      (kind === 'endpoint' || kind === 'networkService') && !(ownFilters && ownFilters.length > 0),
  };
}

/**
 * Whether the route editor can represent this rule's matches. It writes a
 * single path match and nothing else, so one match carrying only a `path` is
 * the editable shape; several matches, or a match that also keys off method,
 * headers or query params, is not.
 */
function hasEditableMatches(matches: unknown[] | undefined): boolean {
  // The API defaults absent matches to a single PathPrefix '/', which is the
  // simplest editable shape there is.
  if (!matches || matches.length === 0) return true;
  if (matches.length > 1) return false;
  const only = matches[0] as Record<string, unknown>;
  return Object.keys(only).every((k) => k === 'path');
}

function toProxyRoute(rule: RawRule, ruleIndex: number): ProxyRoute {
  const isRedirect = isPortalRedirectRule(rule);
  const path = (rule.matches?.[0] as { path?: { type?: string; value?: string } } | undefined)
    ?.path;

  const unknownFilter = (rule.filters ?? []).some(
    (f) => !KNOWN_RULE_FILTER_TYPES.has(String((f as { type?: unknown }).type))
  );

  return {
    key: `rule:${ruleIndex}`,
    ruleIndex,
    ...(typeof rule.name === 'string' && rule.name ? { name: rule.name } : {}),
    ...(path?.type ? { pathType: path.type as ProxyRoute['pathType'] } : {}),
    ...(path?.value !== undefined ? { path: path.value } : {}),
    isRedirect,
    // The redirect rule is portal-synthesized and edited through the Force
    // HTTPS toggle, not here, so it is never treated as editable.
    readOnly: isRedirect || unknownFilter || !hasEditableMatches(rule.matches),
    backends: (rule.backends ?? []).map((b, i) => toProxyBackend(b, ruleIndex, i)),
  };
}

/** Structured per-rule view of `spec.rules` for the Backends tab. */
export function toProxyRoutes(raw: ComDatumapisNetworkingV1AlphaHttpProxy): ProxyRoute[] {
  return (raw.spec?.rules ?? []).map((rule, i) => toProxyRoute(rule as RawRule, i));
}

/** Read `spec.loadBalancer`, or undefined when the proxy leaves it to Envoy. */
export function toProxyLoadBalancer(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): ProxyLoadBalancer | undefined {
  const lb = raw.spec?.loadBalancer;
  if (!lb?.type) return undefined;
  return {
    type: lb.type,
    ...(lb.consistentHash?.type
      ? {
          consistentHash: {
            type: lb.consistentHash.type,
            ...(lb.consistentHash.header ? { header: lb.consistentHash.header } : {}),
          },
        }
      : {}),
  };
}

/**
 * Classify what the flat Configuration surfaces (TLS card, security card) can
 * safely edit on this proxy.
 *
 * Scope note: this describes the *flat* model — one origin on one rule — not
 * the whole resource. Multiplicity is deliberately not a factor any more.
 * Extra rules and extra backends used to force 'advanced' because writes
 * rebuilt spec.rules and would have destroyed them; writes now splice, so a
 * five-backend pool survives a Host header edit and there is nothing to
 * protect against. The Backends tab is what represents that multiplicity, and
 * per-route/per-backend flags there carry the finer-grained story.
 *
 * What still forces 'advanced' is content the flat form cannot show, on the
 * one rule and backend it actually edits — because offering a simple form over
 * it would misrepresent what the proxy does.
 *
 * - 'simple':    No rule-level filters on the first backend rule (or no
 *                backend rules at all). Full form, no host header value.
 * - 'host-only': That rule carries only filters the portal itself writes — at
 *                most one Host header override (a requestHeaderModifier that
 *                `set`s a single `Host`) and at most one HSTS filter (a
 *                responseHeaderModifier that `set`s a single
 *                `Strict-Transport-Security`). Full form, fields populated.
 * - 'advanced':  Any other rule-level filter combination (other headers,
 *                add/remove, duplicates), or a filter on the specific backend
 *                the flat form edits. Read-only banner.
 */
export type HttpProxyComplexity = 'simple' | 'host-only' | 'advanced';

export function classifyHttpProxyComplexity(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): HttpProxyComplexity {
  const rules = raw.spec?.rules ?? [];

  // The flat model addresses the first rule that has backends; redirect rules
  // are benign and ignored. Later backend rules are the Backends tab's
  // business and no longer bear on what this form may edit.
  const backendRule = rules.find((r) => r.backends && r.backends.length > 0);
  if (!backendRule) return 'simple';

  // A filter on the first backend specifically: that is the backend whose
  // endpoint and TLS hostname the flat form edits, so a filter the form cannot
  // show would make its fields a half-truth. Filters on later backends do not
  // matter here — the form never touches them.
  const firstBackendFilters = (backendRule.backends?.[0] as { filters?: unknown[] } | undefined)
    ?.filters;
  if (firstBackendFilters && firstBackendFilters.length > 0) return 'advanced';

  const filters = backendRule.filters ?? [];

  // No rule-level filters → simple
  if (filters.length === 0) return 'simple';

  const hostFilters = filters.filter(isPortalHostHeaderFilter).length;
  const hstsFilters = filters.filter(isPortalHstsFilter).length;

  // Anything the portal didn't write, or a duplicate of something it did → advanced
  if (hostFilters > 1 || hstsFilters > 1) return 'advanced';
  if (hostFilters + hstsFilters !== filters.length) return 'advanced';

  return 'host-only';
}

/**
 * Latest spec/metadata write recorded in `metadata.managedFields`. Entries
 * for the `status` subresource are controller writes, not user edits, so
 * they're skipped. Returns undefined when nothing usable is present.
 */
export function extractUpdatedAt(raw: ComDatumapisNetworkingV1AlphaHttpProxy): Date | undefined {
  let latest: number | undefined;
  for (const entry of raw.metadata?.managedFields ?? []) {
    if (entry.subresource === 'status' || !entry.time) continue;
    const t = new Date(entry.time).getTime();
    if (!Number.isNaN(t) && (latest === undefined || t > latest)) latest = t;
  }
  return latest === undefined ? undefined : new Date(latest);
}

/**
 * The `Strict-Transport-Security` value the backend rule sets on responses,
 * or undefined when none is set. Matches the header name case-insensitively
 * and returns whatever value is there, not only the one the portal writes,
 * so a hand-tuned directive (longer max-age, includeSubDomains, preload)
 * survives a rules rebuild instead of being replaced by the portal default.
 */
export function extractHstsHeaderValue(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): string | undefined {
  const backendRule = raw.spec?.rules?.find((r) => r.backends && r.backends.length > 0);
  const filters = backendRule?.filters ?? [];
  for (const filter of filters) {
    const header = (filter.responseHeaderModifier?.set ?? []).find(
      (h) => h.name.toLowerCase() === HSTS_HEADER.toLowerCase()
    );
    if (header) return header.value;
  }
  return undefined;
}

/** Whether the backend rule sets `Strict-Transport-Security` on responses. */
export function extractHsts(raw: ComDatumapisNetworkingV1AlphaHttpProxy): boolean {
  return extractHstsHeaderValue(raw) !== undefined;
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
 * Default policy name matches the proxy name for 1:1 lifecycle; override when that
 * name is already taken by a policy attached elsewhere.
 */
export function toTrafficProtectionPolicyPayload(
  httpProxyName: string,
  mode: 'Enforce' | 'Observe' | 'Disabled' = 'Enforce',
  paranoiaLevels?: { blocking?: number; detection?: number },
  policyName: string = httpProxyName,
  ruleExclusions?: WafRuleExclusions
): ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy {
  const ruleSet: {
    type: 'OWASPCoreRuleSet';
    owaspCoreRuleSet?: {
      paranoiaLevels?: {
        blocking?: number;
        detection?: number;
      };
      ruleExclusions?: WafRuleExclusions;
    };
  } = {
    type: 'OWASPCoreRuleSet',
  };

  const hasParanoia =
    paranoiaLevels &&
    (paranoiaLevels.blocking !== undefined || paranoiaLevels.detection !== undefined);
  const hasExclusions = ruleExclusions && Object.keys(ruleExclusions).length > 0;

  if (hasParanoia || hasExclusions) {
    ruleSet.owaspCoreRuleSet = {
      ...(hasParanoia && {
        paranoiaLevels: {
          ...(paranoiaLevels.blocking !== undefined && { blocking: paranoiaLevels.blocking }),
          ...(paranoiaLevels.detection !== undefined && { detection: paranoiaLevels.detection }),
        },
      }),
      ...(hasExclusions && { ruleExclusions }),
    };
  }

  return {
    apiVersion: 'networking.datumapis.com/v1alpha',
    kind: 'TrafficProtectionPolicy',
    metadata: {
      name: policyName,
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

export function getRuleExclusions(
  raw: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy | null | undefined
): WafRuleExclusions | undefined {
  const owaspRuleSet = raw?.spec?.ruleSets?.find(
    (rs) => rs.type === 'OWASPCoreRuleSet'
  )?.owaspCoreRuleSet;
  const exclusions = owaspRuleSet?.ruleExclusions;
  if (!exclusions) return undefined;

  const result: WafRuleExclusions = {};
  if (exclusions.tags?.length) result.tags = exclusions.tags;
  if (exclusions.ids?.length) result.ids = exclusions.ids;
  if (exclusions.idRanges?.length) result.idRanges = exclusions.idRanges;

  return Object.keys(result).length > 0 ? result : undefined;
}

export type TrafficProtectionPolicyUpdate = {
  mode?: TrafficProtectionMode;
  paranoiaLevels?: { blocking?: number; detection?: number };
  ruleExclusions?: WafRuleExclusions | null;
};

export function toTrafficProtectionPolicySpecPatch(
  existing: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy | undefined,
  update: TrafficProtectionPolicyUpdate
): {
  mode?: TrafficProtectionMode;
  ruleSets: Array<{
    type: 'OWASPCoreRuleSet';
    owaspCoreRuleSet: {
      paranoiaLevels?: { blocking?: number; detection?: number };
      ruleExclusions?: WafRuleExclusions | null;
    };
  }>;
} {
  const nextMode = update.mode ?? getTrafficProtectionMode(existing);
  const nextParanoia = update.paranoiaLevels ?? getParanoiaLevels(existing);
  const nextExclusions =
    update.ruleExclusions === undefined ? getRuleExclusions(existing) : update.ruleExclusions;

  return {
    ...(nextMode && { mode: nextMode }),
    ruleSets: [
      {
        type: 'OWASPCoreRuleSet',
        owaspCoreRuleSet: {
          ...(nextParanoia && { paranoiaLevels: nextParanoia }),
          ruleExclusions: nextExclusions ?? null,
        },
      },
    ],
  };
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
    ruleExclusions?: WafRuleExclusions;
    basicAuth?: { enabled: boolean; userCount: number; usernames: string[]; forbidden?: boolean };
  }
): HttpProxy {
  // Find the backend rule (skip redirect rules which have no backends)
  const backendRule = raw.spec?.rules?.find((rule) => rule.backends && rule.backends.length > 0);
  const backend = backendRule?.backends?.[0] as
    { endpoint?: string; tls?: { hostname?: string }; connector?: { name: string } } | undefined;

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
  const hasRedirectRule = raw.spec?.rules?.some((rule) => isPortalRedirectRule(rule as RawRule));

  // Extract Host header from rule-level filters (case-insensitive per RFC 7230)
  const hostHeader = extractHostHeader(raw);
  const hstsHeaderValue = extractHstsHeaderValue(raw);

  // FR-4: classify the underlying resource so callers can decide between
  // editable form and read-only banner without re-reading the raw resource.
  const complexity = classifyHttpProxyComplexity(raw);
  const loadBalancer = toProxyLoadBalancer(raw);

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(raw.metadata.creationTimestamp)
      : new Date(),
    updatedAt: extractUpdatedAt(raw),
    endpoint: backend?.endpoint,
    origins: origins.length > 0 ? origins : undefined,
    hostnames: raw.spec?.hostnames,
    tlsHostname: backend?.tls?.hostname,
    ...(hostHeader && { hostHeader }),
    complexity,
    ...(raw.spec?.rules && { rawRules: raw.spec.rules, routes: toProxyRoutes(raw) }),
    ...(loadBalancer && { loadBalancer }),
    status: raw.status,
    canonicalHostname: raw.status?.canonicalHostname,
    hostnameStatuses: raw.status?.hostnameStatuses,
    chosenName: raw.metadata?.annotations?.['app.kubernetes.io/name'] ?? '',
    enableHttpRedirect: hasRedirectRule,
    hsts: hstsHeaderValue !== undefined,
    ...(hstsHeaderValue !== undefined && { hstsHeaderValue }),
    ...(backend?.connector && { connector: backend.connector }),
    ...(options?.trafficProtectionMode !== undefined && {
      trafficProtectionMode: options.trafficProtectionMode,
    }),
    ...(options?.paranoiaLevels !== undefined && {
      paranoiaLevels: options.paranoiaLevels,
    }),
    ...(options?.ruleExclusions !== undefined && {
      ruleExclusions: options.ruleExclusions,
    }),
    ...(options?.basicAuth !== undefined && {
      basicAuthEnabled: options.basicAuth.enabled,
      basicAuthUserCount: options.basicAuth.userCount,
      basicAuthUsernames: options.basicAuth.usernames,
      ...(options.basicAuth.forbidden && { basicAuthForbidden: true }),
    }),
  };
}

/**
 * Build a map of proxy name -> WAF mode from TrafficProtectionPolicy targetRefs.
 * Policy metadata.name is not used as the map key.
 */
export function toTrafficProtectionModeMap(
  list: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicyList | null | undefined
): Map<string, TrafficProtectionMode> {
  return buildAttachmentMapsFromPolicies(
    list?.items ?? [],
    getTrafficProtectionMode,
    getParanoiaLevels
  ).modeByName;
}

/**
 * Build a map of proxy name -> paranoia levels from TrafficProtectionPolicy targetRefs.
 */
export function toParanoiaLevelsMap(
  list: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicyList | null | undefined
): Map<string, { blocking?: number; detection?: number }> {
  return buildAttachmentMapsFromPolicies(
    list?.items ?? [],
    getTrafficProtectionMode,
    getParanoiaLevels
  ).paranoiaByName;
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
type BackendRuleFilter =
  | {
      type: 'RequestHeaderModifier';
      requestHeaderModifier: { set: Array<{ name: string; value: string }> };
    }
  | {
      type: 'ResponseHeaderModifier';
      responseHeaderModifier: { set: Array<{ name: string; value: string }> };
    };
type BackendRule = {
  backends: Array<{ endpoint: string; tls?: { hostname: string }; connector?: { name: string } }>;
  filters?: BackendRuleFilter[];
};

export type HttpProxyUpdatePayload = {
  kind: string;
  apiVersion: string;
  metadata?: { annotations: Record<string, string> };
  spec?: {
    hostnames?: string[];
    /**
     * Spliced rules are structurally opaque — they carry whatever the API
     * returned, including fields this module has never heard of — so the
     * element type has to admit more than the two shapes we synthesize.
     */
    rules?: Array<BackendRule | RedirectRule | RawRule>;
    /** `null` clears the field, so Envoy's own default algorithm applies. */
    loadBalancer?: ProxyLoadBalancer | null;
  };
};

/** The force-HTTPS rule the portal synthesizes. */
function portalRedirectRule(): RedirectRule {
  return {
    matches: [
      {
        path: { type: 'PathPrefix', value: '/' },
        headers: [{ name: 'x-forwarded-proto', type: 'Exact', value: 'http' }],
      },
    ],
    filters: [{ type: 'RequestRedirect', requestRedirect: { scheme: 'https', statusCode: 301 } }],
  };
}

function hostHeaderFilter(value: string): BackendRuleFilter {
  return {
    type: 'RequestHeaderModifier',
    requestHeaderModifier: { set: [{ name: 'Host', value }] },
  };
}

function hstsResponseFilter(value: string): BackendRuleFilter {
  return {
    type: 'ResponseHeaderModifier',
    responseHeaderModifier: { set: [{ name: HSTS_HEADER, value }] },
  };
}

/** The flat fields the Configuration/Overview surfaces own, already resolved. */
type ResolvedFlatFields = {
  redirect: boolean;
  endpoint?: string;
  tlsHostname?: string;
  /** Empty string means "no Host override". */
  hostHeader: string;
  hsts: boolean;
  hstsValue: string;
};

/**
 * Apply the flat fields onto a clone of the rules the API currently holds,
 * touching only what those fields own.
 *
 * This is the whole point of carrying `rawRules`: the previous implementation
 * rebuilt `spec.rules` from the flat fields alone, which silently dropped
 * every backend past the first, their weights, backend-level filters,
 * non-path matches, and connector/instance backends. Editing the Host header
 * must not collapse a five-backend pool down to one.
 */
function spliceFlatFieldsIntoRules(rawRules: RawRule[], resolved: ResolvedFlatFields): RawRule[] {
  const rules = structuredClone(rawRules);

  // --- the force-HTTPS rule -------------------------------------------------
  const redirectIndex = rules.findIndex(isPortalRedirectRule);
  if (resolved.redirect && redirectIndex === -1) {
    // Ahead of the backend rules: a redirect that sits behind them never runs.
    rules.unshift(portalRedirectRule() as unknown as RawRule);
  } else if (!resolved.redirect && redirectIndex !== -1) {
    rules.splice(redirectIndex, 1);
  }

  // --- the backend rule -----------------------------------------------------
  const backendIndex = rules.findIndex(ruleHasBackends);
  if (backendIndex === -1) {
    if (resolved.endpoint) {
      rules.push(buildBackendRule(resolved) as unknown as RawRule);
    }
    return rules;
  }

  const rule = rules[backendIndex];

  // The flat model addresses exactly one origin, so endpoint and TLS apply to
  // the first backend only. Everything after it belongs to the Backends tab.
  const first = rule.backends?.[0];
  if (first) {
    if (resolved.endpoint) first.endpoint = resolved.endpoint;
    if (resolved.tlsHostname) first.tls = { hostname: resolved.tlsHostname };
    else delete first.tls;
  }

  // Replace the portal's own filters in place; carry everything else through
  // untouched and in its original position.
  const nextFilters: RuleFilter[] = [];
  let hostWritten = false;
  let hstsWritten = false;
  for (const filter of rule.filters ?? []) {
    if (isPortalHostHeaderFilter(filter)) {
      if (resolved.hostHeader && !hostWritten) {
        nextFilters.push(hostHeaderFilter(resolved.hostHeader) as RuleFilter);
        hostWritten = true;
      }
      continue;
    }
    if (isPortalHstsFilter(filter)) {
      if (resolved.hsts && !hstsWritten) {
        nextFilters.push(hstsResponseFilter(resolved.hstsValue) as RuleFilter);
        hstsWritten = true;
      }
      continue;
    }
    nextFilters.push(filter);
  }
  if (resolved.hostHeader && !hostWritten) {
    nextFilters.push(hostHeaderFilter(resolved.hostHeader) as RuleFilter);
  }
  if (resolved.hsts && !hstsWritten) {
    nextFilters.push(hstsResponseFilter(resolved.hstsValue) as RuleFilter);
  }

  // Omit rather than send an empty list, so a rule that never had filters
  // does not acquire `filters: []`.
  if (nextFilters.length > 0) rule.filters = nextFilters;
  else delete rule.filters;

  return rules;
}

/** The single-backend rule the flat model synthesizes when none exists yet. */
function buildBackendRule(resolved: ResolvedFlatFields): BackendRule {
  const filters: BackendRuleFilter[] = [];
  if (resolved.hostHeader) filters.push(hostHeaderFilter(resolved.hostHeader));
  if (resolved.hsts) filters.push(hstsResponseFilter(resolved.hstsValue));

  return {
    backends: [
      {
        endpoint: resolved.endpoint ?? '',
        ...(resolved.tlsHostname && { tls: { hostname: resolved.tlsHostname } }),
      },
    ],
    ...(filters.length > 0 && { filters }),
  };
}

/** True when the merge-patch would change HTTPProxy metadata or spec. */
export function httpProxyPatchTouchesResource(payload: HttpProxyUpdatePayload): boolean {
  return payload.metadata !== undefined || payload.spec !== undefined;
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
): HttpProxyUpdatePayload {
  const annotations: Record<string, string> = {};

  if (input.chosenName !== undefined) {
    annotations['app.kubernetes.io/name'] = input.chosenName;
  }

  const metadata = Object.keys(annotations).length > 0 ? { annotations } : undefined;

  const hasRulesChange =
    input.endpoint !== undefined ||
    input.enableHttpRedirect !== undefined ||
    input.hsts !== undefined ||
    input.hostHeader !== undefined ||
    // TLS lives on the backend rule — rewrite rules when it changes even if
    // endpoint/redirect/hostHeader are untouched (e.g. hostnames dialog save).
    input.tlsHostname !== undefined;

  let spec:
    { hostnames?: string[]; rules?: Array<BackendRule | RedirectRule | RawRule> } | undefined;

  if (hasRulesChange || input.hostnames !== undefined) {
    spec = {};

    if (input.hostnames !== undefined) {
      spec.hostnames = input.hostnames;
    }

    if (hasRulesChange) {
      // Explicit input wins over the current value; a defined-but-empty string
      // means "clear". These resolutions are shared by both paths below so the
      // two agree on what the flat fields currently say.
      const effectiveEndpoint = input.endpoint ?? currentProxy?.endpoint;
      const effectiveTls =
        input.tlsHostname !== undefined
          ? input.tlsHostname.trim() || undefined
          : currentProxy?.tlsHostname;
      const effectiveHostHeader =
        input.hostHeader !== undefined
          ? input.hostHeader.trim()
          : (currentProxy?.hostHeader?.trim() ?? '');
      const effectiveHsts = input.hsts ?? currentProxy?.hsts ?? false;
      // When preserving, re-emit the value already there so a hand-tuned
      // directive is not silently replaced by the portal default.
      const effectiveHstsValue =
        input.hsts === undefined
          ? (currentProxy?.hstsHeaderValue ?? HSTS_HEADER_VALUE)
          : HSTS_HEADER_VALUE;
      const effectiveRedirect =
        input.enableHttpRedirect ?? currentProxy?.enableHttpRedirect ?? false;

      const resolved: ResolvedFlatFields = {
        redirect: effectiveRedirect,
        endpoint: effectiveEndpoint,
        tlsHostname: effectiveTls,
        hostHeader: effectiveHostHeader,
        hsts: effectiveHsts,
        hstsValue: effectiveHstsValue,
      };

      const rawRules = currentProxy?.rawRules as RawRule[] | undefined;

      if (rawRules) {
        // Preferred path: patch the rules the API actually holds, so anything
        // the flat model cannot see survives the write.
        spec.rules = spliceFlatFieldsIntoRules(rawRules, resolved);
      } else {
        // Fallback for an HttpProxy assembled by hand rather than read from the
        // API (no rules to preserve). Synthesizes the flat model's own shape.
        const rules: Array<BackendRule | RedirectRule> = [];

        if (effectiveRedirect) {
          rules.push(portalRedirectRule());
        }

        if (effectiveEndpoint) {
          const rule = buildBackendRule(resolved);
          if (currentProxy?.connector) {
            rule.backends[0].connector = currentProxy.connector;
          }
          rules.push(rule);
        }

        spec.rules = rules;
      }
    }
  }

  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    ...(metadata ? { metadata } : {}),
    ...(spec ? { spec } : {}),
  };
}

/** Parse the `${ruleIndex}:${backendIndex}` identity a read put on a backend. */
function backendIndexOf(key: string): number {
  const parsed = Number(key.split(':')[1]);
  return Number.isInteger(parsed) ? parsed : -1;
}

/**
 * Apply one edited backend onto the backend the API returned.
 *
 * Splices for the same reason rule writes do: a backend can carry filters and
 * fields the editor has no concept of, and rebuilding from ProxyBackend alone
 * would drop them.
 */
function applyBackend(
  backend: ProxyBackend,
  original: Record<string, unknown> | undefined
): Record<string, unknown> {
  const out = original ? structuredClone(original) : {};

  // Connector and instance backends, and any backend carrying its own
  // filters, are shown read-only; pass them through exactly as they came.
  if (!backend.editable && original) return out;

  // The API forbids more than one target on a backend, so clear every target
  // before setting the chosen one — otherwise switching kind would leave two.
  delete out.endpoint;
  delete out.networkService;
  delete out.instance;
  delete out.tls;

  if (backend.kind === 'networkService' && backend.networkService) {
    // TLS is not supported for this kind, which the delete above already
    // guarantees.
    out.networkService = {
      name: backend.networkService.name,
      port: backend.networkService.port,
    };
  } else {
    out.endpoint = backend.endpoint ?? '';
    if (backend.tlsHostname) out.tls = { hostname: backend.tlsHostname };
  }

  out.weight = backend.weight;
  return out;
}

/** Apply an edited route onto the rule the API returned, or build a new one. */
function applyRoute(route: ProxyRoute, original: RawRule | undefined): RawRule {
  const rule: RawRule = original ? structuredClone(original) : {};

  // Only reached for editable routes, whose single match carries nothing but
  // a path — so replacing the match list outright loses nothing.
  if (route.path !== undefined || route.pathType) {
    rule.matches = [{ path: { type: route.pathType ?? 'PathPrefix', value: route.path ?? '/' } }];
  }

  const originalBackends = original?.backends ?? [];
  rule.backends = route.backends.map((backend) => {
    const index = backendIndexOf(backend.key);
    return applyBackend(backend, index >= 0 ? originalBackends[index] : undefined);
  });

  return rule;
}

/**
 * Merge-patch for the Backends tab: the routes and pools the user arranged,
 * spliced onto the rules the API currently holds.
 *
 * `routes` is the desired end state — a rule the caller leaves out is a rule
 * deleted. A route with a negative `ruleIndex` is new and has no rule to
 * splice onto.
 */
export function toUpdateProxyRoutesPayload(
  routes: ProxyRoute[],
  rawRules: RawRule[]
): HttpProxyUpdatePayload {
  const base = structuredClone(rawRules);
  const next: RawRule[] = [];

  // The force-HTTPS rule belongs to the TLS card's toggle, not to this
  // editor. Carry it through whether or not the caller passed it back, so a
  // routes write can never turn Force HTTPS off by omission — and keep it
  // first, since a redirect behind the backend rules never runs.
  const redirect = base.find(isPortalRedirectRule);
  if (redirect) next.push(redirect);

  for (const route of routes) {
    if (route.isRedirect) continue;
    const original = route.ruleIndex >= 0 ? base[route.ruleIndex] : undefined;
    // A route the editor cannot represent is passed through untouched rather
    // than rewritten from a model that does not describe all of it.
    next.push(original && route.readOnly ? original : applyRoute(route, original));
  }

  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    spec: { rules: next },
  };
}

/** Merge-patch for the algorithm control. `null` restores Envoy's default. */
export function toUpdateProxyLoadBalancerPayload(
  loadBalancer: ProxyLoadBalancer | null
): HttpProxyUpdatePayload {
  return {
    kind: 'HTTPProxy',
    apiVersion: 'networking.datumapis.com/v1alpha',
    spec: { loadBalancer },
  };
}
