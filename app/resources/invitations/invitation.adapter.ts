import { INVITATION_LIFETIME_DAYS, INVITATION_RESENT_FROM_ANNOTATION } from './invitation.expiry';
import type {
  Invitation,
  InvitationList,
  CreateInvitationInput,
  InvitationState,
  InvitationOrganization,
  InviterUser,
} from './invitation.schema';
import type { ComMiloapisIamV1Alpha1UserInvitation } from '@/modules/control-plane/iam';
import { MILO_SYSTEM_ROLE_NAMESPACE } from '@/resources/roles/role.constants';
import { generateRandomString } from '@/utils/helpers/text.helper';
import { addDays, formatRFC3339 } from 'date-fns';

function mapInviterUser(raw?: {
  displayName?: string;
  emailAddress?: string;
}): InviterUser | undefined {
  if (!raw) {
    return undefined;
  }
  const displayName = raw.displayName?.trim() || raw.emailAddress?.trim();
  if (!displayName) {
    return undefined;
  }
  return { displayName };
}

function mapInvitationOrganization(raw?: {
  displayName?: string;
}): InvitationOrganization | undefined {
  const name = raw?.displayName?.trim();
  if (!name) {
    return undefined;
  }
  return { displayName: name };
}

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
    roleNamespace: spec?.roles?.[0]?.namespace ?? MILO_SYSTEM_ROLE_NAMESPACE,
    state: (spec?.state ?? 'Pending') as InvitationState,
    status: status ?? {},
    inviterUser: mapInviterUser(status?.inviterUser),
    organization: mapInvitationOrganization(status?.organization),
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
): {
  apiVersion: string;
  kind: string;
  metadata: { name: string; annotations?: Record<string, string> };
  spec: any;
} {
  const roles = input.role
    ? [{ name: input.role, namespace: input.roleNamespace ?? MILO_SYSTEM_ROLE_NAMESPACE }]
    : [];

  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'UserInvitation',
    metadata: {
      name: `${organizationId}-${generateRandomString(8)}`,
      ...(input.resentFrom
        ? { annotations: { [INVITATION_RESENT_FROM_ANNOTATION]: input.resentFrom } }
        : {}),
    },
    spec: {
      email: input.email,
      expirationDate: formatRFC3339(addDays(new Date(), INVITATION_LIFETIME_DAYS)),
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
