import { ILabel } from './label.interface';
import { ComMiloapisResourcemanagerV1Alpha1Project } from '@/modules/control-plane/resource-manager';

export interface IProjectControlResponse {
  name?: string;
  description?: string;
  createdAt?: string | Date;
  organizationId?: string;
  resourceVersion?: string;
  uid?: string;
  status?: ComMiloapisResourcemanagerV1Alpha1Project['status'];
  labels?: ILabel;
}
