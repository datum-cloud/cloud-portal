/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomError } from '@/utils/errorHandle'
import axios, { AxiosError, AxiosInstance } from 'axios'
import curlirize from 'axios-curlirize'

type ApiClientOptions = {
  baseURL: string
  authToken?: string
}

const errorHandler = (error: AxiosError) => {
  const errorMessage =
    (error.response?.data as any)?.message || error.message || 'Unknown error occurred'

  const errorResponse = new CustomError(
    errorMessage,
    error.response?.status || 500,
    error,
  )

  return Promise.reject(errorResponse)
}

export const createAxiosClient = (options: ApiClientOptions): AxiosInstance => {
  const { baseURL, authToken } = options

  const instance = axios.create({
    baseURL,
    withCredentials: false,
  })

  // Curlirize the client for debugging purposes
  if (process.env.NODE_ENV === 'development') {
    curlirize(instance)
  }

  instance.interceptors.request.use(
    (config: any) => {
      if (authToken) {
        config.headers = {
          Authorization: `Bearer ${authToken}`,
        }
      }
      return config
    },
    (error) => {
      return errorHandler(error)
    },
  )

  instance.interceptors.response.use(
    (response) => {
      return response
    },
    (error) => {
      return errorHandler(error)
    },
  )

  return instance
}
