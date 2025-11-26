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
  namespace?: string;
  deletionTimestamp?: string | Date;
}

export interface IProjectMetadata {
  status: 'active' | 'deleting' | 'deleted';
  deletedAt?: string;
}

export interface ICachedProject extends IProjectControlResponse {
  _meta?: IProjectMetadata;
}
