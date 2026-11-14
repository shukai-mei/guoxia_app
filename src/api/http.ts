import axios, { AxiosError } from 'axios'
import { ensureIdentityInitialized } from '../utils/identity'

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

http.interceptors.request.use(async (config) => {
  // 换取 openid 的请求本身无需身份头；排除它可避免初始化等待自身造成死锁
  if (config.url === '/api/wechat/session') {
    return config
  }
  try {
    const identity = await ensureIdentityInitialized()
    if (identity) {
      config.headers.set('X-Viewer-Identity', identity)
    }
  } catch {
    // 身份初始化失败不阻断请求，降级为无身份请求
  }
  return config
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
