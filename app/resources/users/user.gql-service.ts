import type { UserActiveSession } from './user.schema';
import { userKeys } from './user.service';
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

const SERVICE_NAME = 'UserGqlService';

// ============================================================================
// Field selection — kept in sync with UserActiveSession's shape so the
// adapter below is exhaustive.
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
    // `name` keeps the field name existing consumers use to compare against
    // the OIDC `sid` for "current session" highlighting.
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

/**
 * GraphQL-backed service for user active sessions.
 *
 * Uses the gateway's local `sessions` query and `deleteSession` mutation.
 * The user-scoped GqlScope tells the gateway which user-scoped milo path to
 * proxy through, so milo enforces session ownership.
 */
export function createUserGqlService() {
  return {
    async listSessions(userId: string): Promise<UserActiveSession[]> {
      const startTime = Date.now();

      try {
        const client = createGqlClient({ type: 'user', userId });

        const op = generateQueryOp({
          sessions: sessionSelection,
        } satisfies QueryRequest);

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

// Re-export query keys for shared cache with the legacy REST hooks.
export { userKeys };

export type UserGqlService = ReturnType<typeof createUserGqlService>;
