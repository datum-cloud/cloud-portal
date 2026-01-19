import type {
  Contact,
  ContactList,
  CreateContactInput,
  UpdateContactInput,
} from './contact.schema';
import type {
  ComMiloapisNotificationV1Alpha1Contact,
  ComMiloapisNotificationV1Alpha1ContactList,
} from '@/modules/control-plane/notification';

function toContactDisplayName(input: {
  givenName?: string;
  familyName?: string;
  email?: string;
  name?: string;
}): string {
  const fullName = [input.givenName, input.familyName].filter(Boolean).join(' ').trim();
  return fullName || input.email || input.name || 'Contact';
}

export function toContact(raw: ComMiloapisNotificationV1Alpha1Contact): Contact {
  const metadata = raw.metadata;
  const spec = raw.spec;
  const status = raw.status;

  const givenName = spec?.givenName;
  const familyName = spec?.familyName;
  const email = spec?.email ?? '';

  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace,
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp ? new Date(metadata.creationTimestamp) : new Date(),
    updatedAt: undefined,
    displayName: toContactDisplayName({
      givenName,
      familyName,
      email,
      name: metadata?.name,
    }),
    email,
    givenName,
    familyName,
    subjectName: spec?.subject?.name,
    providers: status?.providers?.map((p) => ({ id: p.id, name: p.name })) ?? undefined,
  };
}

export function toContactList(
  raw: ComMiloapisNotificationV1Alpha1ContactList,
  nextCursor?: string
): ContactList {
  const cursor = nextCursor ?? raw.metadata?.continue ?? undefined;
  return {
    items: (raw.items ?? []).map(toContact),
    nextCursor: cursor ?? null,
    hasMore: !!cursor,
  };
}

export function toCreateContactPayload(
  input: CreateContactInput
): Pick<ComMiloapisNotificationV1Alpha1Contact, 'apiVersion' | 'kind' | 'metadata' | 'spec'> {
  return {
    apiVersion: 'notification.miloapis.com/v1alpha1',
    kind: 'Contact',
    metadata: { name: input.name },
    spec: {
      email: input.email,
      ...(input.givenName ? { givenName: input.givenName } : {}),
      ...(input.familyName ? { familyName: input.familyName } : {}),
      ...(input.subjectName
        ? {
            subject: {
              apiGroup: 'iam.miloapis.com',
              kind: 'User',
              name: input.subjectName,
            },
          }
        : {}),
    },
  };
}

export function toUpdateContactPayload(input: UpdateContactInput): {
  metadata: { resourceVersion: string };
  spec?: Partial<NonNullable<ComMiloapisNotificationV1Alpha1Contact['spec']>>;
} {
  const spec: Record<string, unknown> = {};
  if (typeof input.email !== 'undefined') spec.email = input.email;
  if (typeof input.givenName !== 'undefined') spec.givenName = input.givenName;
  if (typeof input.familyName !== 'undefined') spec.familyName = input.familyName;

  return {
    metadata: { resourceVersion: input.resourceVersion },
    ...(Object.keys(spec).length > 0 ? { spec } : {}),
  };
}
