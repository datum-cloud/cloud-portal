import type { MachineAccount, MachineAccountKey } from './types';
import type { ComMiloapisIamV1Alpha1MachineAccount } from '@/modules/control-plane/iam';
import type { ComMiloapisGoMiloPkgApisIdentityV1Alpha1MachineAccountKey } from '@/modules/control-plane/identity';

const DESCRIPTION_ANNOTATION = 'kubernetes.io/description';

export function toMachineAccount(raw: ComMiloapisIamV1Alpha1MachineAccount): MachineAccount {
  const name = raw.metadata?.name ?? '';
  const state = raw.spec?.state ?? 'Active';

  return {
    uid: raw.metadata?.uid ?? '',
    name,
    displayName: raw.metadata?.annotations?.[DESCRIPTION_ANNOTATION],
    // Use the server-computed email from status; the format is
    // {name}@{namespace}.{project}.{global-suffix} and is not derivable client-side.
    identityEmail: raw.status?.email ?? '',
    status: state === 'Inactive' ? 'Disabled' : 'Active',
    keyCount: 0,
    createdAt: raw.metadata?.creationTimestamp ?? '',
    updatedAt: raw.metadata?.creationTimestamp ?? '',
  };
}

export function toMachineAccountKey(
  raw: ComMiloapisGoMiloPkgApisIdentityV1Alpha1MachineAccountKey
): MachineAccountKey {
  const isUserManaged = !!raw.spec?.publicKey;

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    keyId: raw.status?.authProviderKeyID ?? raw.metadata?.uid ?? '',
    type: isUserManaged ? 'user-managed' : 'datum-managed',
    status: raw.status?.authProviderKeyID ? 'Active' : 'Revoked',
    createdAt: raw.metadata?.creationTimestamp ?? '',
    expiresAt: raw.spec?.expirationDate,
  };
}

export function toCreateMachineAccountPayload(
  name: string,
  displayName?: string
): ComMiloapisIamV1Alpha1MachineAccount {
  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'MachineAccount',
    metadata: {
      name,
      ...(displayName && {
        annotations: { [DESCRIPTION_ANNOTATION]: displayName },
      }),
    },
    spec: { state: 'Active' },
  };
}

export function toCreateMachineAccountKeyPayload(
  machineAccountEmail: string,
  name: string,
  publicKey?: string,
  expiresAt?: string
): ComMiloapisGoMiloPkgApisIdentityV1Alpha1MachineAccountKey {
  return {
    apiVersion: 'identity.miloapis.com/v1alpha1',
    kind: 'MachineAccountKey',
    metadata: { name },
    spec: {
      machineAccountUserName: machineAccountEmail,
      ...(publicKey && { publicKey }),
      ...(expiresAt && {
        expirationDate: expiresAt.includes('T') ? expiresAt : `${expiresAt}T00:00:00Z`,
      }),
    },
  };
}
