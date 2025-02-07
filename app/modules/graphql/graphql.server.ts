/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, GraphQLClient as GraphQLClientInstance, Variables } from 'graphql-request'
import { getSession } from '@/modules/auth/auth-session.server'

export const GraphqlClient = class gqlClient {
  baseURL: string
  token: string | undefined

  constructor() {
    this.baseURL = process.env.GRAPHQL_URL ?? ''
    this.token = undefined
  }

  initializeInstance = () => {
    const baseURL = this.baseURL

    console.log(baseURL)

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

  async setToken(request: Request) {
    const session = await getSession(request.headers.get('Cookie'))
    const token = session.get('credentials')?.accessToken
    this.token = token
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
          reject(error)
        })
    })
  }
}
