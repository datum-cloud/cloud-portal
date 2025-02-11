/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import { getSession } from '../auth/auth-session.server'

export interface IApiResponse<T> {
  data: T
  message: string
  status: number
}

export const ControlPlaneClient = class Api {
  baseURL: string
  token: string | undefined

  constructor() {
    this.baseURL =
      `${process.env.API_URL}/apis/resourcemanager.datumapis.com/v1alpha` as string
    this.token = ''
  }

  initializeInstance = () => {
    const baseURL = this.baseURL

    const instance = axios.create({
      baseURL,
      withCredentials: false,
    })

    instance.interceptors.request.use(
      (config) => {
        return config
      },
      (error) => {
        // Handle errors and redirect to sign out if unauthorized
        return Promise.reject(
          new Response('Something went wrong', {
            status: error.response?.status || 500,
            statusText:
              error.response?.data?.message || error.message || 'Unknown error occurred',
          }),
        )
      },
    )

    return instance
  }

  async setToken(request: Request, token?: string) {
    if (token) {
      this.token = token
    } else {
      const session = await getSession(request.headers.get('Cookie'))
      const controlPlaneToken = session.get('controlPlaneToken')

      this.token = controlPlaneToken
    }
  }

  authClient = (url: string, method: string, data?: any) => {
    const instance = this.initializeInstance()
    instance.interceptors.request.use(
      (config: any) => {
        config.headers = {
          Authorization: `Bearer ${this.token}`,
        }

        return config
      },
      (error) => {
        // Handle errors and redirect to sign out if unauthorized
        return Promise.reject(
          new Response('Something went wrong', {
            status: error.response?.status || 500,
            statusText:
              error.response?.data?.message || error.message || 'Unknown error occurred',
          }),
        )
      },
    )

    return instance({
      url,
      method,
      data,
    })
  }

  publicRequest = (url: string, method: string, data?: any) => {
    const instance = this.initializeInstance()
    return instance({
      url,
      method,
      data,
    })
  }
}
