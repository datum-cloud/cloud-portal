/* eslint-disable @typescript-eslint/no-explicit-any */
import { createConfig, createClient, ClientOptions } from '@hey-api/client-axios'
import { AxiosError } from 'axios'
import { CustomError } from '@/utils/errorHandle'

// Customize the client to add an auth token to the request headers
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

export const createControlPlaneClient = (
  options: ClientOptions & { authToken: string },
) => {
  const { authToken, baseURL } = options

  const client = createClient(
    createConfig<ClientOptions>({
      baseURL,
      withCredentials: false,
      throwOnError: true,
    }),
  )

  client.instance.interceptors.request.use(
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

  client.instance.interceptors.response.use(
    (response) => {
      return response
    },
    (error) => {
      return errorHandler(error)
    },
  )

  return client
}
