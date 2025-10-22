import { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';

export interface IDomainControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  domainName?: string;
  status?: ComDatumapisNetworkingV1AlphaDomain['status'];
}
