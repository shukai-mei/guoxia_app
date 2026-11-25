import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Vant from 'vant'
import Consultation from '../tenant/Consultation.vue'
import type { FaqListView } from '../../api/types'

vi.mock('../../api', () => ({
  getFaq: vi.fn()
}))

import { getFaq } from '../../api'

const mockedFaq = vi.mocked(getFaq)

const FAQ: FaqListView = {
  items: [
    { question: '如何预约看房？', answer: '在房源详情页填写姓名、手机号并获取验证码。' },
    { question: '房门密码如何获取？', answer: '密码将在预约时段前 5 分钟自动下发。' }
  ]
}

async function mountComponent() {
  const wrapper = mount(Consultation, { global: { plugins: [Vant] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Consultation', () => {
  it('renders faq cards with first expanded by default', async () => {
    mockedFaq.mockResolvedValue(FAQ)
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
    const wrapper = await mountComponent()
    const cards = wrapper.findAll('.faq')
    await cards[1].find('.q').trigger('click')
    expect(cards[1].classes()).toContain('open')
    expect(cards[0].classes()).not.toContain('open')
    await cards[1].find('.q').trigger('click')
    expect(cards[0].classes()).not.toContain('open')
    expect(cards[1].classes()).not.toContain('open')
  })

  it('shows no butler contact card or copy button', async () => {
    mockedFaq.mockResolvedValue(FAQ)
    const wrapper = await mountComponent()
    expect(wrapper.text()).not.toContain('管家联系方式')
    expect(wrapper.text()).not.toContain('客服微信号')
    expect(wrapper.find('.contact').exists()).toBe(false)
    expect(wrapper.find('.copy-btn').exists()).toBe(false)
    expect(wrapper.findAll('.faq').length).toBe(2)
  })

  it('shows empty state when faq list is empty', async () => {
    mockedFaq.mockResolvedValue({ items: [] })
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('暂无常见问题')
    expect(wrapper.findAll('.faq').length).toBe(0)
    expect(wrapper.find('.contact').exists()).toBe(false)
  })

  it('shows page error with retry on faq failure and recovers', async () => {
    mockedFaq.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('网络异常，请稍后重试')
    expect(wrapper.findAll('.faq').length).toBe(0)
    mockedFaq.mockResolvedValueOnce(FAQ)
    await wrapper.find('.van-empty button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.faq').length).toBe(2)
    expect(wrapper.find('.contact').exists()).toBe(false)
  })
})
