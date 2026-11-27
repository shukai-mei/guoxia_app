import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import PropertyList from '../tenant/PropertyList.vue'
import type { BuildingInfo, PageResult, Property } from '../../api/types'

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

function pageResult(items: Property[], hasMore = false): PageResult<Property> {
  return { items, page: 1, size: 20, hasMore }
}

function buildingOf(selfOpenSupported: boolean): BuildingInfo {
  return {
    id: 1,
    name: '测试楼栋',
    address: '南山区测试大道 1 号',
    hasElevator: null,
    totalFloors: null,
    elevatorRatio: null,
    deliveryFacilities: null,
    livingExperience: null,
    selfOpenSupported,
    housekeeper: null,
    media: []
  }
}

function propertyOf(
  id: number,
  title: string,
  rentStatus: Property['rentStatus'] = 'PENDING_RENT',
  building: BuildingInfo | null = null
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
    building,
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
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓')]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(wrapper.text()).toContain('轻亭看房')
    expect(wrapper.text()).not.toContain('轻享看房')
    expect(wrapper.find('.my-entry').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('看房时段 · 开门密码 · 门禁开门')
  })

  it('renders property list with pull refresh wrapper', async () => {
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓'), propertyOf(2, '幸福里')]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(wrapper.findAll('.property-card').length).toBe(2)
    expect(wrapper.text()).toContain('阳光公寓')
    expect(wrapper.find('.van-pull-refresh').exists()).toBe(true)
  })

  it('pull refresh reloads properties with current filters', async () => {
    mockedList.mockResolvedValueOnce(pageResult([propertyOf(1, '阳光公寓')]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    mockedList.mockResolvedValueOnce(pageResult([propertyOf(1, '阳光公寓'), propertyOf(3, '新上房源')]))
    await (wrapper.vm as unknown as { onRefresh: () => Promise<void> }).onRefresh()
    await flushPromises()
    expect(wrapper.findAll('.property-card').length).toBe(2)
    expect(wrapper.text()).toContain('新上房源')
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('keeps list and shows toast when refresh fails', async () => {
    mockedList.mockResolvedValueOnce(pageResult([propertyOf(1, '阳光公寓')]))
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
    mockedList.mockResolvedValueOnce(pageResult([]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无在租房源')
    mockedList.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    await (wrapper.vm as unknown as { onRefresh: () => Promise<void> }).onRefresh()
    await flushPromises()
    expect(wrapper.text()).toContain('网络异常，请稍后重试')
  })

  it('shows rent status tags and dims rented cards', async () => {
    mockedList.mockResolvedValue(pageResult([
      propertyOf(1, '阳光公寓', 'PENDING_RENT'),
      propertyOf(2, '幸福里', 'RENTED')
    ]))
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
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓')]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledTimes(1)
    expect(mockedList).toHaveBeenCalledWith({}, 1)

    const rentedChip = wrapper.findAll('.chip').find((c) => c.text() === '已租出')
    await rentedChip!.trigger('click')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledWith({ rentStatus: 'RENTED' }, 1)
  })

  it('switching back to 全部 chip resets rent status and reloads', async () => {
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓')]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()

    let chips = wrapper.findAll('.chip')
    await chips.find((c) => c.text() === '已租出')!.trigger('click')
    await flushPromises()

    chips = wrapper.findAll('.chip')
    await chips.find((c) => c.text() === '全部')!.trigger('click')
    await flushPromises()
    expect(mockedList).toHaveBeenLastCalledWith({}, 1)
  })

  it('shows self-open viewing tag for pending properties in self-open buildings', async () => {
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓', 'PENDING_RENT', buildingOf(true))]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    const row = wrapper.find('.visit-row')
    expect(row.exists()).toBe(true)
    expect(row.text()).toContain('看房')
    expect(row.find('.visit-tag').classes()).toContain('self')
    expect(row.text()).toContain('自助看房')
  })

  it('shows escort viewing tag for pending properties in escort buildings', async () => {
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓', 'PENDING_RENT', buildingOf(false))]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    const row = wrapper.find('.visit-row')
    expect(row.exists()).toBe(true)
    expect(row.find('.visit-tag').classes()).toContain('escort')
    expect(row.text()).toContain('管家带看')
  })

  it('hides viewing tag for rented or building-less properties', async () => {
    mockedList.mockResolvedValue(pageResult([
      propertyOf(1, '阳光公寓', 'PENDING_RENT'),
      propertyOf(2, '幸福里', 'RENTED', buildingOf(true))
    ]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(wrapper.find('.visit-row').exists()).toBe(false)
  })

  it('loads next page and appends properties', async () => {
    mockedList
      .mockResolvedValueOnce(pageResult([propertyOf(1, '阳光公寓')], true))
      .mockResolvedValueOnce(pageResult([propertyOf(2, '幸福里')]))
    const { wrapper } = await mountAt(PropertyList, '/')
    await flushPromises()
    expect(wrapper.findAll('.property-card').length).toBe(2)
    expect(wrapper.text()).toContain('幸福里')
    expect(mockedList).toHaveBeenCalledTimes(2)
    expect(mockedList).toHaveBeenNthCalledWith(1, {}, 1)
    expect(mockedList).toHaveBeenNthCalledWith(2, {}, 2)
  })
})
