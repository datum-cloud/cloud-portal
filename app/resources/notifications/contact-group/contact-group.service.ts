import { DEFAULT_NOTIFICATION_NAMESPACE, getNotificationScopedBase } from '../notification-scope';
import type { NotificationScope } from '../notification-scope';
import {
  toContactGroup,
  toContactGroupList,
  toCreateContactGroupPayload,
  toUpdateContactGroupPayload,
} from './contact-group.adapter';
import {
  createContactGroupInputSchema,
  updateContactGroupInputSchema,
  type ContactGroup,
  type CreateContactGroupInput,
  type UpdateContactGroupInput,
} from './contact-group.schema';
import {
  createNotificationMiloapisComV1Alpha1NamespacedContactGroup,
  deleteNotificationMiloapisComV1Alpha1NamespacedContactGroup,
  listNotificationMiloapisComV1Alpha1ContactGroupForAllNamespaces,
  patchNotificationMiloapisComV1Alpha1NamespacedContactGroup,
  readNotificationMiloapisComV1Alpha1NamespacedContactGroup,
  type ComMiloapisNotificationV1Alpha1ContactGroup,
  type ComMiloapisNotificationV1Alpha1ContactGroupList,
} from '@/modules/control-plane/notification';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';

export const notificationContactGroupKeys = {
  all: ['notification', 'contact-groups'] as const,
  lists: () => [...notificationContactGroupKeys.all, 'list'] as const,
  list: (scopeKey: string, namespace: string) =>
    [...notificationContactGroupKeys.lists(), scopeKey, namespace] as const,
  details: () => [...notificationContactGroupKeys.all, 'detail'] as const,
  detail: (scopeKey: string, namespace: string, name: string) =>
    [...notificationContactGroupKeys.details(), scopeKey, namespace, name] as const,
};

const SERVICE_NAME = 'NotificationContactGroupService';

export function createNotificationContactGroupService() {
  return {
    async list(
      scope: NotificationScope,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      limit?: number,
      _options?: ServiceOptions
    ): Promise<ContactGroup[]> {
      const startTime = Date.now();

      try {
        const response = await listNotificationMiloapisComV1Alpha1ContactGroupForAllNamespaces({
          baseURL: getNotificationScopedBase(scope),
          query: {
            limit: limit ?? 100,
          },
        });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroupList;
        const result = toContactGroupList(data);

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
    ): Promise<ContactGroup> {
      const startTime = Date.now();

      try {
        const response = await readNotificationMiloapisComV1Alpha1NamespacedContactGroup({
          baseURL: getNotificationScopedBase(scope),
          path: { namespace, name },
        });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroup;
        if (!data) {
          throw new Error(`ContactGroup ${name} not found`);
        }

        const result = toContactGroup(data);

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
      input: CreateContactGroupInput,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      options?: ServiceOptions
    ): Promise<ContactGroup> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createContactGroupInputSchema, input, {
          message: 'Invalid contact group data',
        });

        const payload = toCreateContactGroupPayload(validated);

        const response = await createNotificationMiloapisComV1Alpha1NamespacedContactGroup({
          baseURL: getNotificationScopedBase(scope),
          path: { namespace },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroup;
        if (!data) {
          throw new Error('Failed to create contact group');
        }

        const result = toContactGroup(data);

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
      input: UpdateContactGroupInput,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      options?: ServiceOptions
    ): Promise<ContactGroup> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(updateContactGroupInputSchema, input, {
          message: 'Invalid contact group update data',
        });

        const payload = toUpdateContactGroupPayload(validated);

        const response = await patchNotificationMiloapisComV1Alpha1NamespacedContactGroup({
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

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroup;
        if (!data) {
          throw new Error('Failed to update contact group');
        }

        const result = toContactGroup(data);

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
        await deleteNotificationMiloapisComV1Alpha1NamespacedContactGroup({
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

export type NotificationContactGroupService = ReturnType<
  typeof createNotificationContactGroupService
>;
