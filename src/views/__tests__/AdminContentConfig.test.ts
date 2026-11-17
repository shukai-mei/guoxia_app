import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Vant from 'vant'
import AdminContentConfig from '../admin/AdminContentConfig.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  adminGetFaq: vi.fn(),
  adminGetViewingRules: vi.fn(),
  adminUpdateFaq: vi.fn(),
  adminUpdateViewingRules: vi.fn()
}))

import { showSuccessToast, showToast } from 'vant'
import {
  adminGetFaq,
  adminGetViewingRules,
  adminUpdateFaq,
  adminUpdateViewingRules
} from '../../api'

const mockedGetFaq = vi.mocked(adminGetFaq)
const mockedGetRules = vi.mocked(adminGetViewingRules)
const mockedUpdateFaq = vi.mocked(adminUpdateFaq)
const mockedUpdateRules = vi.mocked(adminUpdateViewingRules)

async function mountComponent() {
  const wrapper = mount(AdminContentConfig, { global: { plugins: [Vant] } })
  await flushPromises()
  return wrapper
}

function textareas(wrapper: VueWrapper) {
  return wrapper.findAll('textarea')
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetFaq.mockResolvedValue({
    items: [
      { question: '如何预约看房？', answer: '在房源详情页填写信息后提交即可' },
      { question: '房门密码如何获取？', answer: '密码将在预约时段前 5 分钟自动下发' }
    ]
  })
  mockedGetRules.mockResolvedValue({
    items: ['看房期间请勿破坏房内设施', '如有满意房源，可联系管家走签约流程']
  })
})

describe('AdminContentConfig', () => {
  it('echoes faq and rules as lines on load', async () => {
    const wrapper = await mountComponent()
    const areas = textareas(wrapper)
    expect(areas.length).toBe(2)
    expect(areas[0].element.value).toBe(
      '如何预约看房？ | 在房源详情页填写信息后提交即可\n房门密码如何获取？ | 密码将在预约时段前 5 分钟自动下发'
    )
    expect(areas[1].element.value).toBe(
      '看房期间请勿破坏房内设施\n如有满意房源，可联系管家走签约流程'
    )
  })

  it('submits parsed structured payloads on save', async () => {
    mockedUpdateFaq.mockResolvedValue({ items: [] })
    mockedUpdateRules.mockResolvedValue({ items: [] })
    const wrapper = await mountComponent()
    const areas = textareas(wrapper)
    await areas[0].setValue('如何预约看房？ | 在房源详情页填写信息后提交即可\n答案含 | 的内容 | 切分到答案侧')
    await areas[1].setValue('规则一\n规则二')
    await wrapper.find('.submit-wrap button').trigger('click')
    await flushPromises()
    expect(mockedUpdateFaq).toHaveBeenCalledWith({
      items: [
        { question: '如何预约看房？', answer: '在房源详情页填写信息后提交即可' },
        { question: '答案含', answer: '的内容 | 切分到答案侧' }
      ]
    })
    expect(mockedUpdateRules).toHaveBeenCalledWith({
      items: ['规则一', '规则二']
    })
    expect(showSuccessToast).toHaveBeenCalledWith('保存成功')
  })

  it('blocks submit when faq line lacks separator', async () => {
    const wrapper = await mountComponent()
    await textareas(wrapper)[0].setValue('没有分隔符的行')
    await wrapper.find('.submit-wrap button').trigger('click')
    expect(showToast).toHaveBeenCalledWith('第 1 行缺少「|」分隔符')
    expect(mockedUpdateFaq).not.toHaveBeenCalled()
    expect(mockedUpdateRules).not.toHaveBeenCalled()
  })

  it('blocks submit when faq question or answer is empty', async () => {
    const wrapper = await mountComponent()
    const areas = textareas(wrapper)
    await areas[0].setValue('正常问题 | 正常答案\n问题为空 |')
    await wrapper.find('.submit-wrap button').trigger('click')
    expect(showToast).toHaveBeenCalledWith('第 2 行问题或答案不能为空')
    expect(mockedUpdateFaq).not.toHaveBeenCalled()
    await areas[0].setValue('| 答案为空')
    await wrapper.find('.submit-wrap button').trigger('click')
    expect(showToast).toHaveBeenCalledWith('第 1 行问题或答案不能为空')
    expect(mockedUpdateFaq).not.toHaveBeenCalled()
  })

  it('blocks submit when rules contains empty line', async () => {
    const wrapper = await mountComponent()
    await textareas(wrapper)[1].setValue('规则一\n\n规则二')
    await wrapper.find('.submit-wrap button').trigger('click')
    expect(showToast).toHaveBeenCalledWith('第 2 行不能为空')
    expect(mockedUpdateFaq).not.toHaveBeenCalled()
    expect(mockedUpdateRules).not.toHaveBeenCalled()
  })

  it('skips blank faq lines on save', async () => {
    mockedUpdateFaq.mockResolvedValue({ items: [] })
    mockedUpdateRules.mockResolvedValue({ items: [] })
    const wrapper = await mountComponent()
    const areas = textareas(wrapper)
    await areas[0].setValue('问题一 | 答案一\n\n问题二 | 答案二')
    await wrapper.find('.submit-wrap button').trigger('click')
    await flushPromises()
    expect(mockedUpdateFaq).toHaveBeenCalledWith({
      items: [
        { question: '问题一', answer: '答案一' },
        { question: '问题二', answer: '答案二' }
      ]
    })
  })

  it('shows backend error message and keeps textarea content on save failure', async () => {
    mockedUpdateFaq.mockRejectedValue(new Error('问题最多 50 条'))
    const wrapper = await mountComponent()
    const areas = textareas(wrapper)
    await areas[0].setValue('问题一 | 答案一')
    await wrapper.find('.submit-wrap button').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('问题最多 50 条')
    expect(areas[0].element.value).toBe('问题一 | 答案一')
    expect(showSuccessToast).not.toHaveBeenCalled()
  })

  it('shows error with retry on load failure and recovers', async () => {
    mockedGetFaq.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('网络异常，请稍后重试')
    mockedGetFaq.mockResolvedValueOnce({
      items: [{ question: '问题一', answer: '答案一' }]
    })
    await wrapper.find('.van-empty button').trigger('click')
    await flushPromises()
    expect(textareas(wrapper)[0].element.value).toBe('问题一 | 答案一')
  })
})
