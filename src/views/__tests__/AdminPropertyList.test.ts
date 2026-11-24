import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import AdminPropertyList from '../admin/AdminPropertyList.vue'
import type { Property } from '../../api/types'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn(),
    showConfirmDialog: vi.fn()
  }
})

vi.mock('../../api', () => ({
  adminListProperties: vi.fn(),
  batchUpdatePropertyStatus: vi.fn(),
  updatePropertyRentStatus: vi.fn(),
  updatePropertyStatus: vi.fn()
}))

import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import {
  adminListProperties,
  batchUpdatePropertyStatus,
  updatePropertyRentStatus
} from '../../api'

const mockedList = vi.mocked(adminListProperties)
const mockedBatch = vi.mocked(batchUpdatePropertyStatus)
const mockedRentStatus = vi.mocked(updatePropertyRentStatus)

function propertyOf(
  id: number,
  title: string,
  status: Property['status'] = 'AVAILABLE',
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
    status,
    rentStatus,
    media: []
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminPropertyList', () => {
  it('renders properties with split status tags', async () => {
    mockedList.mockResolvedValue([
      propertyOf(1, '阳光公寓', 'AVAILABLE', 'PENDING_RENT'),
      propertyOf(2, '幸福里', 'OFF_SHELF', 'RENTED')
    ])
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('上架')
    expect(text).toContain('下架')
    expect(text).toContain('待租出')
    expect(text).toContain('已租出')
    expect(text).not.toContain('在租')
  })

  it('reloads with keyword and status filters when changed', async () => {
    mockedList.mockResolvedValue([])
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledTimes(1)
    expect(mockedList).toHaveBeenCalledWith({})

    const search = wrapper.findComponent({ name: 'VanSearch' })
    await search.vm.$emit('update:model-value', '阳光')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledWith({ keyword: '阳光' })

    const dropdownItems = wrapper.findAllComponents({ name: 'VanDropdownItem' })
    expect(dropdownItems.length).toBe(2)
    await dropdownItems[0].vm.$emit('update:model-value', 'OFF_SHELF')
    await dropdownItems[1].vm.$emit('update:model-value', 'RENTED')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledWith({ keyword: '阳光', status: 'OFF_SHELF', rentStatus: 'RENTED' })
  })

  it('batch publish is disabled without selection and enabled after selecting', async () => {
    mockedList.mockResolvedValue([
      propertyOf(1, '阳光公寓'),
      propertyOf(2, '幸福里')
    ])
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    let batchButton = wrapper.find('.batch-bar .van-button')
    expect(batchButton.exists()).toBe(true)
    expect(batchButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('批量上架(0)')

    const checkboxes = wrapper.findAllComponents({ name: 'VanCheckbox' })
    await checkboxes[1].vm.$emit('update:model-value', true)
    await flushPromises()
    expect(wrapper.text()).toContain('批量上架(1)')
    batchButton = wrapper.find('.batch-bar .van-button')
    expect(batchButton.attributes('disabled')).toBeUndefined()
  })

  it('batch publish confirms, calls api and reloads on success', async () => {
    mockedList.mockResolvedValue([
      propertyOf(1, '阳光公寓'),
      propertyOf(2, '幸福里')
    ])
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedBatch.mockResolvedValue(undefined)
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    const checkboxes = wrapper.findAllComponents({ name: 'VanCheckbox' })
    await checkboxes[1].vm.$emit('update:model-value', true)
    await checkboxes[2].vm.$emit('update:model-value', true)
    await flushPromises()
    expect(wrapper.text()).toContain('批量上架(2)')

    await wrapper.find('.batch-bar .van-button').trigger('click')
    await flushPromises()
    expect(showConfirmDialog).toHaveBeenCalledWith({
      title: '批量上架',
      message: '确认上架所选 2 个房源吗？'
    })
    expect(mockedBatch).toHaveBeenCalledWith([1, 2], 'AVAILABLE')
    expect(showSuccessToast).toHaveBeenCalledWith('上架成功')
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('batch publish keeps selection and shows toast on failure', async () => {
    mockedList.mockResolvedValue([
      propertyOf(1, '阳光公寓'),
      propertyOf(2, '幸福里')
    ])
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedBatch.mockRejectedValue(new Error('部分房源不存在'))
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    const checkboxes = wrapper.findAllComponents({ name: 'VanCheckbox' })
    await checkboxes[1].vm.$emit('update:model-value', true)
    await flushPromises()
    await wrapper.find('.batch-bar .van-button').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('部分房源不存在')
    expect(wrapper.text()).toContain('批量上架(1)')
  })

  it('select all toggles all visible properties', async () => {
    mockedList.mockResolvedValue([
      propertyOf(1, '阳光公寓'),
      propertyOf(2, '幸福里')
    ])
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    const selectAll = wrapper.find('.batch-bar .van-checkbox')
    await selectAll.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('批量上架(2)')

    await selectAll.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('批量上架(0)')
  })

  it('mark rented confirms and calls rent status api', async () => {
    mockedList.mockResolvedValue([propertyOf(1, '阳光公寓', 'AVAILABLE', 'PENDING_RENT')])
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedRentStatus.mockResolvedValue(undefined)
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    expect(wrapper.text()).toContain('标记已租出')
    const actions = wrapper.findAll('.admin-card-actions .van-button')
    const markButton = actions.find((b) => b.text() === '标记已租出')
    expect(markButton).toBeDefined()
    await markButton!.trigger('click')
    await flushPromises()
    expect(showConfirmDialog).toHaveBeenCalledWith({
      title: '标记已租出',
      message: '确认标记「阳光公寓」为已租出吗？该房源未结束的预约将失效并短信通知租客。'
    })
    expect(mockedRentStatus).toHaveBeenCalledWith(1, 'RENTED')
    expect(showSuccessToast).toHaveBeenCalledWith('已标记已租出')
  })

  it('back to pending rent shows confirm and calls api', async () => {
    mockedList.mockResolvedValue([propertyOf(1, '阳光公寓', 'AVAILABLE', 'RENTED')])
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedRentStatus.mockResolvedValue(undefined)
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    expect(wrapper.text()).toContain('改回待租出')
    const actions = wrapper.findAll('.admin-card-actions .van-button')
    const backButton = actions.find((b) => b.text() === '改回待租出')
    expect(backButton).toBeDefined()
    await backButton!.trigger('click')
    await flushPromises()
    expect(mockedRentStatus).toHaveBeenCalledWith(1, 'PENDING_RENT')
    expect(showSuccessToast).toHaveBeenCalledWith('已改回待租出')
  })

  it('cancel confirm does not call rent status api', async () => {
    mockedList.mockResolvedValue([propertyOf(1, '阳光公寓', 'AVAILABLE', 'PENDING_RENT')])
    vi.mocked(showConfirmDialog).mockRejectedValue(undefined)
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    const actions = wrapper.findAll('.admin-card-actions .van-button')
    const markButton = actions.find((b) => b.text() === '标记已租出')
    await markButton!.trigger('click')
    await flushPromises()
    expect(mockedRentStatus).not.toHaveBeenCalled()
  })

  it('empty filter result offers clearing filters', async () => {
    mockedList.mockResolvedValueOnce([])
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无房源')

    mockedList.mockResolvedValueOnce([])
    const search = wrapper.findComponent({ name: 'VanSearch' })
    await search.vm.$emit('update:model-value', '不存在')
    await flushPromises()
    expect(wrapper.text()).toContain('没有符合条件的房源')
    expect(wrapper.text()).toContain('清除筛选')
  })
})
