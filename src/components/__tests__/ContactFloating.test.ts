import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ContactFloating from '../ContactFloating.vue'
import type { WechatConfig } from '../../api/types'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  getWechatConfig: vi.fn()
}))

import { showToast } from 'vant'
import { getWechatConfig } from '../../api'

const mockedGetConfig = vi.mocked(getWechatConfig)

function configured(qrUrl: string | null, contact: string | null): WechatConfig {
  return { contact, qrObjectKey: null, qrUrl }
}

async function mountComponent() {
  const wrapper = mount(ContactFloating)
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

describe('ContactFloating', () => {
  it('hides when config request fails', async () => {
    mockedGetConfig.mockRejectedValue(new Error('网络异常'))
    const wrapper = await mountComponent()
    expect(wrapper.find('.contact-floating').exists()).toBe(false)
  })

  it('hides when neither qr url nor contact is configured', async () => {
    mockedGetConfig.mockResolvedValue(configured(null, null))
    const wrapper = await mountComponent()
    expect(wrapper.find('.contact-floating').exists()).toBe(false)
  })

  it('collapsed by default and expands to show qr and contact', async () => {
    mockedGetConfig.mockResolvedValue(
      configured('https://oss.example.com/qr.png', 'guoxia-service-01')
    )
    const wrapper = await mountComponent()
    expect(wrapper.find('.contact-panel').exists()).toBe(false)
    expect(wrapper.find('.contact-bubble').text()).toContain('联系管家')
    expect(wrapper.find('.contact-bubble').text()).toContain('看房问题 一键咨询')

    await wrapper.find('.contact-bubble').trigger('click')
    expect(wrapper.find('.contact-panel').exists()).toBe(true)
    expect(wrapper.find('.contact-qr').attributes('src')).toBe('https://oss.example.com/qr.png')
    expect(wrapper.find('.contact-row').text()).toContain('guoxia-service-01')
    expect(wrapper.find('.contact-bubble').text()).toContain('联系管家')
  })

  it('collapses via bubble or 收起', async () => {
    mockedGetConfig.mockResolvedValue(configured('https://oss.example.com/qr.png', null))
    const wrapper = await mountComponent()
    await wrapper.find('.contact-bubble').trigger('click')
    expect(wrapper.find('.contact-panel').exists()).toBe(true)
    await wrapper.find('.contact-collapse').trigger('click')
    expect(wrapper.find('.contact-panel').exists()).toBe(false)
  })

  it('copies contact to clipboard with success toast', async () => {
    mockedGetConfig.mockResolvedValue(configured(null, 'guoxia-service-01'))
    const wrapper = await mountComponent()
    await wrapper.find('.contact-bubble').trigger('click')
    await wrapper.find('.contact-copy').trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('guoxia-service-01')
    expect(showToast).toHaveBeenCalledWith('微信号已复制')
  })

  it('falls back to text selection when clipboard fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true
    })
    mockedGetConfig.mockResolvedValue(configured(null, 'guoxia-service-01'))
    const wrapper = await mountComponent()
    await wrapper.find('.contact-bubble').trigger('click')
    await wrapper.find('.contact-copy').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('复制失败，请手动复制')
    const fallback = document.querySelector('textarea')
    expect(fallback).not.toBeNull()
    expect(fallback!.value).toBe('guoxia-service-01')
  })

  it('toggles panel on pointer tap without movement', async () => {
    mockedGetConfig.mockResolvedValue(configured('https://oss.example.com/qr.png', null))
    const wrapper = await mountComponent()
    const bubble = wrapper.find('.contact-bubble')
    await bubble.trigger('pointerdown', { pointerId: 1, clientX: 800, clientY: 600 })
    await bubble.trigger('pointerup', { pointerId: 1, clientX: 802, clientY: 601 })
    expect(wrapper.find('.contact-panel').exists()).toBe(true)
  })

  it('moves bubble on drag without toggling panel and suppresses following click', async () => {
    mockedGetConfig.mockResolvedValue(configured('https://oss.example.com/qr.png', null))
    const wrapper = await mountComponent()
    const bubble = wrapper.find('.contact-bubble')
    await bubble.trigger('pointerdown', { pointerId: 1, clientX: 800, clientY: 600 })
    await bubble.trigger('pointermove', { pointerId: 1, clientX: 700, clientY: 500 })
    await bubble.trigger('pointerup', { pointerId: 1, clientX: 700, clientY: 500 })
    expect(wrapper.find('.contact-panel').exists()).toBe(false)
    const style = wrapper.find('.contact-floating').attributes('style')
    expect(style).toContain('left:')
    expect(style).toContain('top:')
    expect(style).toContain('right: auto')
    await bubble.trigger('click')
    expect(wrapper.find('.contact-panel').exists()).toBe(false)
  })

  it('ignores pointer move before pointer down', async () => {
    mockedGetConfig.mockResolvedValue(configured('https://oss.example.com/qr.png', null))
    const wrapper = await mountComponent()
    const bubble = wrapper.find('.contact-bubble')
    await bubble.trigger('pointermove', { pointerId: 9, clientX: 700, clientY: 500 })
    expect(wrapper.find('.contact-floating').attributes('style')).toBeUndefined()
  })

  it('drags whole widget from expanded panel and keeps panel open', async () => {
    mockedGetConfig.mockResolvedValue(configured('https://oss.example.com/qr.png', null))
    const wrapper = await mountComponent()
    await wrapper.find('.contact-bubble').trigger('click')
    const panel = wrapper.find('.contact-panel')
    await panel.trigger('pointerdown', { pointerId: 1, clientX: 800, clientY: 400 })
    await panel.trigger('pointermove', { pointerId: 1, clientX: 700, clientY: 300 })
    await panel.trigger('pointerup', { pointerId: 1, clientX: 700, clientY: 300 })
    expect(wrapper.find('.contact-panel').exists()).toBe(true)
    expect(wrapper.find('.contact-floating').attributes('style')).toContain('left:')
    expect(wrapper.find('.contact-floating').attributes('style')).toContain('top:')
  })

  it('tap on panel copy button does not collapse panel', async () => {
    mockedGetConfig.mockResolvedValue(configured(null, 'guoxia-service-01'))
    const wrapper = await mountComponent()
    await wrapper.find('.contact-bubble').trigger('click')
    const copy = wrapper.find('.contact-copy')
    await copy.trigger('pointerdown', { pointerId: 1, clientX: 10, clientY: 10 })
    await copy.trigger('pointerup', { pointerId: 1, clientX: 11, clientY: 10 })
    await copy.trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('guoxia-service-01')
    expect(wrapper.find('.contact-panel').exists()).toBe(true)
  })

  it('drag ending on panel suppresses panel button click', async () => {
    mockedGetConfig.mockResolvedValue(configured(null, 'guoxia-service-01'))
    const wrapper = await mountComponent()
    await wrapper.find('.contact-bubble').trigger('click')
    const panel = wrapper.find('.contact-panel')
    await panel.trigger('pointerdown', { pointerId: 1, clientX: 800, clientY: 400 })
    await panel.trigger('pointermove', { pointerId: 1, clientX: 650, clientY: 260 })
    await panel.trigger('pointerup', { pointerId: 1, clientX: 650, clientY: 260 })
    await wrapper.find('.contact-copy').trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
    expect(wrapper.find('.contact-panel').exists()).toBe(true)
  })

  it('clamps position into viewport when expanding after dragging to edge', async () => {
    mockedGetConfig.mockResolvedValue(configured('https://oss.example.com/qr.png', null))
    const wrapper = await mountComponent()
    const bubble = wrapper.find('.contact-bubble')
    await bubble.trigger('pointerdown', { pointerId: 1, clientX: 500, clientY: 500 })
    await bubble.trigger('pointermove', { pointerId: 1, clientX: 2000, clientY: 2000 })
    await bubble.trigger('pointerup', { pointerId: 1, clientX: 2000, clientY: 2000 })
    await bubble.trigger('click')
    await bubble.trigger('click')
    await flushPromises()
    expect(wrapper.find('.contact-panel').exists()).toBe(true)
    const style = wrapper.find('.contact-floating').attributes('style')
    expect(style).toContain('left: 0px')
    expect(style).toContain('top: 0px')
  })
})
