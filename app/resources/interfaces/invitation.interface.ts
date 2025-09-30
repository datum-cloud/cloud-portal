import { ComMiloapisIamV1Alpha1UserInvitation } from '@/modules/control-plane/iam';

export interface IInvitationControlResponse {
  name: string;
  createdAt?: string;
  uid: string;
  resourceVersion: string;
  namespace: string;
  email: string;
  expirationDate?: string;
  familyName?: string;
  givenName?: string;
  invitedBy?: string;
  organizationName: string;
  role?: string;
  state: NonNullable<ComMiloapisIamV1Alpha1UserInvitation['spec']>['state'];
  status: ComMiloapisIamV1Alpha1UserInvitation['status'];
}
