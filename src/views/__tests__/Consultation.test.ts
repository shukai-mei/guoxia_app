import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Vant from 'vant'
import Consultation from '../tenant/Consultation.vue'
import type { FaqListView, WechatConfig } from '../../api/types'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  getFaq: vi.fn(),
  getWechatConfig: vi.fn()
}))

import { showSuccessToast, showToast } from 'vant'
import { getFaq, getWechatConfig } from '../../api'

const mockedFaq = vi.mocked(getFaq)
const mockedWechat = vi.mocked(getWechatConfig)

const FAQ: FaqListView = {
  items: [
    { question: '如何预约看房？', answer: '在房源详情页填写姓名、手机号并获取验证码。' },
    { question: '房门密码如何获取？', answer: '密码将在预约时段前 5 分钟自动下发。' }
  ]
}

function wechatOf(contact: string | null, qrUrl: string | null = null): WechatConfig {
  return { contact, qrObjectKey: null, qrUrl }
}

async function mountComponent() {
  const wrapper = mount(Consultation, { global: { plugins: [Vant] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true
  })
})

describe('Consultation', () => {
  it('renders faq cards with first expanded by default', async () => {
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    const cards = wrapper.findAll('.faq')
    expect(cards.length).toBe(2)
    expect(wrapper.text()).toContain('常见咨询问题')
    expect(cards[0].classes()).toContain('open')
    expect(cards[1].classes()).not.toContain('open')
    expect(cards[0].find('.qi').text()).toBe('问')
    expect(cards[0].text()).toContain('如何预约看房？')
  })

  it('toggles expansion on question click', async () => {
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    const cards = wrapper.findAll('.faq')
    await cards[1].find('.q').trigger('click')
    expect(cards[1].classes()).toContain('open')
    expect(cards[0].classes()).not.toContain('open')
    await cards[1].find('.q').trigger('click')
    expect(cards[0].classes()).not.toContain('open')
    expect(cards[1].classes()).not.toContain('open')
  })

  it('renders butler card with wechat id and copy button', async () => {
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('管家联系方式')
    expect(wrapper.find('.contact').exists()).toBe(true)
    expect(wrapper.find('.online').text()).toBe('在线')
    expect(wrapper.text()).toContain('客服微信号：guoxia-service-01')
    expect(wrapper.find('.copy-btn').exists()).toBe(true)
  })

  it('copies wechat id via clipboard and shows success toast', async () => {
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    await wrapper.find('.copy-btn').trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('guoxia-service-01')
    expect(showSuccessToast).toHaveBeenCalledWith('微信号已复制')
  })

  it('copies via execCommand fallback when clipboard write is denied', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true
    })
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(true),
      configurable: true
    })
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    await wrapper.find('.copy-btn').trigger('click')
    await flushPromises()
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(showSuccessToast).toHaveBeenCalledWith('微信号已复制')
    expect(showToast).not.toHaveBeenCalled()
  })

  it('copies via execCommand fallback when clipboard api is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(true),
      configurable: true
    })
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    await wrapper.find('.copy-btn').trigger('click')
    await flushPromises()
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(showSuccessToast).toHaveBeenCalledWith('微信号已复制')
    expect(showToast).not.toHaveBeenCalled()
  })

  it('falls back to text selection when clipboard fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true
    })
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(false),
      configurable: true
    })
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    await wrapper.find('.copy-btn').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('复制失败，请手动复制微信号')
    const fallback = document.querySelector('textarea')
    expect(fallback).not.toBeNull()
    expect(fallback!.value).toBe('guoxia-service-01')
  })

  it('shows empty state when faq list is empty but keeps butler card', async () => {
    mockedFaq.mockResolvedValue({ items: [] })
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('暂无常见问题')
    expect(wrapper.findAll('.faq').length).toBe(0)
    expect(wrapper.find('.contact').exists()).toBe(true)
  })

  it('shows page error with retry on faq failure and recovers', async () => {
    mockedFaq.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    mockedWechat.mockResolvedValue(wechatOf('guoxia-service-01'))
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('网络异常，请稍后重试')
    expect(wrapper.findAll('.faq').length).toBe(0)
    expect(wrapper.find('.contact').exists()).toBe(false)
    mockedFaq.mockResolvedValueOnce(FAQ)
    await wrapper.find('.van-empty button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.faq').length).toBe(2)
    expect(wrapper.find('.contact').exists()).toBe(true)
  })

  it('hides butler card when wechat is not configured', async () => {
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf(null))
    const wrapper = await mountComponent()
    expect(wrapper.find('.contact').exists()).toBe(false)
    expect(wrapper.find('.copy-btn').exists()).toBe(false)
    expect(wrapper.findAll('.faq').length).toBe(2)
  })

  it('hides butler card when wechat request fails but keeps faq', async () => {
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockRejectedValue(new Error('网络异常'))
    const wrapper = await mountComponent()
    expect(wrapper.find('.contact').exists()).toBe(false)
    expect(wrapper.findAll('.faq').length).toBe(2)
  })

  it('shows card without copy button when only qr url is configured', async () => {
    mockedFaq.mockResolvedValue(FAQ)
    mockedWechat.mockResolvedValue(wechatOf(null, 'https://oss.example.com/qr.png'))
    const wrapper = await mountComponent()
    expect(wrapper.find('.contact').exists()).toBe(true)
    expect(wrapper.find('.copy-btn').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('客服微信号')
  })
})
