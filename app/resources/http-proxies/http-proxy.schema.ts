import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { nameSchema } from '@/resources/base';
import {
  createHostnameSchema,
  createHttpEndpointSchema,
  isIPAddress,
} from '@/utils/helpers/validation.helper';
import { z } from 'zod';

// HTTP Proxy resource schema (from API)
export const httpProxyResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  endpoint: z.string().optional(),
  hostnames: z.array(z.string()).optional(),
  tlsHostname: z.string().optional(),
  status: z.any().optional(),
  chosenName: z.string().optional(),
  /** WAF mode from the linked TrafficProtectionPolicy (if present) */
  trafficProtectionMode: z.enum(['Observe', 'Enforce', 'Disabled']).optional(),
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
};

// Form validation schemas
export const httpProxyHostnameSchema = z.object({
  hostnames: z.array(createHostnameSchema('Hostname')).optional(),
});

export const httpProxySchema = z
  .object({
    chosenName: z
      .string({ error: 'Name is required' })
      .min(1, { message: 'Name is required' })
      .max(50, { message: 'Name must be less than 50 characters long.' }),
    endpoint: createHttpEndpointSchema('Endpoint'),
    tlsHostname: z.string().min(1).max(253).optional(),
    trafficProtectionMode: trafficProtectionModeSchema.default('Enforce'),
  })
  .and(httpProxyHostnameSchema)
  .and(nameSchema)
  .superRefine((data, ctx) => {
    // Require TLS hostname when endpoint is HTTPS with an IP address
    if (data.endpoint) {
      try {
        const url = new URL(data.endpoint);
        if (url.protocol === 'https:' && isIPAddress(url.hostname) && !data.tlsHostname) {
          ctx.addIssue({
            code: 'custom',
            message: 'TLS hostname is required for IP-based HTTPS endpoints',
            path: ['tlsHostname'],
          });
        }
      } catch {
        // Invalid URL - handled by endpoint refine
      }
    }
  });

export type HttpProxySchema = z.infer<typeof httpProxySchema>;
export type HttpProxyHostnameSchema = z.infer<typeof httpProxyHostnameSchema>;
