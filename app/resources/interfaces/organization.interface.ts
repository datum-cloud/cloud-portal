import { ComMiloapisResourcemanagerV1Alpha1Organization } from '@/modules/control-plane/resource-manager';
import { ILabel } from '@/resources/interfaces/label.interface';

export enum OrganizationType {
  Personal = 'Personal',
  Standard = 'Standard',
}
export interface IOrganization {
  name?: string;
  namespace?: string;
  uid?: string;
  displayName?: string;
  annotations?: ILabel;
  labels?: ILabel;
  resourceVersion?: string;
  type?: OrganizationType;
  createdAt?: Date;
  status?: ComMiloapisResourcemanagerV1Alpha1Organization['status'];
}
