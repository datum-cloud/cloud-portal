import { ILabel } from './label.interface';
import { IoK8sNetworkingGatewayV1Gateway } from '@/modules/control-plane/gateway/types.gen';

export interface IGatewayControlResponse {
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  name?: string;
  gatewayClass?: string;
  listeners?: IoK8sNetworkingGatewayV1Gateway['spec']['listeners'];
  status?: IoK8sNetworkingGatewayV1Gateway['status'];
  addresses?: IoK8sNetworkingGatewayV1Gateway['spec']['addresses'];
  createdAt?: Date;
  labels?: ILabel;
  annotations?: ILabel;
}

export interface IGatewayControlResponseLite {
  uid?: string;
  name?: string;
  gatewayClass?: string;
  numberOfListeners?: number;
  addresses?: IoK8sNetworkingGatewayV1Gateway['spec']['addresses'];
  status?: IoK8sNetworkingGatewayV1Gateway['status'];
  createdAt?: Date;
}

export enum GatewayProtocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}

export enum GatewayPort {
  HTTP = 80,
  HTTPS = 443,
}

export enum GatewayTlsMode {
  TERMINATE = 'Terminate',
}

export enum GatewayAllowedRoutes {
  // ALL = 'All',
  // SELECTOR = 'Selector',
  SAME = 'Same',
}
