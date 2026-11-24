import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import PropertyList from '../tenant/PropertyList.vue'
import type { Property } from '../../api/types'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  listProperties: vi.fn()
}))

import { showToast } from 'vant'
import { listProperties } from '../../api'

const mockedList = vi.mocked(listProperties)

function propertyOf(
  id: number,
  title: string,
  rentStatus: Property['rentStatus'] = 'PENDING_RENT'
): Property {
  return {
    id,
    title,
    location: '南山区测试大道 1 号',
    layout: '两室一厅',
    area: 60,
    rent: 3800,
    description: null,
    contact: '13800000000',
    buildingId: 1,
    building: null,
    ttlockLockId: null,
    status: 'AVAILABLE',
    rentStatus,
    media: []
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PropertyList', () => {
  it('shows new title and no my-appointments banner', async () => {
    mockedList.mockResolvedValue([propertyOf(1, '阳光公寓')])
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(wrapper.text()).toContain('轻亭看房')
    expect(wrapper.text()).not.toContain('轻享看房')
    expect(wrapper.find('.my-entry').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('看房时段 · 开门密码 · 门禁开门')
  })

  it('renders property list with pull refresh wrapper', async () => {
    mockedList.mockResolvedValue([propertyOf(1, '阳光公寓'), propertyOf(2, '幸福里')])
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(wrapper.findAll('.property-card').length).toBe(2)
    expect(wrapper.text()).toContain('阳光公寓')
    expect(wrapper.find('.van-pull-refresh').exists()).toBe(true)
  })

  it('pull refresh reloads properties with current filters', async () => {
    mockedList.mockResolvedValueOnce([propertyOf(1, '阳光公寓')])
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    mockedList.mockResolvedValueOnce([propertyOf(1, '阳光公寓'), propertyOf(3, '新上房源')])
    await (wrapper.vm as unknown as { onRefresh: () => Promise<void> }).onRefresh()
    await flushPromises()
    expect(wrapper.findAll('.property-card').length).toBe(2)
    expect(wrapper.text()).toContain('新上房源')
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('keeps list and shows toast when refresh fails', async () => {
    mockedList.mockResolvedValueOnce([propertyOf(1, '阳光公寓')])
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    mockedList.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    await (wrapper.vm as unknown as { onRefresh: () => Promise<void> }).onRefresh()
    await flushPromises()
    expect(wrapper.findAll('.property-card').length).toBe(1)
    expect(wrapper.find('.van-empty').exists()).toBe(false)
    expect(showToast).toHaveBeenCalledWith('网络异常，请稍后重试')
  })

  it('shows error state when refresh fails with empty list', async () => {
    mockedList.mockResolvedValueOnce([])
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无在租房源')
    mockedList.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    await (wrapper.vm as unknown as { onRefresh: () => Promise<void> }).onRefresh()
    await flushPromises()
    expect(wrapper.text()).toContain('网络异常，请稍后重试')
  })

  it('shows rent status tags and dims rented cards', async () => {
    mockedList.mockResolvedValue([
      propertyOf(1, '阳光公寓', 'PENDING_RENT'),
      propertyOf(2, '幸福里', 'RENTED')
    ])
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    const cards = wrapper.findAll('.property-card')
    expect(cards.length).toBe(2)
    expect(cards[0].find('.status-tag--rent').exists()).toBe(true)
    expect(cards[0].find('.status-tag--rent').text()).toBe('待租')
    expect(cards[0].classes()).not.toContain('property-card-rented')
    expect(cards[1].find('.status-tag--rented').exists()).toBe(true)
    expect(cards[1].find('.status-tag--rented').text()).toBe('已租出')
    expect(cards[1].classes()).toContain('property-card-rented')
  })

  it('rent status chip reloads with rentStatus param', async () => {
    mockedList.mockResolvedValue([propertyOf(1, '阳光公寓')])
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledTimes(1)
    expect(mockedList).toHaveBeenCalledWith({})

    const rentedChip = wrapper.findAll('.chip').find((c) => c.text() === '已租出')
    await rentedChip!.trigger('click')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledWith({ rentStatus: 'RENTED' })
  })

  it('switching back to 全部 chip resets rent status and reloads', async () => {
    mockedList.mockResolvedValue([propertyOf(1, '阳光公寓')])
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()

    let chips = wrapper.findAll('.chip')
    await chips.find((c) => c.text() === '已租出')!.trigger('click')
    await flushPromises()

    chips = wrapper.findAll('.chip')
    await chips.find((c) => c.text() === '全部')!.trigger('click')
    await flushPromises()
    expect(mockedList).toHaveBeenLastCalledWith({})
  })
})
