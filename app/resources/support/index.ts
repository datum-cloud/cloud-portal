// Schema exports
export {
  supportTicketSchema,
  supportMessageSchema,
  createTicketSchema,
  createMessageSchema,
  type SupportTicket,
  type SupportMessage,
  type CreateTicketInput,
  type CreateMessageInput,
} from './support.schema';

// Adapter exports
export {
  toSupportTicket,
  toSupportTicketList,
  toSupportMessage,
  toSupportMessageList,
} from './support.adapter';

// Service exports
export { createSupportService, supportKeys, type SupportService } from './support.service';

// Query hook exports
export { useTickets, useTicket, useMessages, useCreateTicket, useCreateMessage, useUpdateMessage, useMarkTicketRead, useUpdateTicketLastActivity } from './support.queries';
export { useUnreadSupportCount } from './use-unread-support-count';
