import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import HousekeeperAdmin from '../admin/HousekeeperAdmin.vue'

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
  listHousekeepers: vi.fn(),
  createHousekeeper: vi.fn(),
  updateHousekeeper: vi.fn(),
  deleteHousekeeper: vi.fn()
}))

import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import {
  createHousekeeper,
  deleteHousekeeper,
  listHousekeepers,
  updateHousekeeper
} from '../../api'
import { ApiError } from '../../api/http'

const mockedList = vi.mocked(listHousekeepers)
const mockedCreate = vi.mocked(createHousekeeper)
const mockedUpdate = vi.mocked(updateHousekeeper)
const mockedDelete = vi.mocked(deleteHousekeeper)

const HOUSEKEEPERS = [
  {
    id: 1,
    name: '王管家',
    contact: 'wx_wang',
    qrObjectKey: '2026/qr.png',
    qrUrl: 'https://signed/qr.png'
  },
  { id: 2, name: '李管家', contact: 'wx_li', qrObjectKey: null, qrUrl: null }
]

beforeEach(() => {
  vi.clearAllMocks()
  mockedList.mockResolvedValue(HOUSEKEEPERS)
})

describe('HousekeeperAdmin', () => {
  it('renders housekeeper list with name, contact and qr thumbnail', async () => {
    const { wrapper } = await mountAt(HousekeeperAdmin, '/admin/housekeepers')
    await flushPromises()
    expect(wrapper.text()).toContain('王管家')
    expect(wrapper.text()).toContain('微信号：wx_wang')
    expect(wrapper.find('img[src="https://signed/qr.png"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('李管家')
    expect(wrapper.text()).toContain('微信号：wx_li')
  })

  it('creates housekeeper from form and reloads list', async () => {
    mockedCreate.mockResolvedValue({
      id: 3,
      name: '赵管家',
      contact: 'wx_zhao',
      qrObjectKey: null,
      qrUrl: null
    } as never)
    const { wrapper } = await mountAt(HousekeeperAdmin, '/admin/housekeepers')
    await flushPromises()
    await wrapper.find('.van-nav-bar__right').trigger('click')
    await flushPromises()
    await wrapper.find('input[placeholder="请输入管家名称"]').setValue('赵管家')
    await wrapper.find('input[placeholder="请输入管家微信号"]').setValue('wx_zhao')
    await wrapper.findAll('.form-actions button')[1].trigger('click')
    await flushPromises()
    expect(mockedCreate).toHaveBeenCalledWith({ name: '赵管家', contact: 'wx_zhao' })
    expect(showSuccessToast).toHaveBeenCalledWith('保存成功')
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('blocks submit when name or contact is empty', async () => {
    const { wrapper } = await mountAt(HousekeeperAdmin, '/admin/housekeepers')
    await flushPromises()
    await wrapper.find('.van-nav-bar__right').trigger('click')
    await flushPromises()
    await wrapper.findAll('.form-actions button')[1].trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('请填写管家名称')
    expect(mockedCreate).not.toHaveBeenCalled()
    await wrapper.find('input[placeholder="请输入管家名称"]').setValue('赵管家')
    await wrapper.findAll('.form-actions button')[1].trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('请填写管家微信号')
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('echoes existing housekeeper in edit form and saves update', async () => {
    mockedUpdate.mockResolvedValue({
      id: 1,
      name: '王管家改',
      contact: 'wx_wang',
      qrObjectKey: '2026/qr.png',
      qrUrl: 'https://signed/qr.png'
    } as never)
    const { wrapper } = await mountAt(HousekeeperAdmin, '/admin/housekeepers')
    await flushPromises()
    await wrapper.findAll('.admin-card-actions button')[0].trigger('click')
    await flushPromises()
    expect(
      (wrapper.find('input[placeholder="请输入管家名称"]').element as HTMLInputElement).value
    ).toBe('王管家')
    expect(
      (wrapper.find('input[placeholder="请输入管家微信号"]').element as HTMLInputElement).value
    ).toBe('wx_wang')
    expect(wrapper.find('img[src="https://signed/qr.png"]').exists()).toBe(true)
    await wrapper.find('input[placeholder="请输入管家名称"]').setValue('王管家改')
    await wrapper.findAll('.form-actions button')[1].trigger('click')
    await flushPromises()
    expect(mockedUpdate).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: '王管家改', contact: 'wx_wang', qrObjectKey: '2026/qr.png' })
    )
    expect(showSuccessToast).toHaveBeenCalledWith('保存成功')
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('deletes housekeeper after confirmation and reloads', async () => {
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedDelete.mockResolvedValue(undefined)
    const { wrapper } = await mountAt(HousekeeperAdmin, '/admin/housekeepers')
    await flushPromises()
    await wrapper.findAll('.admin-card-actions button')[1].trigger('click')
    await flushPromises()
    expect(mockedDelete).toHaveBeenCalledWith(1)
    expect(showSuccessToast).toHaveBeenCalledWith('删除成功')
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('shows backend refusal when deleting linked housekeeper', async () => {
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedDelete.mockRejectedValue(new ApiError(400, '该管家已关联楼栋，需先解除楼栋关联'))
    const { wrapper } = await mountAt(HousekeeperAdmin, '/admin/housekeepers')
    await flushPromises()
    await wrapper.findAll('.admin-card-actions button')[1].trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('该管家已关联楼栋，需先解除楼栋关联')
    expect(mockedList).toHaveBeenCalledTimes(1)
  })

  it('does not delete when confirmation is cancelled', async () => {
    vi.mocked(showConfirmDialog).mockRejectedValue('cancel')
    const { wrapper } = await mountAt(HousekeeperAdmin, '/admin/housekeepers')
    await flushPromises()
    await wrapper.findAll('.admin-card-actions button')[1].trigger('click')
    await flushPromises()
    expect(mockedDelete).not.toHaveBeenCalled()
  })
})
