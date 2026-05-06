import type {
  ComMiloApisSupportV1Alpha1SupportTicket,
  ComMiloApisSupportV1Alpha1SupportTicketList,
  ComMiloApisSupportV1Alpha1SupportMessage,
  ComMiloApisSupportV1Alpha1SupportMessageList,
} from '@/modules/control-plane/support';
import type { SupportTicket, SupportMessage } from './support.schema';

export function toSupportTicket(raw: ComMiloApisSupportV1Alpha1SupportTicket): SupportTicket {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    title: raw.spec.title,
    description: raw.spec.description,
    status: raw.spec.status ?? 'open',
    priority: raw.spec.priority ?? 'medium',
    tags: raw.spec.tags,
    organizationRef: raw.spec.organizationRef
      ? { name: raw.spec.organizationRef.name }
      : undefined,
    reporterRef: {
      name: raw.spec.reporterRef.name,
      displayName: raw.spec.reporterRef.displayName,
      email: raw.spec.reporterRef.email,
    },
    ownerRef: raw.spec.ownerRef
      ? { name: raw.spec.ownerRef.name, displayName: raw.spec.ownerRef.displayName }
      : undefined,
    messageCount: raw.status?.messageCount,
    lastActivity: raw.status?.lastActivity,
    readState: raw.status?.readState,
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(raw.metadata.creationTimestamp)
      : undefined,
  };
}

export function toSupportTicketList(
  raw: ComMiloApisSupportV1Alpha1SupportTicketList
): SupportTicket[] {
  return raw.items.map(toSupportTicket);
}

export function toSupportMessage(raw: ComMiloApisSupportV1Alpha1SupportMessage): SupportMessage {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    ticketRef: raw.spec.ticketRef,
    body: raw.spec.body,
    authorRef: {
      name: raw.spec.authorRef.name,
      displayName: raw.spec.authorRef.displayName,
    },
    authorType: raw.spec.authorType ?? 'customer',
    internal: raw.spec.internal ?? false,
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(raw.metadata.creationTimestamp)
      : undefined,
  };
}

export function toSupportMessageList(
  raw: ComMiloApisSupportV1Alpha1SupportMessageList
): SupportMessage[] {
  return raw.items.map(toSupportMessage);
}
