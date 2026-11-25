import axios, { AxiosError } from 'axios'
import { ensureIdentityInitialized } from '../utils/identity'
import { clearAdminAuth, getAdminAuthToken } from '../utils/adminAuth'

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
  if (
    config.url &&
    config.url.startsWith('/admin/api') &&
    config.url !== '/admin/api/auth/login'
  ) {
    const token = getAdminAuthToken()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
  }
  return config
})

function handleUnauthorized(url: string | undefined, code: number | undefined): boolean {
  if (code !== 401) {
    return false
  }
  // 登录接口的 401 是「用户名或密码错误」，仅抛错供登录页展示
  if (url === '/admin/api/auth/login') {
    return false
  }
  clearAdminAuth()
  if (typeof window !== 'undefined') {
    // 整页跳转，顺带重置内存态；避免 import router 造成循环依赖
    window.location.assign('/admin/login')
  }
  return true
}

http.interceptors.response.use(
  (response) => {
    try {
      return { ...response, data: unwrapBody(response.data) }
    } catch (error) {
      if (error instanceof ApiError) {
        handleUnauthorized(response.config.url, error.code)
      }
      return Promise.reject(error)
    }
  },
  (error: AxiosError) => {
    const body = error.response?.data as ApiBody | undefined
    handleUnauthorized(error.config?.url, body?.code)
    if (body && typeof body.message === 'string' && body.message.trim() !== '') {
      return Promise.reject(new ApiError(body.code ?? -1, body.message))
    }
    return Promise.reject(new ApiError(-1, '网络异常，请稍后重试'))
  }
)
