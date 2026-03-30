export interface MachineAccount {
  uid: string;
  name: string;
  displayName?: string;
  identityEmail: string;
  status: 'Active' | 'Disabled';
  keyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MachineAccountKey {
  uid: string;
  name: string;
  keyId: string;
  type: 'datum-managed' | 'user-managed';
  status: 'Active' | 'Revoked';
  createdAt: string;
  expiresAt?: string;
}

export interface CreateMachineAccountInput {
  name: string;
  displayName?: string;
}

export interface UpdateMachineAccountInput {
  displayName?: string;
  status?: 'Active' | 'Disabled';
}

export interface CreateMachineAccountKeyInput {
  name: string;
  type: 'datum-managed' | 'user-managed';
  publicKey?: string;
  expiresAt?: string;
}

export interface CreateMachineAccountKeyResponse {
  key: MachineAccountKey;
  privateKey?: string;
}
