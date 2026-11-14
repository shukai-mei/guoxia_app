import { describe, expect, it, vi } from 'vitest'
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
