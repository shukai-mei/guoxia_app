import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import WechatConfig from '../admin/WechatConfig.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  adminGetWechatConfig: vi.fn(),
  adminUpdateWechatConfig: vi.fn()
}))

import { showToast } from 'vant'
import { adminGetWechatConfig, adminUpdateWechatConfig } from '../../api'

const mockedGet = vi.mocked(adminGetWechatConfig)
const mockedUpdate = vi.mocked(adminUpdateWechatConfig)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WechatConfig', () => {
  it('echoes existing contact and qr image', async () => {
    mockedGet.mockResolvedValue({ contact: 'guoxia', qrObjectKey: '2026/qr.png', qrUrl: 'https://signed/qr.png' })
    const { wrapper } = await mountAt(WechatConfig, '/admin/wechat-config')
    await flushPromises()
    expect((wrapper.find('input[placeholder="请输入客服微信号"]').element as HTMLInputElement).value).toBe('guoxia')
    expect(wrapper.find('img[src="https://signed/qr.png"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('客服二维码')
  })

  it('saves contact and qr key on submit', async () => {
    mockedGet.mockResolvedValue({ contact: 'guoxia', qrObjectKey: '2026/qr.png', qrUrl: 'https://signed/qr.png' })
    mockedUpdate.mockResolvedValue({ contact: 'guoxia', qrObjectKey: '2026/qr.png', qrUrl: 'https://signed/qr.png' })
    const { wrapper } = await mountAt(WechatConfig, '/admin/wechat-config')
    await flushPromises()
    await wrapper.find('input[placeholder="请输入客服微信号"]').setValue('guoxia2')
    await wrapper.find('.submit-wrap button').trigger('click')
    await flushPromises()
    expect(mockedUpdate).toHaveBeenCalledWith({ contact: 'guoxia2', qrObjectKey: '2026/qr.png' })
  })

  it('blocks submit without contact', async () => {
    mockedGet.mockResolvedValue({ contact: null, qrObjectKey: null, qrUrl: null })
    const { wrapper } = await mountAt(WechatConfig, '/admin/wechat-config')
    await flushPromises()
    await wrapper.find('.submit-wrap button').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('请填写客服微信号')
    expect(mockedUpdate).not.toHaveBeenCalled()
  })
})
