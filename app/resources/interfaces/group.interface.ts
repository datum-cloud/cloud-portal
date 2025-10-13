import { ComMiloapisIamV1Alpha1Group } from '@/modules/control-plane/iam';

export interface IGroupControlResponse {
  name: string;
  createdAt: string;
  uid: string;
  resourceVersion: string;
  namespace: string;
  status: ComMiloapisIamV1Alpha1Group['status'];
}
