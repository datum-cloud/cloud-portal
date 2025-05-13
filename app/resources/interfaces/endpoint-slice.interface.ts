import { IoK8sApiDiscoveryV1EndpointSlice } from '@/modules/control-plane/discovery/types.gen'

export interface IEndpointSliceControlResponseLite {
  uid?: string
  name?: string
  addressType?: IoK8sApiDiscoveryV1EndpointSlice['addressType']
  createdAt?: Date
}

export interface IEndpointSliceControlResponse {
  uid?: string
  name?: string
  addressType?: IoK8sApiDiscoveryV1EndpointSlice['addressType']
  createdAt?: Date
  resourceVersion?: string
  namespace?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export enum EndpointSliceAddressType {
  IPv4 = 'IPv4',
  IPv6 = 'IPv6',
  FQDN = 'FQDN',
}

export enum EndpointSlicePortProtocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}

export enum EndpointSlicePortPort {
  HTTP = 80,
  HTTPS = 443,
}
