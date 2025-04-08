import { IoK8sNetworkingGatewayV1Gateway } from '@/modules/control-plane/gateway/types.gen'

export interface IGatewayControlResponse {
  uid?: string
  resourceVersion?: string
  namespace?: string
  name?: string
  gatewayClass?: string
  numberOfListeners?: number
  status?: IoK8sNetworkingGatewayV1Gateway['status']
  createdAt?: Date
}
