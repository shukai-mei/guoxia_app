import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import MockAdapter from 'axios-mock-adapter'
import { mountAt } from './helpers'
import AdminHome from '../admin/AdminHome.vue'
import { http } from '../../api/http'

const mock = new MockAdapter(http)

beforeEach(() => {
  localStorage.clear()
  mock.reset()
})

describe('AdminHome', () => {
  it('renders all admin entries including content config', async () => {
    const { wrapper } = await mountAt(AdminHome, '/admin')
    expect(wrapper.text()).toContain('房源管理')
    expect(wrapper.text()).toContain('预约管理')
    expect(wrapper.text()).toContain('楼栋管理')
    expect(wrapper.text()).toContain('每日密码')
    expect(wrapper.text()).toContain('企微客服配置')
    expect(wrapper.text()).toContain('咨询内容配置')
    expect(wrapper.text()).toContain('咨询常见问题与看房须知')
  })

  it('navigates to content config on entry click', async () => {
    const { wrapper, router } = await mountAt(AdminHome, '/admin')
    const pushSpy = vi.spyOn(router, 'push')
    const cells = wrapper.findAll('.van-cell')
    const entry = cells.find((cell) => cell.text().includes('咨询内容配置'))
    expect(entry).toBeDefined()
    await entry!.trigger('click')
    expect(pushSpy).toHaveBeenCalledWith('/admin/content-config')
  })

  it('退出登录调登出接口、清凭证并跳转登录页', async () => {
    localStorage.setItem(
      'adminAuth',
      JSON.stringify({ token: 'logout-token', expiresAt: '2026-12-02T15:00:00' })
    )
    mock.onPost('/admin/api/auth/logout').reply(200, { code: 0, message: 'success', data: null })

    const { wrapper, replaceSpy } = await mountAt(AdminHome, '/admin')
    const buttons = wrapper.findAll('button')
    const logoutButton = buttons.find((b) => b.text().includes('退出登录'))
    expect(logoutButton).toBeDefined()
    await logoutButton!.trigger('click')
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith('/admin/login')
    expect(localStorage.getItem('adminAuth')).toBeNull()
    const request = mock.history.post.find((r) => r.url === '/admin/api/auth/logout')
    expect(request).toBeDefined()
    expect((request!.headers as Record<string, unknown>)['Authorization']).toBe(
      'Bearer logout-token'
    )
  })
})
