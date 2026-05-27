import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { nameSchema } from '@/resources/base';
import { createSubdomainSchema, isIPAddress } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

// Forward-declare validateHostHeader to avoid circular import.
// The canonical implementation lives in http-proxy.adapter.ts; we inline a
// minimal re-implementation here so Zod schemas don't import the adapter.
// Keep this in sync with validateHostHeader in http-proxy.adapter.ts.
function _validateHostHeaderForSchema(value: string): string | null {
  if (!value) return null;
  if (value.trim() === '') return 'Enter a hostname or leave the field blank.';
  if (/\s/.test(value)) return 'Hostnames cannot contain spaces.';

  // A Host header must be a single literal hostname. Wildcards belong in
  // spec.hostnames, not here — upstream certs and virtual hosts cannot match
  // a wildcard literal.
  if (value.includes('*')) {
    return 'Wildcards are not valid in a Host header. Enter a single literal hostname such as api.example.com.';
  }

  // Check for IPv6 before port stripping so that '::1' is caught here.
  // IP literals are technically valid per RFC 7230 but no upstream TLS cert
  // or virtual host can match an IP, so the request would fail in practice.
  if (value.includes('::') || value.startsWith('[')) {
    return 'Upstream TLS certificates will not match an IP. Use a hostname such as localhost or api.example.internal.';
  }

  let hostPart = value;
  const portMatch = value.match(/^(.+):(\d{1,5})$/);
  if (portMatch) {
    const portNum = Number(portMatch[2]);
    if (portNum >= 1 && portNum <= 65535) hostPart = portMatch[1];
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostPart)) {
    return 'Upstream TLS certificates will not match an IP. Use a hostname such as localhost or api.example.internal.';
  }
  if (value.length > 253) return 'Hostnames must be 253 characters or fewer.';

  const labelRe = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  const labels = hostPart.split('.');
  const allLabelsValid = labels.every((label) => label === 'localhost' || labelRe.test(label));
  if (!allLabelsValid || hostPart === '') {
    return 'Enter a valid hostname (letters, numbers, hyphens, and dots only).';
  }
  return null;
}

const hostnameStatusConditionSchema = z.object({
  type: z.string(),
  status: z.enum(['True', 'False', 'Unknown']),
  reason: z.string(),
  message: z.string(),
  lastTransitionTime: z.string(),
  observedGeneration: z.number().optional(),
});

export const hostnameStatusSchema = z.object({
  hostname: z.string(),
  conditions: z.array(hostnameStatusConditionSchema).optional(),
});

export type HostnameStatus = z.infer<typeof hostnameStatusSchema>;

/**
 * A single non-default path rule.
 *
 * Represents one entry in `spec.rules[]` that has a backend and is NOT the
 * catch-all. The catch-all (PathPrefix `/`, or a rule with no match block) is
 * surfaced as the proxy's top-level `endpoint`/`tlsHostname`/`hostHeader`
 * instead — extras are everything else.
 *
 * `name` is the optional `spec.rules[].name` from the API.
 */
export const proxyPathRuleSchema = z.object({
  name: z.string().optional(),
  match: z.object({
    type: z.enum(['Exact', 'PathPrefix']),
    value: z.string().min(1),
  }),
  endpoint: z.string().min(1),
  tlsHostname: z.string().optional(),
  hostHeader: z.string().optional(),
  /**
   * When set, traffic is tunneled to the user's device via the named Connector
   * (Datum Desktop). NSO relaxes the FQDN check on `endpoint` when this is
   * present, allowing `localhost` / loopback IPs.
   */
  connector: z.object({ name: z.string().min(1) }).optional(),
});

export type ProxyPathRule = z.infer<typeof proxyPathRuleSchema>;

// HTTP Proxy resource schema (from API)
export const httpProxyResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  endpoint: z.string().optional(),
  origins: z.array(z.string()).optional(),
  hostnames: z.array(z.string()).optional(),
  tlsHostname: z.string().optional(),
  status: z.any().optional(),
  chosenName: z.string().optional(),
  canonicalHostname: z.string().optional(),
  hostnameStatuses: z.array(hostnameStatusSchema).optional(),
  /** WAF mode from the linked TrafficProtectionPolicy (if present) */
  trafficProtectionMode: z.enum(['Observe', 'Enforce', 'Disabled']).optional(),
  /** Paranoia levels from the linked TrafficProtectionPolicy (if present) */
  paranoiaLevels: z
    .object({
      blocking: z.number().int().min(1).max(4).optional(),
      detection: z.number().int().min(1).max(4).optional(),
    })
    .optional(),
  /** Whether HTTP to HTTPS redirect is enabled */
  enableHttpRedirect: z.boolean().optional(),
  /** Connector referenced by the backend rule (if any) */
  connector: z.object({ name: z.string() }).optional(),
  /** Whether basic auth is currently enabled (SecurityPolicy exists) */
  basicAuthEnabled: z.boolean().optional(),
  /** Number of configured users (derived from the htpasswd Secret) */
  basicAuthUserCount: z.number().int().min(0).optional(),
  /** Usernames visible to the UI (never passwords) */
  basicAuthUsernames: z.array(z.string()).optional(),
  /**
   * Optional upstream Host header override.
   * Maps to spec.rules[backendRule].filters[].requestHeaderModifier.set[name=Host].value.
   * Empty / undefined means "no override" (forward the incoming Host unchanged).
   */
  hostHeader: z.string().optional(),
  /**
   * Non-default path rules. The catch-all backend stays on `endpoint`/
   * `tlsHostname`/`hostHeader`; entries here are the additional `spec.rules[]`
   * with explicit path matches, in the order they appear in the resource.
   */
  extraPaths: z.array(proxyPathRuleSchema).optional(),
  /**
   * Form-editability classification of the underlying resource (FR-4):
   * - 'simple'    — no rule-level filters; safe to edit via form
   * - 'host-only' — only a host-header filter; safe to edit via form
   * - 'advanced'  — multi-rule, backend-level filters, or filters the form
   *   cannot represent without data loss; show read-only banner
   */
  complexity: z.enum(['simple', 'host-only', 'advanced']).optional(),
});

export type HttpProxy = z.infer<typeof httpProxyResourceSchema>;

// Legacy control response interface
export interface IHttpProxyControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  endpoint?: string;
  hostnames?: string[];
  tlsHostname?: string;
  status?: ComDatumapisNetworkingV1AlphaHttpProxy['status'];
}

// HTTP Proxy list schema
export const httpProxyListSchema = z.object({
  items: z.array(httpProxyResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type HttpProxyList = z.infer<typeof httpProxyListSchema>;

/** WAF / TrafficProtectionPolicy mode */
export const trafficProtectionModeSchema = z.enum(['Observe', 'Enforce', 'Disabled']);
export type TrafficProtectionMode = z.infer<typeof trafficProtectionModeSchema>;

/**
 * A single basic auth user credential.
 * Passwords are write-only — never returned from the server.
 */
export type BasicAuthUser = {
  username: string;
  /** Present only on create/update; never returned by the server */
  password: string;
};

// Input types for service operations
export type CreateHttpProxyInput = {
  name: string;
  /**
   * Human-friendly display name stored as a Kubernetes annotation.
   * Shown as "Name" in the UI.
   */
  chosenName?: string;
  endpoint: string;
  hostnames?: string[];
  tlsHostname?: string;
  /** WAF mode for the TrafficProtectionPolicy (default Enforce) */
  trafficProtectionMode?: TrafficProtectionMode;
  /** Paranoia levels for the TrafficProtectionPolicy */
  paranoiaLevels?: {
    blocking?: number;
    detection?: number;
  };
  /** Enable HTTP to HTTPS redirect */
  enableHttpRedirect?: boolean;
  /**
   * Optional upstream Host header override.
   * When set, emits a rule-level requestHeaderModifier filter with name=Host.
   * Empty / undefined means "no override".
   */
  hostHeader?: string;
};

export type UpdateHttpProxyInput = {
  endpoint?: string;
  hostnames?: string[];
  tlsHostname?: string;
  /**
   * Optional update to the human-friendly display name annotation.
   */
  chosenName?: string;
  /** Optional update to the WAF / TrafficProtectionPolicy mode. */
  trafficProtectionMode?: TrafficProtectionMode;
  /** Optional update to the WAF paranoia levels. */
  paranoiaLevels?: {
    blocking?: number;
    detection?: number;
  };
  /** When true, removes the TrafficProtectionPolicy (deletes WAF config). */
  removeTrafficProtection?: boolean;
  /** Enable HTTP to HTTPS redirect */
  enableHttpRedirect?: boolean;
  /**
   * Optional basic auth update.
   * Pass `users: undefined` to disable (delete SecurityPolicy + Secret).
   * Pass a non-empty users array to enable or update credentials.
   */
  basicAuth?: {
    /** undefined = disable; non-empty array = enable/update */
    users?: BasicAuthUser[];
  };
  /**
   * Optional upstream Host header override update.
   * Pass an empty string to remove the Host header filter.
   * undefined means "don't change the host header".
   */
  hostHeader?: string;
  /**
   * Full replacement of the non-default path rules.
   *
   * - `undefined` → leave existing extra paths alone
   * - `[]`        → remove all extra paths (catch-all only)
   * - non-empty   → replace with these in the order given (catch-all stays
   *                 the last backend rule in the emitted spec)
   */
  extraPaths?: ProxyPathRule[];
};

const userEntrySchema = z.object({
  username: z.string(),
  password: z.string(),
});

/**
 * Form schema for the Basic Auth dialog.
 * Encodes username format rules (no colons/spaces, max 64 chars),
 * minimum password length, and duplicate username detection.
 *
 * NOTE: Only {SHA} htpasswd is supported by Envoy Gateway's BasicAuth filter,
 * so hashing is intentionally limited to SHA-1 in the adapter.
 */
export const basicAuthSchema = z
  .object({
    enabled: z.preprocess((val) => {
      if (typeof val === 'boolean') return val;
      return val === 'true' || val === 'on';
    }, z.boolean().default(false)),
    // Normalize array so undefined items/keys never reach the inner schema (avoids "expected string, received undefined")
    users: z.preprocess((val) => {
      if (!Array.isArray(val)) return val;
      return val.map((item) => ({
        username:
          item != null && typeof item === 'object' && typeof item.username === 'string'
            ? item.username
            : '',
        password:
          item != null && typeof item === 'object' && typeof item.password === 'string'
            ? item.password
            : '',
      }));
    }, z.array(userEntrySchema).optional()),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;

    if (!data.users || data.users.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one user is required when authentication is enabled',
        path: ['users'],
      });
      return;
    }

    data.users.forEach((user, i) => {
      if (!user.username) {
        ctx.addIssue({
          code: 'custom',
          message: 'Username is required',
          path: ['users', i, 'username'],
        });
      } else if (user.username.length > 64) {
        ctx.addIssue({
          code: 'custom',
          message: 'Username must be 64 characters or less',
          path: ['users', i, 'username'],
        });
      } else if (/[\s:]/.test(user.username)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Username must not contain spaces or colons',
          path: ['users', i, 'username'],
        });
      }
      if (user.password.length < 4) {
        ctx.addIssue({
          code: 'custom',
          message: 'Password must be at least 4 characters',
          path: ['users', i, 'password'],
        });
      }
    });

    const names = data.users.map((u) => u.username);
    names.forEach((name, i) => {
      if (names.indexOf(name) !== i) {
        ctx.addIssue({
          code: 'custom',
          message: `Username "${name}" is already used`,
          path: ['users', i, 'username'],
        });
      }
    });
  });

export type BasicAuthSchema = z.infer<typeof basicAuthSchema>;

// Form validation schemas
export const httpProxyHostnameSchema = z.object({
  hostnames: z.array(createSubdomainSchema('Hostname')).optional(),
});

// Helper function to validate hostname:port (without protocol)
function parseHostnamePort(value: string): { hostname: string; port?: string } | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed !== value) return null;

  // Check for port separator
  const parts = trimmed.split(':');
  if (parts.length > 2) return null; // Only one colon allowed for port

  const hostname = parts[0];
  const port = parts[1];

  if (!hostname || hostname.length === 0 || hostname.length > 253) return null;

  // Validate port if present
  if (port !== undefined) {
    const portNum = Number.parseInt(port, 10);
    if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) return null;
  }

  return { hostname, port };
}

function isValidHostnamePort(value: string): boolean {
  return parseHostnamePort(value) !== null;
}

/**
 * Returns true when the host portion of a hostname:port string is either:
 *   - A valid IP address, or
 *   - A fully qualified domain (contains at least two dot-separated labels).
 *
 * This mirrors the API server's admission rule that rejects single-label
 * hostnames like "hello" with "must be a domain with at least two segments
 * separated by dots".
 */
function isFullyQualifiedHostOrIP(value: string): boolean {
  const parsed = parseHostnamePort(value);
  if (!parsed) return false;
  if (isIPAddress(parsed.hostname)) return true;
  const labels = parsed.hostname.split('.').filter(Boolean);
  return labels.length >= 2;
}

export const httpProxySchema = z
  .object({
    chosenName: z
      .string({ error: 'Name is required' })
      .min(1, { message: 'Name is required' })
      .max(50, { message: 'Name must be less than 50 characters long.' }),
    protocol: z.enum(['http', 'https']).default('https'),
    endpointHost: z
      .string({ message: 'Origin is required' })
      .trim()
      .min(1, { message: 'Origin is required' })
      .refine(isValidHostnamePort, {
        message:
          'Origin must be a valid hostname or IP address with optional port (e.g., api.example.com:8080)',
      })
      .refine(isFullyQualifiedHostOrIP, {
        message:
          'Origin must be a fully qualified domain with at least two segments separated by dots (e.g., api.example.com) or a valid IP address',
      }),
    tlsHostname: z.string().min(1).max(253).optional(),
    /**
     * Optional upstream Host header override.
     * Validated on blur and submit; empty string is valid (passthrough).
     */
    hostHeader: z
      .string()
      .superRefine((val, ctx) => {
        if (!val) return; // empty is valid (passthrough)
        const error = _validateHostHeaderForSchema(val);
        if (error) {
          ctx.addIssue({ code: 'custom', message: error });
        }
      })
      .optional(),
    trafficProtectionMode: trafficProtectionModeSchema.default('Enforce'),
    paranoiaLevelBlocking: z.preprocess((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'string' ? Number.parseInt(val, 10) : Number(val);
      return Number.isNaN(num) ? undefined : num;
    }, z.number().int().min(1).max(4).optional()),
    paranoiaLevelDetection: z.preprocess((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'string' ? Number.parseInt(val, 10) : Number(val);
      return Number.isNaN(num) ? undefined : num;
    }, z.number().int().min(1).max(4).optional()),
    /** Enable HTTP to HTTPS redirect */
    enableHttpRedirect: z.preprocess((val) => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'boolean') return val;
      if (val === 'on' || val === 'true') return true;
      return false;
    }, z.boolean().default(false).optional()),
  })
  .and(httpProxyHostnameSchema)
  .and(nameSchema)
  .superRefine((data, ctx) => {
    // Require TLS hostname when endpoint is HTTPS with an IP address
    if (data.endpointHost && data.protocol === 'https') {
      const parts = data.endpointHost.split(':');
      const hostname = parts[0];
      if (isIPAddress(hostname) && !data.tlsHostname) {
        ctx.addIssue({
          code: 'custom',
          message: 'TLS hostname is required for IP-based HTTPS endpoints',
          path: ['tlsHostname'],
        });
      }
    }
  });

export type HttpProxySchema = z.infer<typeof httpProxySchema>;
export type HttpProxyHostnameSchema = z.infer<typeof httpProxyHostnameSchema>;
