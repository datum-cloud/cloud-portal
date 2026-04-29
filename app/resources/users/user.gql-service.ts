import type { UserActiveSession } from './user.schema';
import { userKeys } from './user.service';
import { createGqlClient } from '@/modules/graphql/client';
import { logger } from '@/modules/logger';
import { mapApiError } from '@/utils/errors/error-mapper';

const SERVICE_NAME = 'UserGqlService';

// ============================================================================
// GraphQL operations
// ----------------------------------------------------------------------------
// These are hand-written rather than emitted by `bun run graphql` because the
// graphql-gateway resolvers (`sessions`, `deleteSession`) are not part of the
// federated schema the codegen introspects yet — they're additionalTypeDefs
// resolved locally by the gateway. Once the gateway is deployed and added to
// graphql.config.json, swap to generateQueryOp / generateMutationOp.
// ============================================================================

const SESSIONS_QUERY = /* GraphQL */ `
  query Sessions {
    sessions {
      id
      userUID
      provider
      ipAddress
      fingerprintID
      createdAt
      lastUpdatedAt
      userAgent {
        browser
        os
        formatted
      }
      location {
        city
        country
        countryCode
        formatted
      }
    }
  }
`;

const DELETE_SESSION_MUTATION = /* GraphQL */ `
  mutation DeleteSession($id: String!) {
    deleteSession(id: $id)
  }
`;

interface SessionsQueryData {
  sessions: Array<{
    id: string;
    userUID: string;
    provider: string;
    ipAddress: string | null;
    fingerprintID: string | null;
    createdAt: string;
    lastUpdatedAt: string | null;
    userAgent: {
      browser: string | null;
      os: string | null;
      formatted: string;
    } | null;
    location: {
      city: string | null;
      country: string | null;
      countryCode: string | null;
      formatted: string;
    } | null;
  }>;
}

interface DeleteSessionMutationData {
  deleteSession: boolean;
}

function toUserActiveSession(node: SessionsQueryData['sessions'][number]): UserActiveSession {
  return {
    // `name` keeps the existing field name consumers use to compare against
    // the OIDC `sid` for "current session" highlighting.
    name: node.id,
    userUID: node.userUID,
    provider: node.provider,
    ip: node.ipAddress,
    fingerprintID: node.fingerprintID,
    createdAt: node.createdAt,
    lastUpdatedAt: node.lastUpdatedAt,
    userAgent: node.userAgent,
    location: node.location,
  };
}

/**
 * GraphQL-backed service for user active sessions.
 *
 * Mirrors `createOrganizationGqlService` but talks to the gateway-local
 * `sessions` query and `deleteSession` mutation. Both go through the
 * user-scoped GraphQL endpoint so milo enforces session ownership.
 */
export function createUserGqlService() {
  return {
    async listSessions(userId: string): Promise<UserActiveSession[]> {
      const startTime = Date.now();

      try {
        const client = createGqlClient({ type: 'user', userId });

        const result = await client.query<SessionsQueryData>(SESSIONS_QUERY, {}).toPromise();

        if (result.error) throw mapApiError(result.error);

        const items = result.data?.sessions ?? [];

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

        const result = await client
          .mutation<DeleteSessionMutationData>(DELETE_SESSION_MUTATION, { id: sessionId })
          .toPromise();

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
