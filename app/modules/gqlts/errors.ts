// app/modules/gqlts/errors.ts
import type { GraphQLError, GraphqlResponse } from './generated';

/**
 * Checks if a response contains GraphQL errors.
 */
export function isGqlError(error: unknown): error is GraphqlResponse & { errors: GraphQLError[] } {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const response = error as GraphqlResponse;
  return Array.isArray(response.errors) && response.errors.length > 0;
}

/**
 * Gets the error code from a GraphQL error.
 */
export function getGqlErrorCode(error: GraphQLError): string | undefined {
  return error.extensions?.code as string | undefined;
}

/**
 * Gets a user-friendly error message from a GraphQL response.
 */
export function getGqlErrorMessage(response: GraphqlResponse): string {
  if (!response.errors || response.errors.length === 0) {
    return 'Unknown GraphQL error';
  }
  return response.errors[0].message;
}
