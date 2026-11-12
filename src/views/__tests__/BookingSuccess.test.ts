import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import BookingSuccess from '../tenant/BookingSuccess.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return { ...actual }
})

vi.mock('../../api', () => ({
  getProperty: vi.fn(),
  getWechatConfig: vi.fn()
}))

import { getProperty, getWechatConfig } from '../../api'

const mockedGetProperty = vi.mocked(getProperty)
const mockedGetWechatConfig = vi.mocked(getWechatConfig)

const SUCCESS_PATH = '/booking-success/9?propertyId=5&date=2026-11-15&slotStart=10%3A00&slotEnd=12%3A00'

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetProperty.mockResolvedValue({
    id: 5,
    title: '阳光公寓',
    location: '幸福路 1 号',
    layout: '两室一厅',
    area: 60,
    rent: 3000,
    description: null,
    contact: '13800138000',
    buildingId: 3,
    building: {
      id: 3,
      name: 'A栋',
      address: '幸福路 1 号',
      hasElevator: true,
      totalFloors: 12,
      elevatorRatio: null,
      deliveryFacilities: null,
      livingExperience: null,
      media: [{ key: '2026/map.jpg', url: 'https://signed/map.jpg', sortOrder: 0 }]
    },
    status: 'AVAILABLE',
    media: []
  })
  mockedGetWechatConfig.mockResolvedValue({ contact: 'guoxia', qrObjectKey: '2026/qr.png', qrUrl: 'https://signed/qr.png' })
})

describe('BookingSuccess', () => {
  it('renders appointment time, wechat qr and address images', async () => {
    const { wrapper } = await mountAt(BookingSuccess, SUCCESS_PATH)
    await flushPromises()
    expect(wrapper.text()).toContain('预约成功')
    expect(wrapper.text()).toContain('看房时间：2026-11-15 10:00~12:00')
    expect(wrapper.text()).toContain('客服微信号：guoxia')
    expect(wrapper.find('img[src="https://signed/qr.png"]').exists()).toBe(true)
    expect(wrapper.find('img[src="https://signed/map.jpg"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('远程开门禁')
  })

  it('shows error state when query params are missing', async () => {
    const { wrapper } = await mountAt(BookingSuccess, '/booking-success/9')
    await flushPromises()
    expect(wrapper.text()).toContain('预约信息缺失')
    expect(mockedGetProperty).not.toHaveBeenCalled()
  })

  it('shows error with retry on load failure and recovers after retry', async () => {
    mockedGetProperty.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    const { wrapper } = await mountAt(BookingSuccess, SUCCESS_PATH)
    await flushPromises()
    expect(wrapper.text()).toContain('网络异常，请稍后重试')
    mockedGetProperty.mockRejectedValueOnce(new Error('boom'))
    await wrapper.find('.van-empty button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('预约成功')
  })
})
