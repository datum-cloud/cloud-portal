import {
  listSupportMiloapisComV1Alpha1SupportTicket,
  readSupportMiloapisComV1Alpha1SupportTicket,
  createSupportMiloapisComV1Alpha1SupportTicket,
  patchSupportMiloapisComV1Alpha1SupportTicket,
  listSupportMiloapisComV1Alpha1SupportMessage,
  createSupportMiloapisComV1Alpha1SupportMessage,
  patchSupportMiloapisComV1Alpha1SupportMessage,
} from '@/modules/control-plane/support';
import { logger } from '@/modules/logger';
import { mapApiError } from '@/utils/errors/error-mapper';
import { toSupportTicket, toSupportTicketList, toSupportMessage, toSupportMessageList } from './support.adapter';
import type { SupportTicket, SupportMessage, CreateTicketInput } from './support.schema';

const SERVICE_NAME = 'SupportService';

export const supportKeys = {
  all: ['support'] as const,
  tickets: {
    list: (orgId: string) => ['support', 'tickets', 'list', orgId] as const,
    detail: (name: string) => ['support', 'tickets', name] as const,
  },
  messages: {
    list: (ticketName: string) => ['support', 'messages', ticketName] as const,
  },
};

export function createSupportService() {
  return {
    async listTickets(orgId: string): Promise<SupportTicket[]> {
      const startTime = Date.now();
      try {
        const response = await listSupportMiloapisComV1Alpha1SupportTicket({
          query: {
            fieldSelector: `spec.organizationRef.name=${orgId}`,
          },
        });
        const result = toSupportTicketList(response.data);
        logger.service(SERVICE_NAME, 'listTickets', {
          input: { orgId },
          duration: Date.now() - startTime,
        });
        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listTickets failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async getTicket(name: string): Promise<SupportTicket> {
      const startTime = Date.now();
      try {
        const response = await readSupportMiloapisComV1Alpha1SupportTicket({
          path: { name },
        });
        const ticket = toSupportTicket(response.data);
        logger.service(SERVICE_NAME, 'getTicket', {
          input: { name },
          duration: Date.now() - startTime,
        });
        return ticket;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getTicket failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async createTicket(
      orgId: string,
      input: CreateTicketInput,
      reporterRef: { name: string; displayName?: string; email?: string }
    ): Promise<SupportTicket> {
      const startTime = Date.now();
      try {
        const response = await createSupportMiloapisComV1Alpha1SupportTicket({
          body: {
            apiVersion: 'support.miloapis.com/v1alpha1',
            kind: 'SupportTicket',
            metadata: {
              generateName: 'ticket-',
            },
            spec: {
              title: input.title,
              description: input.description,
              priority: input.priority,
              organizationRef: { name: orgId },
              reporterRef,
            },
          },
        });
        const ticket = toSupportTicket(response.data);
        logger.service(SERVICE_NAME, 'createTicket', {
          input: { orgId, title: input.title },
          duration: Date.now() - startTime,
        });
        return ticket;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.createTicket failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async listMessages(ticketName: string): Promise<SupportMessage[]> {
      const startTime = Date.now();
      try {
        const response = await listSupportMiloapisComV1Alpha1SupportMessage({
          query: {
            fieldSelector: `spec.ticketRef=${ticketName},spec.internal=false`,
          },
        });
        const result = toSupportMessageList(response.data);
        logger.service(SERVICE_NAME, 'listMessages', {
          input: { ticketName },
          duration: Date.now() - startTime,
        });
        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listMessages failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async updateMessage(name: string, body: string): Promise<SupportMessage> {
      const startTime = Date.now();
      try {
        const response = await patchSupportMiloapisComV1Alpha1SupportMessage({
          path: { name },
          body: { spec: { body } },
        });
        const message = toSupportMessage(response.data);
        logger.service(SERVICE_NAME, 'updateMessage', {
          input: { name },
          duration: Date.now() - startTime,
        });
        return message;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.updateMessage failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async markRead(ticketName: string, principalId: string): Promise<void> {
      try {
        await patchSupportMiloapisComV1Alpha1SupportTicket({
          path: { name: ticketName },
          body: { status: { readState: { [principalId]: new Date().toISOString() } } },
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.markRead failed`, error as Error);
      }
    },

    async updateLastActivity(ticketName: string): Promise<void> {
      try {
        await patchSupportMiloapisComV1Alpha1SupportTicket({
          path: { name: ticketName },
          body: { status: { lastActivity: new Date().toISOString() } },
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.updateLastActivity failed`, error as Error);
      }
    },

    async createMessage(
      ticketName: string,
      body: string,
      authorRef: { name: string; displayName?: string; email?: string }
    ): Promise<SupportMessage> {
      const startTime = Date.now();
      try {
        const response = await createSupportMiloapisComV1Alpha1SupportMessage({
          body: {
            apiVersion: 'support.miloapis.com/v1alpha1',
            kind: 'SupportMessage',
            metadata: {
              generateName: 'message-',
            },
            spec: {
              ticketRef: ticketName,
              body,
              authorRef,
              authorType: 'customer',
              internal: false,
            },
          },
        });
        const message = toSupportMessage(response.data);
        logger.service(SERVICE_NAME, 'createMessage', {
          input: { ticketName },
          duration: Date.now() - startTime,
        });
        return message;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.createMessage failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type SupportService = ReturnType<typeof createSupportService>;
