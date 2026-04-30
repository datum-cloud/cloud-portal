export interface ServiceAccount {
  uid: string;
  name: string;
  displayName?: string;
  identityEmail: string;
  status: 'Active' | 'Disabled';
  keyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAccountKey {
  uid: string;
  name: string;
  keyId: string;
  type: 'datum-managed' | 'user-managed';
  status: 'Active' | 'Revoked';
  createdAt: string;
  expiresAt?: string;
}

export interface CreateServiceAccountInput {
  name: string;
  displayName?: string;
}

export interface UpdateServiceAccountInput {
  displayName?: string;
  status?: 'Active' | 'Disabled';
}

export interface CreateServiceAccountKeyInput {
  name: string;
  type: 'datum-managed' | 'user-managed';
  publicKey?: string;
  expiresAt?: string;
}

export interface CreateServiceAccountKeyResponse {
  key: ServiceAccountKey;
  credentials?: DatumCredentialsFile;
}

export interface DatumCredentialsFile {
  type: 'datum_service_account';
  client_email: string;
  client_id: string;
  private_key_id: string;
  private_key: string;
  scope?: string;
}
