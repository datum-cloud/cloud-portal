/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import { getSession } from '../auth/auth-session.server'

export interface IApiResponse<T> {
  data: T
  message: string
  status: number
}

export const AxiosClient = class Api {
  baseURL: string
  token: string | undefined

  constructor() {
    this.baseURL = `${process.env.API_URL}/datum-os` as string
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
        console.log(error)

        return Promise.reject(error)
      },
    )

    return instance
  }

  async setToken(request: Request) {
    const session = await getSession(request.headers.get('Cookie'))
    const token = session.get('credentials')?.accessToken
    this.token = token
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
        return Promise.reject(error)
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
