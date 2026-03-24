import type {
  Invitation,
  InvitationList,
  CreateInvitationInput,
  InvitationState,
} from './invitation.schema';
import type { ComMiloapisIamV1Alpha1UserInvitation } from '@/modules/control-plane/iam';
import { generateRandomString } from '@/utils/helpers/text.helper';
import { addHours, formatRFC3339 } from 'date-fns';

/**
 * Transform raw API UserInvitation to domain Invitation type
 */
export function toInvitation(raw: ComMiloapisIamV1Alpha1UserInvitation): Invitation {
  const { metadata, spec, status } = raw;

  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace ?? '',
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp,
    email: spec?.email ?? '',
    expirationDate: spec?.expirationDate,
    familyName: spec?.familyName,
    givenName: spec?.givenName,
    invitedBy: spec?.invitedBy?.name,
    organizationName: spec?.organizationRef?.name ?? '',
    role: spec?.roles?.[0]?.name,
    roleNamespace: spec?.roles?.[0]?.namespace ?? 'milo-system',
    state: (spec?.state ?? 'Pending') as InvitationState,
    status: status ?? {},
    inviterUser: status?.inviterUser,
    organization: status?.organization,
  };
}

/**
 * Transform raw API list to domain InvitationList
 */
export function toInvitationList(
  items: ComMiloapisIamV1Alpha1UserInvitation[],
  nextCursor?: string
): InvitationList {
  return {
    items: items.map(toInvitation),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Transform CreateInvitationInput to API create payload
 */
export function toCreateInvitationPayload(
  organizationId: string,
  input: CreateInvitationInput
): { apiVersion: string; kind: string; metadata: { name: string }; spec: any } {
  const roles = input.role
    ? [{ name: input.role, namespace: input.roleNamespace ?? 'milo-system' }]
    : [];

  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'UserInvitation',
    metadata: {
      name: `${organizationId}-${generateRandomString(8)}`,
    },
    spec: {
      email: input.email,
      expirationDate: formatRFC3339(addHours(new Date(), 24)), // 24 hours (RFC3339 format)
      organizationRef: { name: organizationId },
      roles,
      state: 'Pending',
    },
  };
}

/**
 * Transform UpdateInvitationStateInput to API patch payload
 */
export function toUpdateInvitationStatePayload(state: 'Accepted' | 'Declined'): {
  apiVersion: string;
  kind: string;
  spec: { state: string };
} {
  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'UserInvitation',
    spec: {
      state,
    },
  };
}
