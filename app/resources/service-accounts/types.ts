import type { UseCase } from './service-account.schema';

/**
 * Whether the account currently holds a key it could authenticate with.
 * Tracked separately from `status`: `status` is the admin switch an operator
 * sets, this is the outcome of that switch plus the keys that actually exist.
 */
export type CredentialState = 'valid' | 'expired' | 'none';

export interface ServiceAccount {
  uid: string;
  name: string;
  displayName?: string;
  identityEmail: string;
  status: 'Active' | 'Disabled';
  /** Undefined until the account's keys have been loaded. */
  credentialState?: CredentialState;
  /** Undefined until the account's keys have been loaded. */
  keyCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAccountKey {
  uid: string;
  name: string;
  keyId: string;
  type: 'datum-managed' | 'user-managed';
  /** `Revoked` covers a key the auth provider has not issued an ID for yet. */
  status: 'Active' | 'Expired' | 'Revoked';
  createdAt: string;
  expiresAt?: string;
}

export interface CreateServiceAccountInput {
  name: string;
  displayName?: string;
  useCase?: UseCase;
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
