import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import BuildingList from '../admin/BuildingList.vue'

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
  adminListBuildings: vi.fn(),
  adminDeleteBuilding: vi.fn()
}))

import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { adminDeleteBuilding, adminListBuildings } from '../../api'
import { ApiError } from '../../api/http'

const mockedList = vi.mocked(adminListBuildings)
const mockedDelete = vi.mocked(adminDeleteBuilding)

const BUILDINGS = [
  {
    id: 3,
    name: 'A栋',
    address: '幸福路 1 号',
    hasElevator: true,
    totalFloors: 12,
    elevatorRatio: null,
    deliveryFacilities: null,
    livingExperience: null,
    slotStartTime: '06:00',
    slotEndTime: '14:00',
    slotDurationMinutes: 120,
    media: []
  }
]

beforeEach(() => {
  vi.clearAllMocks()
  mockedList.mockResolvedValue(BUILDINGS)
})

describe('BuildingList', () => {
  it('renders building list with slot summary', async () => {
    const { wrapper } = await mountAt(BuildingList, '/admin/buildings')
    await flushPromises()
    expect(wrapper.text()).toContain('A栋')
    expect(wrapper.text()).toContain('幸福路 1 号')
    expect(wrapper.text()).toContain('每日 06:00~14:00，每 120 分钟')
  })

  it('deletes after confirmation and reloads', async () => {
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedDelete.mockResolvedValue(undefined)
    const { wrapper } = await mountAt(BuildingList, '/admin/buildings')
    await flushPromises()
    await wrapper.find('.admin-card-actions button:nth-child(2)').trigger('click')
    await flushPromises()
    expect(mockedDelete).toHaveBeenCalledWith(3)
    expect(showSuccessToast).toHaveBeenCalledWith('删除成功')
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('shows conflict message when deletion rejected by backend', async () => {
    vi.mocked(showConfirmDialog).mockResolvedValue(undefined)
    mockedDelete.mockRejectedValue(new ApiError(409, '该楼栋下存在房源'))
    const { wrapper } = await mountAt(BuildingList, '/admin/buildings')
    await flushPromises()
    await wrapper.find('.admin-card-actions button:nth-child(2)').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('该楼栋下存在房源')
  })

  it('does not delete when confirmation is cancelled', async () => {
    vi.mocked(showConfirmDialog).mockRejectedValue('cancel')
    const { wrapper } = await mountAt(BuildingList, '/admin/buildings')
    await flushPromises()
    await wrapper.find('.admin-card-actions button:nth-child(2)').trigger('click')
    await flushPromises()
    expect(mockedDelete).not.toHaveBeenCalled()
  })
})
