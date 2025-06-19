import {
  ComDatumapisNetworkingV1AlphaNetwork,
  ComDatumapisNetworkingV1AlphaNetworkBinding,
  ComDatumapisNetworkingV1AlphaNetworkContext,
  ComDatumapisNetworkingV1AlphaSubnet,
  ComDatumapisNetworkingV1AlphaSubnetClaim,
} from '@/modules/control-plane/networking';

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

export interface INetworkBindingControlResponse {
  name?: string;
  uid?: string;
  resourceVersion?: string;
  createdAt?: Date;
  namespace?: string;
  spec?: ComDatumapisNetworkingV1AlphaNetworkBinding['spec'];
  status?: ComDatumapisNetworkingV1AlphaNetworkBinding['status'];
}

export interface INetworkContextControlResponse {
  name?: string;
  uid?: string;
  resourceVersion?: string;
  createdAt?: Date;
  namespace?: string;
  spec?: ComDatumapisNetworkingV1AlphaNetworkContext['spec'];
  status?: ComDatumapisNetworkingV1AlphaNetworkContext['status'];
}

export interface ISubnetControlResponse {
  name?: string;
  uid?: string;
  resourceVersion?: string;
  createdAt?: Date;
  namespace?: string;
  spec?: ComDatumapisNetworkingV1AlphaSubnet['spec'];
  status?: ComDatumapisNetworkingV1AlphaSubnet['status'];
}

export interface ISubnetClaimControlResponse {
  name?: string;
  uid?: string;
  resourceVersion?: string;
  createdAt?: Date;
  namespace?: string;
  spec?: ComDatumapisNetworkingV1AlphaSubnetClaim['spec'];
  status?: ComDatumapisNetworkingV1AlphaSubnetClaim['status'];
}
