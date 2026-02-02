import { DEFAULT_NOTIFICATION_NAMESPACE, getNotificationScopedBase } from '../notification-scope';
import type { NotificationScope } from '../notification-scope';
import {
  toContactGroupMembership,
  toContactGroupMembershipList,
  toCreateContactGroupMembershipPayload,
} from './contact-group-membership.adapter';
import {
  createContactGroupMembershipInputSchema,
  type ContactGroupMembership,
  type CreateContactGroupMembershipInput,
} from './contact-group-membership.schema';
import {
  createNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership,
  deleteNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership,
  listNotificationMiloapisComV1Alpha1ContactGroupMembershipForAllNamespaces,
  readNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership,
  type ComMiloapisNotificationV1Alpha1ContactGroupMembership,
  type ComMiloapisNotificationV1Alpha1ContactGroupMembershipList,
} from '@/modules/control-plane/notification';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';

export const notificationContactGroupMembershipKeys = {
  all: ['notification', 'contact-group-memberships'] as const,
  lists: () => [...notificationContactGroupMembershipKeys.all, 'list'] as const,
  list: (scopeKey: string, namespace: string) =>
    [...notificationContactGroupMembershipKeys.lists(), scopeKey, namespace] as const,
  details: () => [...notificationContactGroupMembershipKeys.all, 'detail'] as const,
  detail: (scopeKey: string, namespace: string, name: string) =>
    [...notificationContactGroupMembershipKeys.details(), scopeKey, namespace, name] as const,
};

const SERVICE_NAME = 'NotificationContactGroupMembershipService';

export function createNotificationContactGroupMembershipService() {
  return {
    async list(
      scope: NotificationScope,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      limit?: number,
      _options?: ServiceOptions
    ): Promise<ContactGroupMembership[]> {
      const startTime = Date.now();

      try {
        const response =
          await listNotificationMiloapisComV1Alpha1ContactGroupMembershipForAllNamespaces({
            baseURL: getNotificationScopedBase(scope),
            query: { limit: limit ?? 100 },
          });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroupMembershipList;
        const result = toContactGroupMembershipList(data);

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
    ): Promise<ContactGroupMembership> {
      const startTime = Date.now();

      try {
        const response = await readNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership({
          baseURL: getNotificationScopedBase(scope),
          path: { namespace, name },
        });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroupMembership;
        if (!data) throw new Error(`ContactGroupMembership ${name} not found`);

        const result = toContactGroupMembership(data);

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
      input: CreateContactGroupMembershipInput,
      namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
      options?: ServiceOptions
    ): Promise<ContactGroupMembership> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createContactGroupMembershipInputSchema, input, {
          message: 'Invalid contact group membership data',
        });

        const payload = toCreateContactGroupMembershipPayload(
          validated,
          namespace,
          validated.contactNamespace
        );

        const response =
          await createNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership({
            baseURL: getNotificationScopedBase(scope),
            path: { namespace },
            body: payload,
            query: options?.dryRun ? { dryRun: 'All' } : undefined,
          });

        const data = response.data as ComMiloapisNotificationV1Alpha1ContactGroupMembership;
        if (!data) throw new Error('Failed to create contact group membership');

        const result = toContactGroupMembership(data);

        logger.service(SERVICE_NAME, 'create', {
          input: { scope, namespace },
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
        await deleteNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership({
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

export type NotificationContactGroupMembershipService = ReturnType<
  typeof createNotificationContactGroupMembershipService
>;
