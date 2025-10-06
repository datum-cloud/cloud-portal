import { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';

export interface IMemberControlResponse {
  name: string;
  createdAt: Date;
  uid: string;
  resourceVersion: string;
  user: {
    id: string;
    email?: string;
    familyName?: string;
    givenName?: string;
  };
  organization: {
    id: string;
    displayName?: string;
    type?: string;
  };
  status: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership['status'];
}
