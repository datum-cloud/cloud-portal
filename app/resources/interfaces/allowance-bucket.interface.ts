import { ComMiloapisQuotaV1Alpha1AllowanceBucket } from '@/modules/control-plane/quota';

export interface IAllowanceBucketControlResponse {
  name: string;
  createdAt?: Date;
  uid: string;
  namespace: string;
  resourceType: string;
  status: ComMiloapisQuotaV1Alpha1AllowanceBucket['status'];
}
