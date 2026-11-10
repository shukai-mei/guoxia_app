import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/http'
import { errorMessageOf } from '../error'

describe('errorMessageOf', () => {
  it('returns business error message from ApiError', () => {
    expect(errorMessageOf(new ApiError(404, '房源不存在'))).toBe('房源不存在')
    expect(errorMessageOf(new ApiError(409, '该预约已处理'))).toBe('该预约已处理')
    expect(errorMessageOf(new ApiError(400, '参数校验失败'))).toBe('参数校验失败')
  })

  it('returns network fallback message', () => {
    expect(errorMessageOf(new ApiError(-1, '网络异常，请稍后重试'))).toBe('网络异常，请稍后重试')
  })

  it('falls back to generic message for unexpected errors', () => {
    expect(errorMessageOf(new Error('boom'))).toBe('boom')
    expect(errorMessageOf('oops')).toBe('操作失败，请稍后重试')
    expect(errorMessageOf(undefined)).toBe('操作失败，请稍后重试')
  })
})
