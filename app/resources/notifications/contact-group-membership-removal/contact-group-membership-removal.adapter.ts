import type {
  ContactGroupMembershipRemoval,
  ContactGroupMembershipRemovalList,
  CreateContactGroupMembershipRemovalInput,
} from './contact-group-membership-removal.schema';
import type {
  ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemoval,
  ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemovalList,
} from '@/modules/control-plane/notification';

export function toContactGroupMembershipRemoval(
  raw: ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemoval
): ContactGroupMembershipRemoval {
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
    displayName: `${contactName} ⟂ ${contactGroupName}`,
    contactGroupName,
    contactName,
    username: status?.username,
    deletionTimestamp: metadata?.deletionTimestamp
      ? new Date(metadata.deletionTimestamp)
      : undefined,
  };
}

export function toContactGroupMembershipRemovalList(
  raw: ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemovalList,
  nextCursor?: string
): ContactGroupMembershipRemovalList {
  const cursor = nextCursor ?? raw.metadata?.continue ?? undefined;
  // Same reasoning as the membership list: a removal on its way out must not
  // hold a box unticked, or the save that re-subscribes finds nothing to do.
  const live = (raw.items ?? []).filter(
    (item) => typeof item.metadata?.deletionTimestamp === 'undefined'
  );
  return {
    items: live.map(toContactGroupMembershipRemoval),
    nextCursor: cursor ?? null,
    hasMore: !!cursor,
  };
}

export function toCreateContactGroupMembershipRemovalPayload(
  input: CreateContactGroupMembershipRemovalInput,
  contactGroupNamespace: string,
  contactNamespace: string
): Pick<
  ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemoval,
  'apiVersion' | 'kind' | 'metadata' | 'spec'
> {
  return {
    apiVersion: 'notification.miloapis.com/v1alpha1',
    kind: 'ContactGroupMembershipRemoval',
    metadata: { name: input.name },
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
