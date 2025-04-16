/* eslint-disable @typescript-eslint/no-explicit-any */
import { isDevelopment } from '@/utils/misc'
import { GraphQLClient as GraphQLClientInstance, Variables, gql } from 'graphql-request'

type GraphqlClientOptions = {
  baseURL: string
  authToken?: string
}

const errorHandler = (error: any) => {
  // Handle GraphQL errors and convert to standard format
  let errorMessage = 'Something went wrong'

  // Show the actual error message in development mode
  if (isDevelopment()) {
    errorMessage =
      error.response?.errors?.[0]?.message || error?.message || 'Unknown error occurred'
  }

  let statusCode =
    error.response?.status || error.response?.errors?.[0]?.extensions?.code || 500

  // TODO: find information about error code from backend related to unauthorized
  // Check for "not authorized" in error message
  if (
    errorMessage?.toLowerCase().includes('not authorized') ||
    statusCode === 400 ||
    statusCode === 401
  ) {
    statusCode = 401
  }

  return new Response(errorMessage, { status: statusCode, statusText: errorMessage })
}

export const createGraphqlClient = (options: GraphqlClientOptions) => {
  const { baseURL, authToken } = options

  let headers = {}

  if (authToken) {
    headers = {
      Authorization: `Bearer ${authToken}`,
    }
  }

  const instance = new GraphQLClientInstance(baseURL, {
    headers,
  })

  const request = async <T = any, V extends Variables = Variables>(
    query: string,
    variables?: V,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      instance
        .request<T>(
          gql`
            ${query}
          `,
          variables ?? {},
        )
        .then((data) => {
          resolve(data)
        })
        .catch((error) => {
          reject(errorHandler(error))
        })
    })
  }

  return {
    request,
  }
}

export type GraphqlClient = ReturnType<typeof createGraphqlClient>
