import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAdminAuth, getAdminAuthToken, saveAdminAuth } from '../adminAuth'

function futureIso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString()
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-25T08:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('adminAuth 会话凭证管理', () => {
  it('保存后可按 token 读取', () => {
    saveAdminAuth({ token: 'token-1', expiresAt: futureIso(60_000) })
    expect(getAdminAuthToken()).toBe('token-1')
  })

  it('无凭证时返回 null', () => {
    expect(getAdminAuthToken()).toBeNull()
  })

  it('过期凭证视为未登录并清除', () => {
    saveAdminAuth({ token: 'token-old', expiresAt: futureIso(-1) })
    expect(getAdminAuthToken()).toBeNull()
    expect(localStorage.getItem('adminAuth')).toBeNull()
  })

  it('刚好到过期时间视为未登录', () => {
    saveAdminAuth({ token: 'token-edge', expiresAt: '2026-11-25T08:00:00Z' })
    expect(getAdminAuthToken()).toBeNull()
  })

  it('损坏的存储内容视为未登录并清除', () => {
    localStorage.setItem('adminAuth', '{broken json')
    expect(getAdminAuthToken()).toBeNull()
    expect(localStorage.getItem('adminAuth')).toBeNull()
  })

  it('字段缺失视为未登录并清除', () => {
    localStorage.setItem('adminAuth', JSON.stringify({ token: 'token-x' }))
    expect(getAdminAuthToken()).toBeNull()
    expect(localStorage.getItem('adminAuth')).toBeNull()
  })

  it('清除后读取返回 null', () => {
    saveAdminAuth({ token: 'token-2', expiresAt: futureIso(60_000) })
    clearAdminAuth()
    expect(getAdminAuthToken()).toBeNull()
    expect(localStorage.getItem('adminAuth')).toBeNull()
  })
})
