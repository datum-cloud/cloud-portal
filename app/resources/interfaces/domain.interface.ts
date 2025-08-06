import { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';

export interface IDomainControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  domainName?: string;
  status?: ComDatumapisNetworkingV1AlphaDomain['status'] & {
    verification?: {
      dnsRecord?: {
        name: string;
        type: string;
        content: string;
      };
      httpToken?: {
        body: string;
        url: string;
      };
    };
  };
}
