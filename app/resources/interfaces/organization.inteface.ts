export enum VerificationState {
  UNSPECIFIED = 'UNSPECIFIED',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
}

export interface IOrganizationSpec {
  description?: string;
}

export interface IOrganizationStatus {
  verificationState: VerificationState;
  internal: boolean;
  personal: boolean;
}

export interface IOrganization {
  /**
   * The ID of this Organization
   * This is a unique identifier used throughout the application
   * If organizationId is empty, the uid value will be used instead
   */
  id?: string;
  name: string;
  organizationId: string;
  uid: string;
  displayName?: string;
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
  createTime: string;
  updateTime: string;
  deleteTime?: string;
  reconciling: boolean;
  etag: string;
  spec: IOrganizationSpec;
  status: IOrganizationStatus;
}
