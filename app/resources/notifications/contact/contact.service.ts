import { DEFAULT_NOTIFICATION_NAMESPACE, getNotificationScopedBase } from '../notification-scope';
import type { NotificationScope } from '../notification-scope';
import {
  toContact,
  toContactList,
  toCreateContactPayload,
  toUpdateContactPayload,
} from './contact.adapter';
import {
  createContactInputSchema,
  updateContactInputSchema,
  type Contact,
  type CreateContactInput,
  type UpdateContactInput,
} from './contact.schema';
import {
  createNotificationMiloapisComV1Alpha1NamespacedContact,
  deleteNotificationMiloapisComV1Alpha1NamespacedContact,
  listNotificationMiloapisComV1Alpha1NamespacedContact,
  patchNotificationMiloapisComV1Alpha1NamespacedContact,
  readNotificationMiloapisComV1Alpha1NamespacedContact,
  type ComMiloapisNotificationV1Alpha1Contact,
  type ComMiloapisNotificationV1Alpha1ContactList,
} from '@/modules/control-plane/notification';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';

export const notificationContactKeys = {
  all: ['notification', 'contacts'] as const,
  lists: () => [...notificationContactKeys.all, 'list'] as const,
  list: (scopeKey: string, namespace: string) =>
    [...notificationContactKeys.lists(), scopeKey, namespace] as const,
  details: () => [...notificationContactKeys.all, 'detail'] as const,
  detail: (scopeKey: string, namespace: string, name: string) =>
    [...notificationContactKeys.details(), scopeKey, namespace, name] as const,
};

const SERVICE_NAME = 'NotificationContactService';

export function createNotificationContactService() {
  return {
    async list(
      scope: NotificationScope,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      limit?: number,
      _options?: ServiceOptions
    ): Promise<Contact[]> {
      const startTime = Date.now();

      try {
        const response = await listNotificationMiloapisComV1Alpha1NamespacedContact({
          baseURL: getNotificationScopedBase(scope),
          path: { namespace },
          query: {
            limit: limit ?? 100,
          },
        });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactList;
        const result = toContactList(data);

        logger.service(SERVICE_NAME, 'list', {
          input: { scope, namespace, limit },
          duration: Date.now() - startTime,
        });

        return result.items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(
      scope: NotificationScope,
      name: string,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      _options?: ServiceOptions
    ): Promise<Contact> {
      const startTime = Date.now();

      try {
        const response = await readNotificationMiloapisComV1Alpha1NamespacedContact({
          baseURL: getNotificationScopedBase(scope),
          path: { namespace, name },
        });

        const data = response.data as ComMiloapisNotificationV1Alpha1Contact;
        if (!data) {
          throw new Error(`Contact ${name} not found`);
        }

        const result = toContact(data);

        logger.service(SERVICE_NAME, 'get', {
          input: { scope, namespace, name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async create(
      scope: NotificationScope,
      input: CreateContactInput,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      options?: ServiceOptions
    ): Promise<Contact> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createContactInputSchema, input, {
          message: 'Invalid contact data',
        });

        const payload = toCreateContactPayload(validated);
        const response = await createNotificationMiloapisComV1Alpha1NamespacedContact({
          baseURL: getNotificationScopedBase(scope),
          path: { namespace },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        const data = response.data as ComMiloapisNotificationV1Alpha1Contact;
        if (!data) {
          throw new Error('Failed to create contact');
        }

        const result = toContact(data);

        logger.service(SERVICE_NAME, 'create', {
          input: { scope, namespace, name: validated.name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(
      scope: NotificationScope,
      name: string,
      input: UpdateContactInput,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      options?: ServiceOptions
    ): Promise<Contact> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(updateContactInputSchema, input, {
          message: 'Invalid contact update data',
        });

        const payload = toUpdateContactPayload(validated);

        const response = await patchNotificationMiloapisComV1Alpha1NamespacedContact({
          baseURL: getNotificationScopedBase(scope),
          path: { namespace, name },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
        });

        const data = response.data as ComMiloapisNotificationV1Alpha1Contact;
        if (!data) {
          throw new Error('Failed to update contact');
        }

        const result = toContact(data);

        logger.service(SERVICE_NAME, 'update', {
          input: { scope, namespace, name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(
      scope: NotificationScope,
      name: string,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE
    ): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteNotificationMiloapisComV1Alpha1NamespacedContact({
          baseURL: getNotificationScopedBase(scope),
          path: { namespace, name },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { scope, namespace, name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type NotificationContactService = ReturnType<typeof createNotificationContactService>;
