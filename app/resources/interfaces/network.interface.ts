import { ComDatumapisNetworkingV1AlphaNetwork } from '@/modules/control-plane/networking';

export interface INetworkControlResponse {
  name?: string;
  displayName?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  ipFamilies?: ComDatumapisNetworkingV1AlphaNetwork['spec']['ipFamilies'];
  mtu?: number;
  namespace?: string;
  ipam?: ComDatumapisNetworkingV1AlphaNetwork['spec']['ipam'];
}
