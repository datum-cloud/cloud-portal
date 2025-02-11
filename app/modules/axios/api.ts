/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from 'axios'
import { getSession } from '../auth/auth-session.server'

export interface IApiResponse<T> {
  data: T
  message: string
  status: number
}

export const APIClient = class Api {
  baseURL: string
  token: string | undefined

  constructor() {
    this.baseURL = `${process.env.API_URL}/datum-os` as string
    this.token = ''
  }

  initializeInstance() {
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
        return this.errorHandler(error)
      },
    )

    instance.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        return this.errorHandler(error)
      },
    )
    return instance
  }

  async setToken(request: Request) {
    const session = await getSession(request.headers.get('Cookie'))
    const token = session.get('accessToken')
    this.token = token
  }

  authClient(url: string, method: string, data?: any) {
    const instance = this.initializeInstance()
    instance.interceptors.request.use(
      (config: any) => {
        config.headers = {
          Authorization: `Bearer ${this.token}`,
        }

        return config
      },
      (error) => {
        return this.errorHandler(error)
      },
    )

    return instance({
      url,
      method,
      data,
    })
  }

  publicRequest(url: string, method: string, data?: any) {
    const instance = this.initializeInstance()
    return instance({
      url,
      method,
      data,
    })
  }

  errorHandler(error: AxiosError) {
    const errorMessage =
      (error.response?.data as any)?.message || error.message || 'Unknown error occurred'
    const status = error.response?.status || 500
    return Promise.reject(
      new Response(errorMessage, {
        status,
        statusText: errorMessage,
      }),
    )
  }
}
