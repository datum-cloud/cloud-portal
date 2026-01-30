import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { nameSchema } from '@/resources/base';
import { createHostnameSchema } from '@/utils/helpers/validation.helper';
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

// Input types for service operations
export type CreateHttpProxyInput = {
  name: string;
  endpoint: string;
  hostnames?: string[];
  tlsHostname?: string;
};

export type UpdateHttpProxyInput = {
  endpoint: string;
  hostnames?: string[];
  tlsHostname?: string;
};

// Form validation schemas
export const httpProxyHostnameSchema = z.object({
  hostnames: z.array(createHostnameSchema('Hostname')).optional(),
});

export const httpProxySchema = z
  .object({
    endpoint: z.string({ error: 'Endpoint is required' }).refine(
      (value) => {
        try {
          const url = new URL(value);
          // Must have http:// or https:// protocol
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Endpoint must be a valid URL with HTTP/HTTPS protocol' }
    ),
    tlsHostname: z.string().min(1).max(253).optional(),
  })
  .and(httpProxyHostnameSchema)
  .and(nameSchema);

export type HttpProxySchema = z.infer<typeof httpProxySchema>;
export type HttpProxyHostnameSchema = z.infer<typeof httpProxyHostnameSchema>;
