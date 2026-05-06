import { z } from 'zod';

// SupportTicket domain type (after adapter transformation)
export const supportTicketSchema = z.object({
  uid: z.string(),
  name: z.string(),
  resourceVersion: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z
    .enum(['open', 'in-progress', 'waiting-on-customer', 'resolved', 'closed'])
    .default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).optional(),
  organizationRef: z.object({ name: z.string() }).optional(),
  reporterRef: z.object({
    name: z.string(),
    displayName: z.string().optional(),
    email: z.string().optional(),
  }),
  ownerRef: z
    .object({ name: z.string(), displayName: z.string().optional() })
    .optional(),
  messageCount: z.number().optional(),
  lastActivity: z.string().optional(),
  readState: z.record(z.string(), z.string()).optional(),
  createdAt: z.coerce.date().optional(),
});

export type SupportTicket = z.infer<typeof supportTicketSchema>;

// SupportMessage domain type (after adapter transformation)
export const supportMessageSchema = z.object({
  uid: z.string(),
  name: z.string(),
  ticketRef: z.string(),
  body: z.string(),
  authorRef: z.object({
    name: z.string(),
    displayName: z.string().optional(),
  }),
  authorType: z.enum(['staff', 'customer']).default('customer'),
  internal: z.boolean().default(false),
  createdAt: z.coerce.date().optional(),
});

export type SupportMessage = z.infer<typeof supportMessageSchema>;

// Form input schemas
export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const createMessageSchema = z.object({
  body: z.string().min(1, 'Message cannot be empty'),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
