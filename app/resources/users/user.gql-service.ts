import {
  fromGatewayUser,
  fromGatewayUserIdentity,
  type GatewayUser,
  type GatewayUserIdentity,
} from './user.adapter';
import type {
  User,
  UpdateUserPreferencesInput,
  UserSchema,
  UserIdentity,
  UserActiveSession,
} from './user.schema';
import { createGqlClient } from '@/modules/graphql/client';
import {
  generateQueryOp,
  generateMutationOp,
  type ExtendedSession,
  type ExtendedSessionRequest,
  type QueryRequest,
  type MutationRequest,
} from '@/modules/graphql/generated';
import { logger } from '@/modules/logger';
import { mapApiError } from '@/utils/errors/error-mapper';

export const userKeys = {
  all: ['users'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (userId: string) => [...userKeys.details(), userId] as const,
  identities: (userId: string) => [...userKeys.all, 'identities', userId] as const,
  activeSessions: (userId: string) => [...userKeys.all, 'activeSessions', userId] as const,
};

const SERVICE_NAME = 'UserGqlService';

// ============================================================================
// Session field selection — kept in sync with UserActiveSession's shape.
// ============================================================================
const sessionSelection: ExtendedSessionRequest = {
  id: true,
  userUID: true,
  provider: true,
  ipAddress: true,
  fingerprintID: true,
  createdAt: true,
  lastUpdatedAt: true,
  userAgent: { browser: true, os: true, formatted: true },
  location: { city: true, country: true, countryCode: true, formatted: true },
};

function toUserActiveSession(node: ExtendedSession): UserActiveSession {
  return {
    name: node.id,
    userUID: node.userUID,
    provider: node.provider,
    ip: node.ipAddress ?? null,
    fingerprintID: node.fingerprintID ?? null,
    createdAt: node.createdAt,
    lastUpdatedAt: node.lastUpdatedAt ?? null,
    userAgent: node.userAgent
      ? {
          browser: node.userAgent.browser ?? null,
          os: node.userAgent.os ?? null,
          formatted: node.userAgent.formatted,
        }
      : null,
    location: node.location
      ? {
          city: node.location.city ?? null,
          country: node.location.country ?? null,
          countryCode: node.location.countryCode ?? null,
          formatted: node.location.formatted,
        }
      : null,
  };
}

// ============================================================================
// Raw GraphQL fragments for gateway User/UserIdentity types.
// These are hand-written because the portal's generated schema does not yet
// include the User type from additionalTypeDefs (awaiting schema regen after
// the gateway PR lands).
// ============================================================================
const USER_FIELDS = `
  name uid resourceVersion email givenName familyName createdAt
  theme timezone newsletter onboardedAt registrationApproval
  state avatarUrl lastLoginProvider nameReviewRequired
`;

const USER_IDENTITY_FIELDS = `
  name createdAt userUID providerID providerName username
`;

export function createUserGqlService() {
  return {
    async get(userId: string): Promise<User> {
      const startTime = Date.now();
      try {
        const client = createGqlClient({ type: 'global' });
        const isMe = userId === 'me';
        const query = isMe
          ? `query Me { me { ${USER_FIELDS} } }`
          : `query User($id: String!) { user(id: $id) { ${USER_FIELDS} } }`;
        const variables = isMe ? {} : { id: userId };
        const result = await client.query(query, variables).toPromise();
        if (result.error) throw mapApiError(result.error);
        const raw = (isMe ? result.data?.me : result.data?.user) as GatewayUser | null;
        if (!raw) throw new Error(`User not found: ${userId}`);
        logger.service(SERVICE_NAME, 'get', {
          input: { userId },
          duration: Date.now() - startTime,
        });
        return fromGatewayUser(raw);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(userId: string, input: UserSchema): Promise<User> {
      const startTime = Date.now();
      try {
        const client = createGqlClient({ type: 'global' });
        const query = `
          mutation UpdateUser($id: String!, $input: UpdateUserInput!) {
            updateUser(id: $id, input: $input) { ${USER_FIELDS} }
          }
        `;
        const result = await client
          .mutation(query, {
            id: userId,
            input: { givenName: input.firstName, familyName: input.lastName, email: input.email },
          })
          .toPromise();
        if (result.error) throw mapApiError(result.error);
        const raw = result.data?.updateUser as GatewayUser;
        logger.service(SERVICE_NAME, 'update', {
          input: { userId },
          duration: Date.now() - startTime,
        });
        return fromGatewayUser(raw);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(userId: string): Promise<User> {
      const startTime = Date.now();
      try {
        const client = createGqlClient({ type: 'global' });
        const query = `
          mutation DeleteUser($id: String!) {
            deleteUser(id: $id) { ${USER_FIELDS} }
          }
        `;
        const result = await client.mutation(query, { id: userId }).toPromise();
        if (result.error) throw mapApiError(result.error);
        const raw = result.data?.deleteUser as GatewayUser | null;
        logger.service(SERVICE_NAME, 'delete', {
          input: { userId },
          duration: Date.now() - startTime,
        });
        return raw ? fromGatewayUser(raw) : ({} as User);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async updatePreferences(userId: string, input: UpdateUserPreferencesInput): Promise<User> {
      const startTime = Date.now();
      try {
        const client = createGqlClient({ type: 'global' });
        const query = `
          mutation UpdateUserPreferences($id: String!, $input: UpdateUserPreferencesInput!) {
            updateUserPreferences(id: $id, input: $input) { ${USER_FIELDS} }
          }
        `;
        const result = await client
          .mutation(query, {
            id: userId,
            input: {
              ...(input.theme != null ? { theme: input.theme } : {}),
              ...(input.timezone != null ? { timezone: input.timezone } : {}),
              ...(input.newsletter != null ? { newsletter: input.newsletter } : {}),
              ...(input.onboardedAt != null ? { onboardedAt: input.onboardedAt } : {}),
            },
          })
          .toPromise();
        if (result.error) throw mapApiError(result.error);
        const raw = result.data?.updateUserPreferences as GatewayUser;
        logger.service(SERVICE_NAME, 'updatePreferences', {
          input: { userId },
          duration: Date.now() - startTime,
        });
        return fromGatewayUser(raw);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.updatePreferences failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async getUserIdentity(userId: string): Promise<UserIdentity[]> {
      const startTime = Date.now();
      try {
        const client = createGqlClient({ type: 'global' });
        const query = `
          query UserIdentities($userID: String!) {
            userIdentities(userID: $userID) { ${USER_IDENTITY_FIELDS} }
          }
        `;
        const result = await client.query(query, { userID: userId }).toPromise();
        if (result.error) throw mapApiError(result.error);
        const items = (result.data?.userIdentities ?? []) as GatewayUserIdentity[];
        logger.service(SERVICE_NAME, 'getUserIdentity', {
          input: { userId },
          duration: Date.now() - startTime,
        });
        return items.map(fromGatewayUserIdentity);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getUserIdentity failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async listSessions(userId: string): Promise<UserActiveSession[]> {
      const startTime = Date.now();
      try {
        const client = createGqlClient({ type: 'user', userId });
        const op = generateQueryOp({ sessions: sessionSelection } satisfies QueryRequest);
        const result = await client.query(op.query, op.variables).toPromise();
        if (result.error) throw mapApiError(result.error);
        const items = (result.data?.sessions ?? []) as ExtendedSession[];
        logger.service(SERVICE_NAME, 'listSessions', {
          input: { userId },
          duration: Date.now() - startTime,
        });
        return items.map(toUserActiveSession);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listSessions failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async revokeSession(userId: string, sessionId: string): Promise<void> {
      const startTime = Date.now();
      try {
        const client = createGqlClient({ type: 'user', userId });
        const op = generateMutationOp({
          deleteSession: [{ id: sessionId }],
        } satisfies MutationRequest);
        const result = await client.mutation(op.query, op.variables).toPromise();
        if (result.error) throw mapApiError(result.error);
        if (result.data?.deleteSession !== true) {
          throw new Error(`Failed to revoke session ${sessionId}`);
        }
        logger.service(SERVICE_NAME, 'revokeSession', {
          input: { userId, sessionId },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.revokeSession failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type UserGqlService = ReturnType<typeof createUserGqlService>;
