import { ComMiloapisIamV1Alpha1PolicyBinding } from '@/modules/control-plane/iam';

export interface IPolicyBindingScope {
  type: 'organization' | 'project';
  id: string; // organization id or project id
}

export interface IPolicyBindingControlResponse {
  name: string;
  createdAt: string;
  uid: string;
  resourceVersion: string;
  namespace: string;
  scope: IPolicyBindingScope;
  subjects: NonNullable<ComMiloapisIamV1Alpha1PolicyBinding['spec']>['subjects'];
  roleRef?: NonNullable<ComMiloapisIamV1Alpha1PolicyBinding['spec']>['roleRef'];
  resourceSelector?: NonNullable<ComMiloapisIamV1Alpha1PolicyBinding['spec']>['resourceSelector'];
  status: ComMiloapisIamV1Alpha1PolicyBinding['status'];
}
