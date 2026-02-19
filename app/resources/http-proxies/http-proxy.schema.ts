import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { nameSchema } from '@/resources/base';
import { createHostnameSchema, isIPAddress } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

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
};

export type UpdateHttpProxyInput = {
  endpoint: string;
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
  /** Enable HTTP to HTTPS redirect */
  enableHttpRedirect?: boolean;
};

// Form validation schemas
export const httpProxyHostnameSchema = z.object({
  hostnames: z.array(createHostnameSchema('Hostname')).optional(),
});

// Helper function to validate hostname:port (without protocol)
function isValidHostnamePort(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed !== value) return false;

  // Check for port separator
  const parts = trimmed.split(':');
  if (parts.length > 2) return false; // Only one colon allowed for port

  const hostname = parts[0];
  const port = parts[1];

  // Validate hostname (can be hostname or IP)
  if (!hostname || hostname.length === 0) return false;

  // Validate port if present
  if (port !== undefined) {
    const portNum = Number.parseInt(port, 10);
    if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) return false;
  }

  // Hostname can be a valid hostname or IP address
  // Basic validation - more detailed validation happens when combining with protocol
  return hostname.length > 0 && hostname.length <= 253;
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
      }),
    tlsHostname: z.string().min(1).max(253).optional(),
    trafficProtectionMode: trafficProtectionModeSchema.default('Enforce'),
    // Combined WAF mode + paranoia level selection
    wafModeWithParanoia: z
      .enum(['Observe', 'Enforce (Basic)', 'Enforce (Medium)', 'Enforce (High)', 'Disabled'])
      .optional(),
    // Keep these for backward compatibility but they'll be derived from wafModeWithParanoia
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
