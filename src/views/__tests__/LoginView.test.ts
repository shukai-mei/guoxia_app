import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import MockAdapter from 'axios-mock-adapter'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount } from '@vue/test-utils'
import Vant from 'vant'
import LoginView from '../admin/LoginView.vue'
import { http } from '../../api/http'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

import { showToast } from 'vant'

const Dummy = { template: '<div />' }

function makeLoginRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: Dummy },
      { path: '/admin', name: 'admin-home', component: Dummy },
      { path: '/admin/appointments', name: 'admin-appointment-list', component: Dummy }
    ]
  })
}

async function mountLoginAt(path: string) {
  const router = makeLoginRouter()
  const replaceSpy = vi.spyOn(router, 'replace')
  await router.push(path)
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins: [Vant, router] } })
  return { wrapper, router, replaceSpy }
}

const mock = new MockAdapter(http)

beforeEach(() => {
  localStorage.clear()
  mock.reset()
  vi.mocked(showToast).mockClear()
})

describe('LoginView', () => {
  it('登录成功存储凭证并跳转 redirect 目标', async () => {
    const { wrapper, replaceSpy } = await mountLoginAt(
      '/admin/login?redirect=/admin/appointments'
    )
    mock.onPost('/admin/api/auth/login').reply(200, {
      code: 0,
      message: 'success',
      data: { token: 'token-1', expiresAt: '2026-12-02T15:00:00' }
    })

    await wrapper.find('input[name="username"]').setValue('13424022046')
    await wrapper.find('input[name="password"]').setValue('Aa123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith('/admin/appointments')
    expect(JSON.parse(localStorage.getItem('adminAuth')!)).toEqual({
      token: 'token-1',
      expiresAt: '2026-12-02T15:00:00'
    })
    const request = mock.history.post.find((r) => r.url === '/admin/api/auth/login')
    expect(JSON.parse(request!.data)).toEqual({
      username: '13424022046',
      password: 'Aa123456'
    })
  })

  it('无 redirect 时登录成功跳转管理首页', async () => {
    const { wrapper, replaceSpy } = await mountLoginAt('/admin/login')
    mock.onPost('/admin/api/auth/login').reply(200, {
      code: 0,
      message: 'success',
      data: { token: 'token-2', expiresAt: '2026-12-02T15:00:00' }
    })

    await wrapper.find('input[name="username"]').setValue('13424022046')
    await wrapper.find('input[name="password"]').setValue('Aa123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith('/admin')
  })

  it('登录失败展示后端提示且不跳转不存凭证', async () => {
    const { wrapper, replaceSpy } = await mountLoginAt('/admin/login')
    mock.onPost('/admin/api/auth/login').reply(200, {
      code: 401,
      message: '用户名或密码错误',
      data: null
    })

    await wrapper.find('input[name="username"]').setValue('13424022046')
    await wrapper.find('input[name="password"]').setValue('wrong-pw')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(showToast).toHaveBeenCalledWith('用户名或密码错误')
    expect(replaceSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem('adminAuth')).toBeNull()
  })

  it('用户名或密码为空时本地校验提示', async () => {
    const { wrapper } = await mountLoginAt('/admin/login')

    await wrapper.find('form').trigger('submit')
    expect(showToast).toHaveBeenCalledWith('请输入用户名')

    await wrapper.find('input[name="username"]').setValue('13424022046')
    await wrapper.find('form').trigger('submit')
    expect(showToast).toHaveBeenCalledWith('请输入密码')
    expect(mock.history.post.length).toBe(0)
  })
})
