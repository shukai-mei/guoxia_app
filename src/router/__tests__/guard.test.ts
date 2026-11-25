import { beforeEach, describe, expect, it } from 'vitest'
import router from '../index'
import { saveAdminAuth } from '../../utils/adminAuth'

function futureIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString()
}

beforeEach(() => {
  localStorage.clear()
})

describe('admin 路由守卫', () => {
  it('未登录访问 /admin 重定向登录页并记录目标', async () => {
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/admin/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin')
  })

  it('未登录访问管理子页记录完整目标路径', async () => {
    await router.push('/admin/properties/new')
    expect(router.currentRoute.value.path).toBe('/admin/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/properties/new')
  })

  it('已登录访问管理页正常放行', async () => {
    saveAdminAuth({ token: 'token-a', expiresAt: futureIso() })
    await router.push('/admin/buildings')
    expect(router.currentRoute.value.path).toBe('/admin/buildings')
  })

  it('已登录访问登录页跳转管理首页', async () => {
    saveAdminAuth({ token: 'token-b', expiresAt: futureIso() })
    await router.push('/admin/login')
    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('已登录访问登录页跳转 redirect 目标', async () => {
    saveAdminAuth({ token: 'token-c', expiresAt: futureIso() })
    await router.push('/admin/login?redirect=/admin/appointments')
    expect(router.currentRoute.value.path).toBe('/admin/appointments')
  })

  it('过期凭证视为未登录并拦截', async () => {
    saveAdminAuth({ token: 'token-d', expiresAt: '2020-01-01T00:00:00Z' })
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/admin/login')
  })

  it('租客端路由不受守卫影响', async () => {
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/')
  })
})
