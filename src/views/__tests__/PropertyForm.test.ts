import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import PropertyForm from '../admin/PropertyForm.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  adminListBuildings: vi.fn(),
  getProperty: vi.fn(),
  createProperty: vi.fn(),
  updateProperty: vi.fn()
}))

import { adminListBuildings, createProperty, getProperty, updateProperty } from '../../api'

const mockedListBuildings = vi.mocked(adminListBuildings)
const mockedGetProperty = vi.mocked(getProperty)
const mockedCreate = vi.mocked(createProperty)
const mockedUpdate = vi.mocked(updateProperty)

const BUILDINGS = [
  { id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, slotStartTime: '06:00', slotEndTime: '14:00', slotDurationMinutes: 120, media: [] },
  { id: 4, name: 'B栋', address: 'y', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, slotStartTime: '06:00', slotEndTime: '14:00', slotDurationMinutes: 120, media: [] }
]

async function fillBaseForm(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) {
  await wrapper.find('input[placeholder="请输入房源标题"]').setValue('阳光公寓')
  await wrapper.find('input[placeholder="请输入位置"]').setValue('幸福路 1 号')
  await wrapper.find('input[placeholder="如：两室一厅"]').setValue('两室一厅')
  await wrapper.find('input[placeholder="请输入面积"]').setValue('60')
  await wrapper.find('input[placeholder="请输入月租金"]').setValue('3000')
  await wrapper.find('input[placeholder="请输入联系方式"]').setValue('13800138000')
}

function vmOf(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) {
  return wrapper.vm as unknown as {
    onBuildingConfirm: (payload: { selectedValues: Array<string | number> }) => void
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedListBuildings.mockResolvedValue(BUILDINGS)
})

describe('PropertyForm', () => {
  it('requires building selection before submit', async () => {
    const { wrapper } = await mountAt(PropertyForm, '/admin/properties/new')
    await flushPromises()
    await fillBaseForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.van-field__error-message').text()).toBe('请选择所属楼栋')
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('submits payload with buildingId and only surrounding/video media groups', async () => {
    mockedCreate.mockResolvedValue({ id: 1 } as never)
    const { wrapper, replaceSpy } = await mountAt(PropertyForm, '/admin/properties/new')
    await flushPromises()
    await fillBaseForm(wrapper)
    vmOf(wrapper).onBuildingConfirm({ selectedValues: [BUILDINGS[0].id] })
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '阳光公寓',
        buildingId: 3,
        media: []
      })
    )
    expect(replaceSpy).toHaveBeenCalledWith('/admin/properties')
    expect(wrapper.text()).not.toContain('找房指引图')
  })

  it('echoes building and media in edit mode', async () => {
    mockedGetProperty.mockResolvedValue({
      id: 5,
      title: '阳光公寓',
      location: '幸福路 1 号',
      layout: '两室一厅',
      area: 60,
      rent: 3000,
      description: null,
      contact: '13800138000',
      buildingId: 4,
      building: null,
      status: 'AVAILABLE',
      media: [
        { type: 'SURROUNDING', key: 's.jpg', url: 'https://signed/s.jpg', sortOrder: 0 },
        { type: 'VIDEO', key: 'v.mp4', url: 'https://signed/v.mp4', sortOrder: 0 }
      ]
    })
    const { wrapper } = await mountAt(PropertyForm, '/admin/properties/5/edit')
    await flushPromises()
    expect((wrapper.find('.van-field__control[readonly]').element as HTMLInputElement).value).toBe('B栋')
    expect(wrapper.find('img[src="https://signed/s.jpg"]').exists()).toBe(true)
    expect(wrapper.find('video[src="https://signed/v.mp4"]').exists()).toBe(true)
    expect(mockedGetProperty).toHaveBeenCalledWith('5')
  })

  it('keeps buildingId in update payload', async () => {
    mockedGetProperty.mockResolvedValue({
      id: 5,
      title: '阳光公寓',
      location: '幸福路 1 号',
      layout: '两室一厅',
      area: 60,
      rent: 3000,
      description: null,
      contact: '13800138000',
      buildingId: 4,
      building: null,
      status: 'AVAILABLE',
      media: []
    })
    mockedUpdate.mockResolvedValue({ id: 5 } as never)
    const { wrapper } = await mountAt(PropertyForm, '/admin/properties/5/edit')
    await flushPromises()
    await wrapper.find('input[placeholder="请输入房源标题"]').setValue('阳光公寓改')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockedUpdate).toHaveBeenCalledWith(
      '5',
      expect.objectContaining({ title: '阳光公寓改', buildingId: 4 })
    )
  })
})
