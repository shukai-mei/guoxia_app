import { beforeEach, describe, expect, it, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'

function setLocation(path: string) {
  window.history.replaceState(null, '', `${window.location.origin}${path}`)
}

async function freshIdentity() {
  vi.resetModules()
  const { http } = await import('../../api/http')
  const mock = new MockAdapter(http)
  const identity = await import('../identity')
  return { identity, mock }
}

beforeEach(() => {
  localStorage.clear()
  setLocation('/')
})

describe('getOrCreateIdentity', () => {
  it('首次访问生成伪身份并持久化', async () => {
    const { identity } = await freshIdentity()
    const id = identity.getOrCreateIdentity()
    expect(id.length).toBeGreaterThan(0)
    expect(localStorage.getItem('viewerIdentity')).toBe(id)
  })

  it('再次访问沿用本地既有身份，不重新生成', async () => {
    localStorage.setItem('viewerIdentity', 'openid-stored')
    const { identity } = await freshIdentity()
    expect(identity.getOrCreateIdentity()).toBe('openid-stored')
    expect(localStorage.getItem('viewerIdentity')).toBe('openid-stored')
  })

  it('生成的身份全局唯一', async () => {
    const { identity } = await freshIdentity()
    const first = identity.getOrCreateIdentity()
    localStorage.removeItem('viewerIdentity')
    const second = identity.getOrCreateIdentity()
    expect(first).not.toBe(second)
  })
})

describe('ensureIdentityInitialized', () => {
  it('无 wxcode 时初始化返回伪身份', async () => {
    const { identity } = await freshIdentity()
    const id = await identity.ensureIdentityInitialized()
    expect(localStorage.getItem('viewerIdentity')).toBe(id)
  })

  it('携带 wxcode 换取 openid 成功并持久化', async () => {
    setLocation('/?wxcode=code-1')
    const { identity, mock } = await freshIdentity()
    mock
      .onPost('/api/wechat/session')
      .reply(200, { code: 0, message: 'success', data: { openid: 'openid-1' } })
    const id = await identity.ensureIdentityInitialized()
    expect(id).toBe('openid-1')
    expect(localStorage.getItem('viewerIdentity')).toBe('openid-1')
    const request = mock.history.post.find((r) => r.url === '/api/wechat/session')
    expect(request).toBeDefined()
    expect(JSON.parse(request!.data)).toEqual({ code: 'code-1' })
  })

  it('换取失败降级为伪身份并持久化，功能不受影响', async () => {
    setLocation('/?wxcode=bad-code')
    const { identity, mock } = await freshIdentity()
    mock
      .onPost('/api/wechat/session')
      .reply(200, { code: 400, message: '登录凭证无效', data: null })
    const id = await identity.ensureIdentityInitialized()
    expect(id.length).toBeGreaterThan(0)
    expect(localStorage.getItem('viewerIdentity')).toBe(id)
  })

  it('已有身份时不重复换取、不覆盖', async () => {
    localStorage.setItem('viewerIdentity', 'openid-existing')
    setLocation('/?wxcode=code-2')
    const { identity, mock } = await freshIdentity()
    const id = await identity.ensureIdentityInitialized()
    expect(id).toBe('openid-existing')
    expect(mock.history.post.length).toBe(0)
  })

  it('模块级单例：并发调用返回同一身份', async () => {
    const { identity } = await freshIdentity()
    const [a, b] = await Promise.all([
      identity.ensureIdentityInitialized(),
      identity.ensureIdentityInitialized()
    ])
    expect(a).toBe(b)
  })
})
