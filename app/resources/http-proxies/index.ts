// Schema exports
export {
  httpProxyResourceSchema,
  type HttpProxy,
  type IHttpProxyControlResponse,
  httpProxyListSchema,
  type HttpProxyList,
  type CreateHttpProxyInput,
  type UpdateHttpProxyInput,
  trafficProtectionModeSchema,
  type TrafficProtectionMode,
  type BasicAuthUser,
  // Re-exported validation schemas
  httpProxyHostnameSchema,
  httpProxySchema,
  type HttpProxySchema,
  type HttpProxyHostnameSchema,
  hostnameStatusSchema,
  type HostnameStatus,
  basicAuthSchema,
  type BasicAuthSchema,
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
  useHttpProxiesByConnector,
  useHttpProxy,
  useCreateHttpProxy,
  useUpdateHttpProxy,
  useDeleteHttpProxy,
} from './http-proxy.queries';

// Watch hooks exports
export { useHttpProxiesWatch, useHttpProxyWatch, waitForHttpProxyReady } from './http-proxy.watch';

// Utility exports
export { getParanoiaLevelLabel, formatWafProtectionDisplay } from './http-proxy.utils';

// Condition constants and helpers for TLS/certificate status (network-services-operator)
export {
  HTTP_PROXY_CONDITION_CERTIFICATES_READY,
  HOSTNAME_CONDITION_CERTIFICATE_READY,
  CertificatesReadyReason,
  CertificateReadyReason,
  getCertificatesReadyCondition,
  getCertificateReadyCondition,
  getCertificatesReadyDisplay,
  getCertificateReadyDisplay,
} from './http-proxy.conditions';
export type {
  CertificatesReadyReasonType,
  CertificateReadyReasonType,
  ConditionLike,
  HttpProxyStatusLike,
  HostnameStatusLike,
} from './http-proxy.conditions';
