// Schema exports
export {
  httpProxyResourceSchema,
  type HttpProxy,
  type IHttpProxyControlResponse,
  httpProxyListSchema,
  type HttpProxyList,
  type CreateHttpProxyInput,
  type UpdateHttpProxyInput,
  // Re-exported validation schemas
  httpProxyHostnameSchema,
  httpProxySchema,
  type HttpProxySchema,
  type HttpProxyHostnameSchema,
} from './http-proxy.schema';

// Adapter exports
export {
  toHttpProxy,
  toHttpProxyList,
  toCreateHttpProxyPayload,
  toUpdateHttpProxyPayload,
} from './http-proxy.adapter';

// Service exports
export { createHttpProxyService, httpProxyKeys, type HttpProxyService } from './http-proxy.service';

// Query hooks exports
export {
  useHttpProxies,
  useHttpProxy,
  useCreateHttpProxy,
  useUpdateHttpProxy,
  useDeleteHttpProxy,
  useHydrateHttpProxies,
  useHydrateHttpProxy,
} from './http-proxy.queries';

// Watch hooks exports
export { useHttpProxiesWatch, useHttpProxyWatch } from './http-proxy.watch';
