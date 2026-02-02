import type {
  ContactGroup,
  ContactGroupList,
  CreateContactGroupInput,
  UpdateContactGroupInput,
} from './contact-group.schema';
import type {
  ComMiloapisNotificationV1Alpha1ContactGroup,
  ComMiloapisNotificationV1Alpha1ContactGroupList,
} from '@/modules/control-plane/notification';

export function toContactGroup(raw: ComMiloapisNotificationV1Alpha1ContactGroup): ContactGroup {
  const metadata = raw.metadata;
  const spec = raw.spec;

  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace,
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp ? new Date(metadata.creationTimestamp) : new Date(),
    updatedAt: undefined,
    displayName: spec?.displayName ?? metadata?.name ?? 'Contact group',
    visibility: spec?.visibility ?? 'private',
    providers: spec?.providers?.map((p) => ({ id: p.id, name: p.name })) ?? undefined,
    description: spec?.description ?? undefined,
  };
}

export function toContactGroupList(
  raw: ComMiloapisNotificationV1Alpha1ContactGroupList,
  nextCursor?: string
): ContactGroupList {
  const cursor = nextCursor ?? raw.metadata?.continue ?? undefined;
  return {
    items: (raw.items ?? []).map(toContactGroup),
    nextCursor: cursor ?? null,
    hasMore: !!cursor,
  };
}

export function toCreateContactGroupPayload(
  input: CreateContactGroupInput
): Pick<ComMiloapisNotificationV1Alpha1ContactGroup, 'apiVersion' | 'kind' | 'metadata' | 'spec'> {
  return {
    apiVersion: 'notification.miloapis.com/v1alpha1',
    kind: 'ContactGroup',
    metadata: { name: input.name },
    spec: {
      displayName: input.displayName,
      visibility: input.visibility,
      ...(input.providers ? { providers: input.providers } : {}),
    },
  };
}

export function toUpdateContactGroupPayload(input: UpdateContactGroupInput): {
  metadata: { resourceVersion: string };
  spec?: Partial<NonNullable<ComMiloapisNotificationV1Alpha1ContactGroup['spec']>>;
} {
  const spec: Record<string, unknown> = {};
  if (typeof input.displayName !== 'undefined') spec.displayName = input.displayName;
  if (typeof input.visibility !== 'undefined') spec.visibility = input.visibility;
  if (typeof input.providers !== 'undefined') spec.providers = input.providers;

  return {
    metadata: { resourceVersion: input.resourceVersion },
    ...(Object.keys(spec).length > 0 ? { spec } : {}),
  };
}
