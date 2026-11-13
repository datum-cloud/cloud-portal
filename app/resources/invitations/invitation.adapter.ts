import type {
  Invitation,
  InvitationList,
  CreateInvitationInput,
  InvitationOrganization,
  InviterUser,
} from './invitation.schema';
import type { ComMiloapisIamV1Alpha1UserInvitation } from '@/modules/control-plane/iam';
import { MILO_SYSTEM_ROLE_NAMESPACE } from '@/resources/roles/role.constants';
import { generateRandomString } from '@/utils/helpers/text.helper';
import { addHours, formatRFC3339 } from 'date-fns';

/** Label milo puts on a UserInvitation its email domain joining controller made. */
export const JOIN_METHOD_LABEL = 'iam.miloapis.com/join-method';
/** JOIN_METHOD_LABEL value of an email domain offer. */
export const JOIN_METHOD_EMAIL_DOMAIN = 'EmailDomain';
/** Label recording the email domain an offer was made for. */
export const EMAIL_DOMAIN_LABEL = 'iam.miloapis.com/email-domain';

function mapEmailDomain(labels?: Record<string, string>): string | undefined {
  if (labels?.[JOIN_METHOD_LABEL] !== JOIN_METHOD_EMAIL_DOMAIN) {
    return undefined;
  }
  return labels[EMAIL_DOMAIN_LABEL] || undefined;
}

/** Whether milo offered this invitation by email domain, rather than an owner sending it. */
export function isEmailDomainOffer(invitation: Pick<Invitation, 'emailDomain'>): boolean {
  return !!invitation.emailDomain;
}

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
    state: spec?.state ?? 'Pending',
    status: status ?? {},
    inviterUser: mapInviterUser(status?.inviterUser),
    organization: mapInvitationOrganization(status?.organization),
    emailDomain: mapEmailDomain(metadata?.labels),
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
    ? [{ name: input.role, namespace: input.roleNamespace ?? MILO_SYSTEM_ROLE_NAMESPACE }]
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
