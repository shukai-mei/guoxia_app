import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import AdminPropertyList from '../admin/AdminPropertyList.vue'
import type { PageResult, Property } from '../../api/types'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn(),
    showConfirmDialog: vi.fn(),
    showDialog: vi.fn()
  }
})

vi.mock('../../api', () => ({
  adminListProperties: vi.fn(),
  batchUpdatePropertyStatus: vi.fn(),
  updatePropertyRentStatus: vi.fn(),
  updatePropertyStatus: vi.fn()
}))

import { showConfirmDialog, showDialog, showSuccessToast, showToast } from 'vant'
import {
  adminListProperties,
  batchUpdatePropertyStatus,
  updatePropertyRentStatus,
  updatePropertyStatus
} from '../../api'
import { ApiError } from '../../api/http'

const mockedList = vi.mocked(adminListProperties)
const mockedBatch = vi.mocked(batchUpdatePropertyStatus)
const mockedRentStatus = vi.mocked(updatePropertyRentStatus)
const mockedUpdateStatus = vi.mocked(updatePropertyStatus)

function pageResult(items: Property[], hasMore = false): PageResult<Property> {
  return { items, page: 1, size: 20, hasMore }
}

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
    mockedList.mockResolvedValue(pageResult([
      propertyOf(1, '阳光公寓', 'AVAILABLE', 'PENDING_RENT'),
      propertyOf(2, '幸福里', 'OFF_SHELF', 'RENTED')
    ]))
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
    mockedList.mockResolvedValue(pageResult([]))
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledTimes(1)
    expect(mockedList).toHaveBeenCalledWith({}, 1)

    const search = wrapper.findComponent({ name: 'VanSearch' })
    await search.vm.$emit('update:model-value', '阳光')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledWith({ keyword: '阳光' }, 1)

    const dropdownItems = wrapper.findAllComponents({ name: 'VanDropdownItem' })
    expect(dropdownItems.length).toBe(2)
    await dropdownItems[0].vm.$emit('update:model-value', 'OFF_SHELF')
    await dropdownItems[1].vm.$emit('update:model-value', 'RENTED')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledWith({ keyword: '阳光', status: 'OFF_SHELF', rentStatus: 'RENTED' }, 1)
  })

  it('batch publish is disabled without selection and enabled after selecting', async () => {
    mockedList.mockResolvedValue(pageResult([
      propertyOf(1, '阳光公寓'),
      propertyOf(2, '幸福里')
    ]))
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
    mockedList.mockResolvedValue(pageResult([
      propertyOf(1, '阳光公寓'),
      propertyOf(2, '幸福里')
    ]))
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
    mockedList.mockResolvedValue(pageResult([
      propertyOf(1, '阳光公寓'),
      propertyOf(2, '幸福里')
    ]))
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
    mockedList.mockResolvedValue(pageResult([
      propertyOf(1, '阳光公寓'),
      propertyOf(2, '幸福里')
    ]))
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
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓', 'AVAILABLE', 'PENDING_RENT')]))
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
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓', 'AVAILABLE', 'RENTED')]))
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
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓', 'AVAILABLE', 'PENDING_RENT')]))
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
    mockedList.mockResolvedValueOnce(pageResult([]))
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无房源')

    mockedList.mockResolvedValueOnce(pageResult([]))
    const search = wrapper.findComponent({ name: 'VanSearch' })
    await search.vm.$emit('update:model-value', '不存在')
    await flushPromises()
    expect(wrapper.text()).toContain('没有符合条件的房源')
    expect(wrapper.text()).toContain('清除筛选')
  })

  it('single publish blocked by device check shows blocking dialog', async () => {
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓', 'OFF_SHELF')]))
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedUpdateStatus.mockRejectedValue(
      new ApiError(40903, '房源「阳光公寓」无法上架：请先填写房源锁设备号、楼栋门禁设备号')
    )
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    const actions = wrapper.findAll('.admin-card-actions .van-button')
    const publishButton = actions.find((b) => b.text() === '上架')
    await publishButton!.trigger('click')
    await flushPromises()

    expect(mockedUpdateStatus).toHaveBeenCalledWith(1, 'AVAILABLE')
    expect(showDialog).toHaveBeenCalledWith({
      message: '房源「阳光公寓」无法上架：请先填写房源锁设备号、楼栋门禁设备号'
    })
    expect(showToast).not.toHaveBeenCalled()
  })

  it('single publish other error still shows toast', async () => {
    mockedList.mockResolvedValue(pageResult([propertyOf(1, '阳光公寓', 'OFF_SHELF')]))
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedUpdateStatus.mockRejectedValue(new ApiError(404, '房源不存在'))
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    const actions = wrapper.findAll('.admin-card-actions .van-button')
    const publishButton = actions.find((b) => b.text() === '上架')
    await publishButton!.trigger('click')
    await flushPromises()

    expect(showToast).toHaveBeenCalledWith('房源不存在')
    expect(showDialog).not.toHaveBeenCalled()
  })

  it('batch publish blocked by device check shows blocking dialog with summary', async () => {
    mockedList.mockResolvedValue(pageResult([
      propertyOf(1, '阳光公寓', 'OFF_SHELF'),
      propertyOf(2, '幸福里', 'OFF_SHELF')
    ]))
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedBatch.mockRejectedValue(
      new ApiError(40903, '以下房源设备未配置，无法上架：「阳光公寓」缺房源锁设备号；「幸福里」缺楼栋门禁设备号')
    )
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()

    const checkboxes = wrapper.findAllComponents({ name: 'VanCheckbox' })
    await checkboxes[1].vm.$emit('update:model-value', true)
    await checkboxes[2].vm.$emit('update:model-value', true)
    await flushPromises()
    await wrapper.find('.batch-bar .van-button').trigger('click')
    await flushPromises()

    expect(mockedBatch).toHaveBeenCalledWith([1, 2], 'AVAILABLE')
    expect(showDialog).toHaveBeenCalledWith({
      message: '以下房源设备未配置，无法上架：「阳光公寓」缺房源锁设备号；「幸福里」缺楼栋门禁设备号'
    })
    expect(showToast).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('批量上架(2)')
  })

  it('loads next page and appends properties', async () => {
    mockedList
      .mockResolvedValueOnce(pageResult([propertyOf(1, '阳光公寓')], true))
      .mockResolvedValueOnce(pageResult([propertyOf(2, '幸福里')]))
    const { wrapper } = await mountAt(AdminPropertyList, '/admin/properties')
    await flushPromises()
    expect(wrapper.text()).toContain('阳光公寓')
    expect(wrapper.text()).toContain('幸福里')
    expect(mockedList).toHaveBeenCalledTimes(2)
    expect(mockedList).toHaveBeenNthCalledWith(1, {}, 1)
    expect(mockedList).toHaveBeenNthCalledWith(2, {}, 2)
  })
})
