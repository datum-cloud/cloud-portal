import { IoK8sNetworkingGatewayV1Gateway } from '@/modules/control-plane/gateway/types.gen'

export interface IGatewayControlResponse {
  uid?: string
  resourceVersion?: string
  namespace?: string
  name?: string
  gatewayClass?: string
  listeners?: IoK8sNetworkingGatewayV1Gateway['spec']['listeners']
  // numberOfListeners?: number
  status?: IoK8sNetworkingGatewayV1Gateway['status']
  createdAt?: Date
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export enum GatewayProtocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}

export enum GatewayTlsMode {
  TERMINATE = 'Terminate',
}

export enum GatewayAllowedRoutes {
  // ALL = 'All',
  // SELECTOR = 'Selector',
  SAME = 'Same',
}
