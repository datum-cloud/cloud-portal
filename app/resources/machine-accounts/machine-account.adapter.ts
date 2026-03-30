import type {
  ComMiloapisIamV1Alpha1MachineAccount,
  ComMiloapisIamV1Alpha1MachineAccountKey,
} from '@/modules/control-plane/iam';
import type { MachineAccount, MachineAccountKey } from './types';

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

export function toMachineAccountKey(raw: ComMiloapisIamV1Alpha1MachineAccountKey): MachineAccountKey {
  const isUserManaged = !!raw.spec?.publicKey;
  const ready = raw.status?.conditions?.find((c) => c.type === 'Ready');

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    keyId: raw.status?.authProviderKeyId ?? raw.metadata?.uid ?? '',
    type: isUserManaged ? 'user-managed' : 'datum-managed',
    status: ready?.status === 'True' ? 'Active' : 'Revoked',
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
  machineAccountName: string,
  name: string,
  publicKey?: string,
  expiresAt?: string
): ComMiloapisIamV1Alpha1MachineAccountKey {
  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'MachineAccountKey',
    metadata: { name },
    spec: {
      machineAccountName,
      ...(publicKey && { publicKey }),
      ...(expiresAt && { expirationDate: expiresAt }),
    },
  };
}
