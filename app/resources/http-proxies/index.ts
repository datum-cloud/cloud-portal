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
  classifyHttpProxyComplexity,
  validateHostHeader,
  extractHostHeader,
  type HttpProxyComplexity,
} from './http-proxy.adapter';

// Service exports
export {
  createHttpProxyService,
  httpProxyKeys,
  type HttpProxyService,
  type TrafficProtectionView,
  type TrafficProtectionMaps,
} from './http-proxy.service';

// Query hooks exports
export {
  useHttpProxies,
  useHttpProxiesByConnector,
  useHttpProxy,
  useTrafficProtectionPolicies,
  useTrafficProtectionPolicy,
  useCreateHttpProxy,
  useUpdateHttpProxy,
  useDeleteHttpProxy,
} from './http-proxy.queries';

// Watch hooks exports
export {
  useHttpProxiesWatch,
  useHttpProxyWatch,
  useTrafficProtectionPolicyWatch,
  waitForHttpProxyReady,
} from './http-proxy.watch';

// Utility exports
export {
  getParanoiaLevelLabel,
  formatWafProtectionDisplay,
  formatWafProtectionStatusDisplay,
} from './http-proxy.utils';

export {
  policyAttachesToProxy,
  selectPolicyForProxy,
  targetRefAttachesToProxy,
} from './http-proxy.waf-attach';

export {
  getWafProtectionState,
  isTrafficProtectionProgrammed,
  getTrafficProtectionProgrammedMessage,
  getTrafficProtectionProgrammedReason,
  formatWafProtectionStatusTooltip,
  type WafProtectionState,
} from './http-proxy.waf-status';
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
