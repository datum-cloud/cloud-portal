import type {
  ContactGroupMembership,
  ContactGroupMembershipList,
  CreateContactGroupMembershipInput,
} from './contact-group-membership.schema';
import type {
  ComMiloapisNotificationV1Alpha1ContactGroupMembership,
  ComMiloapisNotificationV1Alpha1ContactGroupMembershipList,
} from '@/modules/control-plane/notification';

export function toContactGroupMembership(
  raw: ComMiloapisNotificationV1Alpha1ContactGroupMembership
): ContactGroupMembership {
  const metadata = raw.metadata;
  const spec = raw.spec;
  const status = raw.status;

  const contactGroupName = spec?.contactGroupRef?.name ?? '';
  const contactName = spec?.contactRef?.name ?? '';

  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace,
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp ? new Date(metadata.creationTimestamp) : new Date(),
    updatedAt: undefined,
    displayName: `${contactName} → ${contactGroupName}`,
    contactGroupName,
    contactName,
    username: status?.username,
  };
}

export function toContactGroupMembershipList(
  raw: ComMiloapisNotificationV1Alpha1ContactGroupMembershipList,
  nextCursor?: string
): ContactGroupMembershipList {
  const cursor = nextCursor ?? raw.metadata?.continue ?? undefined;
  return {
    items: (raw.items ?? []).map(toContactGroupMembership),
    nextCursor: cursor ?? null,
    hasMore: !!cursor,
  };
}

export function toCreateContactGroupMembershipPayload(
  input: CreateContactGroupMembershipInput,
  contactGroupNamespace: string,
  contactNamespace: string
): Pick<
  ComMiloapisNotificationV1Alpha1ContactGroupMembership,
  'apiVersion' | 'kind' | 'metadata' | 'spec'
> {
  return {
    apiVersion: 'notification.miloapis.com/v1alpha1',
    kind: 'ContactGroupMembership',
    metadata: {
      name: input.name,
    },
    spec: {
      contactGroupRef: {
        name: input.contactGroupName,
        namespace: contactGroupNamespace,
      },
      contactRef: {
        name: input.contactName,
        namespace: contactNamespace,
      },
    },
  };
}
