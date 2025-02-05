import axios from 'axios'

export const api = axios.create({
  baseURL: `${process.env.API_URL}/datum-os`,
  timeout: 30 * 1000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => Promise.reject(error),
)

// response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  },
)
