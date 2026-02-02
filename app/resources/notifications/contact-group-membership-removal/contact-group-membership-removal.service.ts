import { DEFAULT_NOTIFICATION_NAMESPACE, getNotificationScopedBase } from '../notification-scope';
import type { NotificationScope } from '../notification-scope';
import {
  toContactGroupMembershipRemoval,
  toContactGroupMembershipRemovalList,
  toCreateContactGroupMembershipRemovalPayload,
} from './contact-group-membership-removal.adapter';
import {
  createContactGroupMembershipRemovalInputSchema,
  type ContactGroupMembershipRemoval,
  type CreateContactGroupMembershipRemovalInput,
} from './contact-group-membership-removal.schema';
import {
  createNotificationMiloapisComV1Alpha1NamespacedContactGroupMembershipRemoval,
  deleteNotificationMiloapisComV1Alpha1NamespacedContactGroupMembershipRemoval,
  listNotificationMiloapisComV1Alpha1ContactGroupMembershipRemovalForAllNamespaces,
  readNotificationMiloapisComV1Alpha1NamespacedContactGroupMembershipRemoval,
  type ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemoval,
  type ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemovalList,
} from '@/modules/control-plane/notification';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';

export const notificationContactGroupMembershipRemovalKeys = {
  all: ['notification', 'contact-group-membership-removals'] as const,
  lists: () => [...notificationContactGroupMembershipRemovalKeys.all, 'list'] as const,
  list: (scopeKey: string, namespace: string) =>
    [...notificationContactGroupMembershipRemovalKeys.lists(), scopeKey, namespace] as const,
  details: () => [...notificationContactGroupMembershipRemovalKeys.all, 'detail'] as const,
  detail: (scopeKey: string, namespace: string, name: string) =>
    [
      ...notificationContactGroupMembershipRemovalKeys.details(),
      scopeKey,
      namespace,
      name,
    ] as const,
};

const SERVICE_NAME = 'NotificationContactGroupMembershipRemovalService';

export function createNotificationContactGroupMembershipRemovalService() {
  return {
    async list(
      scope: NotificationScope,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      limit?: number,
      _options?: ServiceOptions
    ): Promise<ContactGroupMembershipRemoval[]> {
      const startTime = Date.now();

      try {
        const response =
          await listNotificationMiloapisComV1Alpha1ContactGroupMembershipRemovalForAllNamespaces({
            baseURL: getNotificationScopedBase(scope),
            query: { limit: limit ?? 100 },
          });

        const data =
          response.data as ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemovalList;
        const result = toContactGroupMembershipRemovalList(data);

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
    ): Promise<ContactGroupMembershipRemoval> {
      const startTime = Date.now();

      try {
        const response =
          await readNotificationMiloapisComV1Alpha1NamespacedContactGroupMembershipRemoval({
            baseURL: getNotificationScopedBase(scope),
            path: { namespace, name },
          });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemoval;
        if (!data) throw new Error(`ContactGroupMembershipRemoval ${name} not found`);

        const result = toContactGroupMembershipRemoval(data);

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
      input: CreateContactGroupMembershipRemovalInput,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      options?: ServiceOptions
    ): Promise<ContactGroupMembershipRemoval> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createContactGroupMembershipRemovalInputSchema, input, {
          message: 'Invalid contact group membership removal data',
        });

        const payload = toCreateContactGroupMembershipRemovalPayload(
          validated,
          namespace,
          validated.contactNamespace
        );

        const response =
          await createNotificationMiloapisComV1Alpha1NamespacedContactGroupMembershipRemoval({
            baseURL: getNotificationScopedBase(scope),
            path: { namespace },
            body: payload,
            query: options?.dryRun ? { dryRun: 'All' } : undefined,
          });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroupMembershipRemoval;
        if (!data) throw new Error('Failed to create contact group membership removal');

        const result = toContactGroupMembershipRemoval(data);

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

    async delete(
      scope: NotificationScope,
      name: string,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE
    ): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteNotificationMiloapisComV1Alpha1NamespacedContactGroupMembershipRemoval({
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

export type NotificationContactGroupMembershipRemovalService = ReturnType<
  typeof createNotificationContactGroupMembershipRemovalService
>;
