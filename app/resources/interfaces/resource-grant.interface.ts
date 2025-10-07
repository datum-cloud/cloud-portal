import { ComMiloapisQuotaV1Alpha1ResourceGrant } from '@/modules/control-plane/quota';

export interface IResourceGrantControlResponse {
  name: string;
  createdAt?: Date;
  uid: string;
  namespace: string;
  status: ComMiloapisQuotaV1Alpha1ResourceGrant['status'];
}
