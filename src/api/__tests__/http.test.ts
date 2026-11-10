import { describe, expect, it } from 'vitest'
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

describe('ApiError', () => {
  it('is an Error with code', () => {
    const error = new ApiError(409, '该预约已处理')
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe(409)
    expect(error.message).toBe('该预约已处理')
  })
})
