import {
  toUser,
  toUpdateUserPayload,
  toUpdateUserPreferencesPayload,
  type ComMiloapisIamV1Alpha1User,
  type ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyList,
  toUserIdentityList,
  toUserActiveSessionList,
  toPasskeyList,
} from './user.adapter';
import {
  type User,
  type UpdateUserPreferencesInput,
  type UserSchema,
  type UserIdentity,
  type Passkey,
  UserActiveSession,
} from './user.schema';
import {
  ComMiloapisGoMiloPkgApisIdentityV1Alpha1SessionList,
  ComMiloapisGoMiloPkgApisIdentityV1Alpha1UserIdentityList,
  deleteIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1UserIdentity,
} from '@/modules/control-plane/identity';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import { getUserScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const userKeys = {
  all: ['users'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (userId: string) => [...userKeys.details(), userId] as const,
  identities: (userId: string) => [...userKeys.all, 'identities', userId] as const,
  activeSessions: (userId: string) => [...userKeys.all, 'activeSessions', userId] as const,
  passkeys: (userId: string) => [...userKeys.all, 'passkeys', userId] as const,
};

const SERVICE_NAME = 'UserService';

/** TEMPORARY fixture pending milo A1b + zitadel-provider A2b (roadmap A5: "Depends on A2b deployed to staging"). The gated client-regen task deletes this. */
const FIXTURE_PASSKEYS_RAW: ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyList = {
  items: [
    {
      metadata: { name: 'passkey-fixture-1' },
      status: { displayName: 'MacBook Pro (Touch ID)', state: 'Active' },
    },
    {
      metadata: { name: 'passkey-fixture-2' },
      status: { displayName: 'iPhone 15', state: 'Inactive' },
    },
  ],
};

export function createUserService() {
  return {
    /**
     * Get user details by user ID
     */
    async get(userId: string): Promise<User> {
      const startTime = Date.now();

      try {
        const response = await client.get({
          url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
          responseType: 'json',
        });

        const user = toUser(response.data as ComMiloapisIamV1Alpha1User);

        logger.service(SERVICE_NAME, 'get', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        return user;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update user profile
     */
    async update(userId: string, input: UserSchema): Promise<User> {
      const startTime = Date.now();

      try {
        const payload = toUpdateUserPayload(input);

        const response = await client.patch({
          url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          query: {
            fieldManager: 'datum-cloud-portal',
          },
          body: payload,
          responseType: 'json',
        });

        const user = toUser(response.data as ComMiloapisIamV1Alpha1User);

        logger.service(SERVICE_NAME, 'update', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        return user;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete user account
     */
    async delete(userId: string): Promise<User> {
      const startTime = Date.now();

      try {
        const response = await client.delete({
          url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
          responseType: 'json',
        });

        const user = toUser(response.data as ComMiloapisIamV1Alpha1User);

        logger.service(SERVICE_NAME, 'delete', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        return user;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update user preferences
     */
    async updatePreferences(userId: string, input: UpdateUserPreferencesInput): Promise<User> {
      const startTime = Date.now();

      try {
        const payload = toUpdateUserPreferencesPayload(input);

        const response = await client.patch({
          url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          query: {
            fieldManager: 'datum-cloud-portal',
          },
          body: payload,
          responseType: 'json',
        });

        const user = toUser(response.data as ComMiloapisIamV1Alpha1User);

        logger.service(SERVICE_NAME, 'updatePreferences', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        return user;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.updatePreferences failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Get user identity by user ID
     */
    async getUserIdentity(userId: string): Promise<UserIdentity[]> {
      const startTime = Date.now();

      try {
        const response = await listIdentityMiloapisComV1Alpha1UserIdentity({
          baseURL: getUserScopedBase(userId),
        });

        logger.service(SERVICE_NAME, 'getUserIdentity', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        return toUserIdentityList(
          response.data as ComMiloapisGoMiloPkgApisIdentityV1Alpha1UserIdentityList
        );
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getUserIdentity failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /** TEMPORARY: returns fixture data until the gated client-regen task swaps in the real call. */
    async getPasskeys(userId: string): Promise<Passkey[]> {
      const startTime = Date.now();

      try {
        logger.service(SERVICE_NAME, 'getPasskeys', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        return toPasskeyList(FIXTURE_PASSKEYS_RAW);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getPasskeys failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Get User Active Sessions
     */

    async getUserActiveSessions(userId: string): Promise<UserActiveSession[]> {
      const startTime = Date.now();

      try {
        const response = await listIdentityMiloapisComV1Alpha1Session({
          baseURL: getUserScopedBase(userId),
        });

        logger.service(SERVICE_NAME, 'getUserActiveSessions', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        return toUserActiveSessionList(
          response.data as ComMiloapisGoMiloPkgApisIdentityV1Alpha1SessionList
        );
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getUserActiveSessions failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async revokeUserActiveSession(userId: string, sessionId: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteIdentityMiloapisComV1Alpha1Session({
          baseURL: getUserScopedBase(userId),
          path: {
            name: sessionId,
          },
        });

        logger.service(SERVICE_NAME, 'revokeUserActiveSession', {
          input: { userId },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.revokeUserActiveSession failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
