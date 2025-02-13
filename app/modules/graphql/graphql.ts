/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, GraphQLClient as GraphQLClientInstance, Variables } from 'graphql-request'
import { getSession } from '@/modules/auth/auth-session.server'

export const GraphqlClient = class gqlClient {
  baseURL: string
  token: string | undefined

  constructor() {
    this.baseURL = `${process.env.API_URL}/datum-os/query`
    this.token = undefined
  }

  initializeInstance = () => {
    const baseURL = this.baseURL

    let headers = {}

    if (this.token) {
      headers = {
        Authorization: `Bearer ${this.token}`,
      }
    }

    const instance = new GraphQLClientInstance(baseURL, {
      headers,
    })

    return instance
  }

  async setToken(request: Request, token?: string) {
    if (token) {
      this.token = token
    } else {
      const session = await getSession(request.headers.get('Cookie'))
      const token = session.get('accessToken')
      this.token = token
    }
  }

  async request<T = any, V extends Variables = Variables>(
    query: string,
    variables?: V,
  ): Promise<T> {
    const instance = this.initializeInstance()
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
          // Handle GraphQL errors and convert to standard format
          const errorMessage =
            error.response?.errors?.[0]?.message ||
            error?.message ||
            'Unknown error occurred'
          let statusCode =
            error.response?.errors?.[0]?.extensions?.code || error.response?.status || 500

          console.log('graphql token', this.token)

          // TODO: find information about error code from backend related to unauthorized
          // Check for "not authorized" in error message
          if (
            errorMessage?.toLowerCase().includes('not authorized') ||
            (statusCode >= 400 && statusCode < 500)
          ) {
            statusCode = 401
          }

          reject(
            new Response(errorMessage, { status: statusCode, statusText: errorMessage }),
          )
        })
    })
  }
}
