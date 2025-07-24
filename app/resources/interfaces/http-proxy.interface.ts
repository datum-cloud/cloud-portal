import { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';

export interface IHttpProxyControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  endpoint?: string;
  status?: ComDatumapisNetworkingV1AlphaHttpProxy['status'];
}
