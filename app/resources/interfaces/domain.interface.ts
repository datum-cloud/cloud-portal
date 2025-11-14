import { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';

export type IDomainNameserver = NonNullable<
  NonNullable<NonNullable<ComDatumapisNetworkingV1AlphaDomain['status']>['nameservers']>[number]
>;

export type IDomainRegistration = NonNullable<
  NonNullable<ComDatumapisNetworkingV1AlphaDomain['status']>['registration']
>;

export interface IDomainControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  domainName?: string;
  status?: ComDatumapisNetworkingV1AlphaDomain['status'];
}
