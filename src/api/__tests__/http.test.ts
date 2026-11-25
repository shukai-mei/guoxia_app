import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { ApiError, http, unwrapBody } from '../http'

describe('unwrapBody', () => {
  it('returns data when code is 0', () => {
    expect(unwrapBody({ code: 0, message: 'success', data: { id: 1 } })).toEqual({ id: 1 })
  })

  it('returns data null when code is 0 without data', () => {
    expect(unwrapBody({ code: 0, message: 'success' })).toBeUndefined()
  })

  it('throws ApiError with code and message on business error', () => {
    expect(() => unwrapBody({ code: 404, message: '房源不存在', data: null })).toThrowError(
      expect.objectContaining({ code: 404, message: '房源不存在' })
    )
  })

  it('throws ApiError with fallback message when message missing', () => {
    expect(() => unwrapBody({ code: 409, data: null })).toThrowError(
      expect.objectContaining({ code: 409, message: '请求失败' })
    )
  })

  it('passes through non-envelope bodies', () => {
    expect(unwrapBody('plain text')).toBe('plain text')
  })
})

describe('http response interceptor', () => {
  const mock = new MockAdapter(http)

  it('unwraps success envelope', async () => {
    mock.onGet('/api/properties').reply(200, { code: 0, message: 'success', data: [{ id: 1 }] })
    const result = await http.get('/api/properties')
    expect(result.data).toEqual([{ id: 1 }])
  })

  it('rejects with ApiError on business error body', async () => {
    mock.onGet('/api/properties/99').reply(200, { code: 404, message: '房源不存在', data: null })
    await expect(http.get('/api/properties/99')).rejects.toEqual(
      expect.objectContaining({ code: 404, message: '房源不存在' })
    )
  })

  it('rejects with ApiError extracted from HTTP error body', async () => {
    mock.onPost('/api/x').reply(400, { code: 400, message: '参数校验失败', data: null })
    await expect(http.post('/api/x')).rejects.toEqual(
      expect.objectContaining({ code: 400, message: '参数校验失败' })
    )
  })

  it('rejects with network fallback message on network error', async () => {
    mock.onGet('/api/net').networkError()
    await expect(http.get('/api/net')).rejects.toEqual(
      expect.objectContaining({ code: -1, message: '网络异常，请稍后重试' })
    )
  })
})

describe('request identity header injection', () => {
  function headerOf(request: { headers?: unknown } | undefined): unknown {
    const headers = request?.headers as Record<string, unknown> | undefined
    return headers?.['X-Viewer-Identity']
  }

  it('首请求先完成身份初始化再携带身份头', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    localStorage.clear()
    mock2.onGet('/api/items').reply(200, { code: 0, data: [] })
    await freshHttp.get('/api/items')
    const stored = localStorage.getItem('viewerIdentity')
    expect(stored).toBeTruthy()
    const request = mock2.history.get.find((r) => r.url === '/api/items')
    expect(headerOf(request)).toBe(stored)
  })

  it('本地已有身份时请求头携带既有身份', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    localStorage.setItem('viewerIdentity', 'openid-known')
    mock2.onGet('/api/known').reply(200, { code: 0, data: [] })
    await freshHttp.get('/api/known')
    const request = mock2.history.get.find((r) => r.url === '/api/known')
    expect(headerOf(request)).toBe('openid-known')
  })

  it('换取 openid 的请求不携带身份头（避免初始化自等待）', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    localStorage.clear()
    mock2.onPost('/api/wechat/session').reply(200, { code: 0, data: { openid: 'o-1' } })
    await freshHttp.post('/api/wechat/session', { code: 'c-1' })
    const request = mock2.history.post.find((r) => r.url === '/api/wechat/session')
    expect(request).toBeDefined()
    expect(headerOf(request)).toBeUndefined()
  })
})

describe('ApiError', () => {
  it('is an Error with code', () => {
    const error = new ApiError(409, '该预约已处理')
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe(409)
    expect(error.message).toBe('该预约已处理')
  })
})

describe('admin auth header injection', () => {
  function authHeaderOf(request: { headers?: unknown } | undefined): unknown {
    const headers = request?.headers as Record<string, unknown> | undefined
    return headers?.['Authorization']
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('已登录管理请求携带 Bearer 凭证', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    localStorage.setItem(
      'adminAuth',
      JSON.stringify({ token: 'admin-token-1', expiresAt: '2026-12-02T15:00:00' })
    )
    mock2.onGet('/admin/api/properties').reply(200, { code: 0, data: [] })
    await freshHttp.get('/admin/api/properties')
    const request = mock2.history.get.find((r) => r.url === '/admin/api/properties')
    expect(authHeaderOf(request)).toBe('Bearer admin-token-1')
  })

  it('未登录管理请求不携带凭证', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    mock2.onGet('/admin/api/properties').reply(200, { code: 0, data: [] })
    await freshHttp.get('/admin/api/properties')
    const request = mock2.history.get.find((r) => r.url === '/admin/api/properties')
    expect(authHeaderOf(request)).toBeUndefined()
  })

  it('登录接口请求不携带凭证', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    localStorage.setItem(
      'adminAuth',
      JSON.stringify({ token: 'admin-token-2', expiresAt: '2026-12-02T15:00:00' })
    )
    mock2.onPost('/admin/api/auth/login').reply(200, { code: 0, data: { token: 'x' } })
    await freshHttp.post('/admin/api/auth/login', { username: 'u', password: 'p' })
    const request = mock2.history.post.find((r) => r.url === '/admin/api/auth/login')
    expect(authHeaderOf(request)).toBeUndefined()
  })

  it('租客端请求不携带管理凭证', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    localStorage.setItem(
      'adminAuth',
      JSON.stringify({ token: 'admin-token-3', expiresAt: '2026-12-02T15:00:00' })
    )
    mock2.onGet('/api/properties').reply(200, { code: 0, data: [] })
    await freshHttp.get('/api/properties')
    const request = mock2.history.get.find((r) => r.url === '/api/properties')
    expect(authHeaderOf(request)).toBeUndefined()
  })
})

describe('admin 401 handling', () => {
  const originalLocation = window.location
  let assignSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, assign: assignSpy },
      configurable: true
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true
    })
  })

  it('管理接口 401 清凭证并整页跳转登录页', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    localStorage.setItem(
      'adminAuth',
      JSON.stringify({ token: 'expired-token', expiresAt: '2026-12-02T15:00:00' })
    )
    mock2.onGet('/admin/api/properties').reply(200, {
      code: 401,
      message: '登录已失效',
      data: null
    })
    await expect(freshHttp.get('/admin/api/properties')).rejects.toEqual(
      expect.objectContaining({ code: 401, message: '登录已失效' })
    )
    expect(assignSpy).toHaveBeenCalledWith('/admin/login')
    expect(localStorage.getItem('adminAuth')).toBeNull()
  })

  it('登录接口 401 仅抛错不清凭证不跳转', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    localStorage.setItem(
      'adminAuth',
      JSON.stringify({ token: 'other-token', expiresAt: '2026-12-02T15:00:00' })
    )
    mock2.onPost('/admin/api/auth/login').reply(200, {
      code: 401,
      message: '用户名或密码错误',
      data: null
    })
    await expect(
      freshHttp.post('/admin/api/auth/login', { username: 'u', password: 'bad' })
    ).rejects.toEqual(expect.objectContaining({ code: 401, message: '用户名或密码错误' }))
    expect(assignSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem('adminAuth')).not.toBeNull()
  })

  it('HTTP 401 错误状态同样清凭证并跳转', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    mock2.onGet('/admin/api/buildings').reply(401, {
      code: 401,
      message: '登录已失效',
      data: null
    })
    await expect(freshHttp.get('/admin/api/buildings')).rejects.toEqual(
      expect.objectContaining({ code: 401, message: '登录已失效' })
    )
    expect(assignSpy).toHaveBeenCalledWith('/admin/login')
  })

  it('非 401 业务错误不触发跳转', async () => {
    vi.resetModules()
    const { http: freshHttp } = await import('../http')
    const mock2 = new MockAdapter(freshHttp)
    mock2.onGet('/admin/api/properties').reply(200, {
      code: 404,
      message: '房源不存在',
      data: null
    })
    await expect(freshHttp.get('/admin/api/properties')).rejects.toEqual(
      expect.objectContaining({ code: 404 })
    )
    expect(assignSpy).not.toHaveBeenCalled()
  })
})
