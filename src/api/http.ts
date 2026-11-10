import axios, { AxiosError } from 'axios'

export class ApiError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

interface ApiBody {
  code?: number
  message?: string
}

export function unwrapBody(body: unknown): unknown {
  if (body && typeof body === 'object' && 'code' in body) {
    const apiBody = body as ApiBody
    if (apiBody.code === 0) {
      return (body as { data?: unknown }).data
    }
    throw new ApiError(
      apiBody.code ?? -1,
      apiBody.message && apiBody.message.trim() !== '' ? apiBody.message : '请求失败'
    )
  }
  return body
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  timeout: 120000
})

http.interceptors.response.use(
  (response) => {
    try {
      return { ...response, data: unwrapBody(response.data) }
    } catch (error) {
      return Promise.reject(error)
    }
  },
  (error: AxiosError) => {
    const body = error.response?.data as ApiBody | undefined
    if (body && typeof body.message === 'string' && body.message.trim() !== '') {
      return Promise.reject(new ApiError(body.code ?? -1, body.message))
    }
    return Promise.reject(new ApiError(-1, '网络异常，请稍后重试'))
  }
)
