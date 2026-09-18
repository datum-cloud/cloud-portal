import type { UseCase } from './service-account.schema';
import type { CredentialState, ServiceAccount, ServiceAccountKey } from './types';
import type { ComMiloapisIamV1Alpha1ServiceAccount } from '@/modules/control-plane/iam';
import type { GoMiloapisComMiloPkgApisIdentityV1Alpha1ServiceAccountKey } from '@/modules/control-plane/identity';

const DESCRIPTION_ANNOTATION = 'kubernetes.io/description';
// Cross-tool annotation: any client (web, CLI, terraform) that knows the
// user's intent at creation time stamps it here so consumers can group/filter
// service accounts by purpose. Namespaced under the resource's own API group.
export const USE_CASE_ANNOTATION = 'iam.miloapis.com/use-case';

export function toServiceAccount(raw: ComMiloapisIamV1Alpha1ServiceAccount): ServiceAccount {
  const name = raw.metadata?.name ?? '';
  const state = raw.spec?.state ?? 'Active';

  return {
    uid: raw.metadata?.uid ?? '',
    name,
    displayName: raw.metadata?.annotations?.[DESCRIPTION_ANNOTATION],
    // Use the server-computed email from status; the format is
    // {name}@{namespace}.{project}.{global-suffix} and is not derivable client-side.
    identityEmail: raw.status?.email ?? '',
    // spec.state only. Whether the account can actually authenticate depends on
    // its keys, which this resource does not carry — see withKeySummary.
    status: state === 'Inactive' ? 'Disabled' : 'Active',
    createdAt: raw.metadata?.creationTimestamp ?? '',
    updatedAt: raw.metadata?.creationTimestamp ?? '',
  };
}

function toKeyStatus(
  isProvisioned: boolean,
  expiresAt: string | undefined,
  now: Date
): ServiceAccountKey['status'] {
  if (!isProvisioned) return 'Revoked';
  if (isKeyExpired({ expiresAt }, now)) return 'Expired';
  return 'Active';
}

export function toServiceAccountKey(
  raw: GoMiloapisComMiloPkgApisIdentityV1Alpha1ServiceAccountKey,
  now: Date = new Date()
): ServiceAccountKey {
  const isUserManaged = !!raw.spec?.publicKey;
  const expiresAt = raw.spec?.expirationDate;

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    keyId: raw.status?.authProviderKeyID ?? raw.metadata?.uid ?? '',
    type: isUserManaged ? 'user-managed' : 'datum-managed',
    status: toKeyStatus(!!raw.status?.authProviderKeyID, expiresAt, now),
    createdAt: raw.metadata?.creationTimestamp ?? '',
    expiresAt,
  };
}

/**
 * A key with no expiration date never expires. An unparseable date is treated
 * as not expired: refusing to authenticate on a value we cannot read would be
 * a worse failure than showing the key as usable.
 */
export function isKeyExpired(key: Pick<ServiceAccountKey, 'expiresAt'>, now: Date): boolean {
  if (!key.expiresAt) return false;
  const expiresAtMs = Date.parse(key.expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs <= now.getTime();
}

/**
 * Expiry is the only disqualifier here. A key still awaiting provisioning
 * carries `Revoked` status but is on its way to working, so it counts as a
 * credential the account has — otherwise a freshly created account would
 * briefly report itself as expired.
 */
export function deriveCredentialState(keys: ServiceAccountKey[], now: Date): CredentialState {
  if (keys.length === 0) return 'none';
  return keys.some((key) => !isKeyExpired(key, now)) ? 'valid' : 'expired';
}

/**
 * Carries the key-derived fields from an already-enriched account onto a fresh
 * one. A watch event delivers only the ServiceAccount resource, which says
 * nothing about keys, so re-transforming a live update would otherwise reset
 * the badge to Active and the key count to unknown.
 */
export function preserveKeySummary(
  previous: ServiceAccount | undefined,
  next: ServiceAccount
): ServiceAccount {
  if (!previous) return next;
  return {
    ...next,
    credentialState: next.credentialState ?? previous.credentialState,
    keyCount: next.keyCount ?? previous.keyCount,
  };
}

/** Returns a copy of the account with the key-derived fields filled in. */
export function withKeySummary(
  account: ServiceAccount,
  keys: ServiceAccountKey[],
  now: Date = new Date()
): ServiceAccount {
  return {
    ...account,
    credentialState: deriveCredentialState(keys, now),
    keyCount: keys.length,
  };
}

export function toCreateServiceAccountPayload(
  name: string,
  displayName?: string,
  useCase?: UseCase
): ComMiloapisIamV1Alpha1ServiceAccount {
  const annotations: Record<string, string> = {};
  if (displayName) annotations[DESCRIPTION_ANNOTATION] = displayName;
  if (useCase) annotations[USE_CASE_ANNOTATION] = useCase;

  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'ServiceAccount',
    metadata: {
      name,
      ...(Object.keys(annotations).length > 0 && { annotations }),
    },
    spec: { state: 'Active' },
  };
}

export function toCreateServiceAccountKeyPayload(
  serviceAccountEmail: string,
  name: string,
  publicKey?: string,
  expiresAt?: string
): GoMiloapisComMiloPkgApisIdentityV1Alpha1ServiceAccountKey {
  return {
    apiVersion: 'identity.miloapis.com/v1alpha1',
    kind: 'ServiceAccountKey',
    metadata: { name },
    spec: {
      serviceAccountUserName: serviceAccountEmail,
      ...(publicKey && { publicKey }),
      ...(expiresAt && {
        expirationDate: expiresAt.includes('T') ? expiresAt : `${expiresAt}T00:00:00Z`,
      }),
    },
  };
}
