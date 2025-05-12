import { IoK8sApiDiscoveryV1EndpointSlice } from '@/modules/control-plane/discovery/types.gen'

export interface IEndpointSliceControlResponseLite {
  uid?: string
  name?: string
  addressType?: IoK8sApiDiscoveryV1EndpointSlice['addressType']
  createdAt?: Date
}
