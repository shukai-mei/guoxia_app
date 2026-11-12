import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import PropertyDetail from '../tenant/PropertyDetail.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  getProperty: vi.fn(),
  getSlots: vi.fn(),
  submitAppointment: vi.fn()
}))

import { showSuccessToast, showToast } from 'vant'
import { getProperty, getSlots, submitAppointment } from '../../api'
import { ApiError } from '../../api/http'
import type { BuildingInfo, Property } from '../../api/types'

const mockedGetProperty = vi.mocked(getProperty)
const mockedGetSlots = vi.mocked(getSlots)
const mockedSubmitAppointment = vi.mocked(submitAppointment)

function propertyWithBuilding(building: BuildingInfo | null): Property {
  return {
    id: 5,
    title: '阳光公寓',
    location: '幸福路 1 号',
    layout: '两室一厅',
    area: 60,
    rent: 3000,
    description: null,
    contact: '13800138000',
    buildingId: 3,
    building,
    status: 'AVAILABLE',
    media: []
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetSlots.mockResolvedValue({ propertyId: 5, buildingId: 3, buildingName: 'A栋', supported: true, slots: [] })
})

describe('PropertyDetail', () => {
  it('renders building info and address reference images', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({
        id: 3,
        name: 'A栋',
        address: '幸福路 1 号',
        hasElevator: true,
        totalFloors: 12,
        elevatorRatio: '两梯四户',
        deliveryFacilities: '楼下有驿站',
        livingExperience: '采光好',
        media: [{ key: '2026/map.jpg', url: 'https://signed/map.jpg', sortOrder: 0 }]
      })
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(wrapper.text()).toContain('A栋')
    expect(wrapper.text()).toContain('幸福路 1 号')
    expect(wrapper.text()).toContain('两梯四户')
    const image = wrapper.find('img[src="https://signed/map.jpg"]')
    expect(image.exists()).toBe(true)
  })

  it('shows unsupported tip when property has no building and skips slot loading', async () => {
    mockedGetProperty.mockResolvedValue(propertyWithBuilding(null))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(wrapper.text()).toContain('该房源暂不支持预约看房')
    expect(mockedGetSlots).not.toHaveBeenCalled()
  })

  it('renders slot chips with occupied slots disabled', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    mockedGetSlots.mockResolvedValue({
      propertyId: 5,
      buildingId: 3,
      buildingName: 'A栋',
      supported: true,
      slots: [
        { start: '10:00', end: '12:00', available: true },
        { start: '12:00', end: '14:00', available: false }
      ]
    })
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    const chips = wrapper.findAll('.slot-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0].classes()).not.toContain('slot-chip-disabled')
    expect(chips[1].classes()).toContain('slot-chip-disabled')
    await chips[1].trigger('click')
    expect(chips[1].classes()).not.toContain('slot-chip-selected')
    await chips[0].trigger('click')
    expect(chips[0].classes()).toContain('slot-chip-selected')
  })

  it('submits new slot fields and redirects to booking success page', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    mockedGetSlots.mockResolvedValue({
      propertyId: 5,
      buildingId: 3,
      buildingName: 'A栋',
      supported: true,
      slots: [{ start: '10:00', end: '12:00', available: true }]
    })
    mockedSubmitAppointment.mockResolvedValue({
      id: 9,
      propertyId: 5,
      propertyTitle: '阳光公寓',
      tenantName: '张三',
      phone: '13800138000',
      slotStart: '2026-11-15T10:00:00',
      slotEnd: '2026-11-15T12:00:00',
      confirmChannel: null,
      bookingSmsStatus: 'SENT',
      passwordSmsStatus: null,
      passwordSet: false,
      status: 'PENDING',
      rejectReason: null,
      createdAt: '2026-11-11T10:00:00'
    })
    const { wrapper, replaceSpy } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('.slot-chip').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockedSubmitAppointment).toHaveBeenCalledWith('5', {
      name: '张三',
      phone: '13800138000',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      slotStart: '10:00',
      slotEnd: '12:00'
    })
    expect(showSuccessToast).toHaveBeenCalled()
    expect(replaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/booking-success/9' })
    )
  })

  it('shows conflict message and refreshes slots on 409', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    mockedGetSlots.mockResolvedValue({
      propertyId: 5,
      buildingId: 3,
      buildingName: 'A栋',
      supported: true,
      slots: [{ start: '10:00', end: '12:00', available: true }]
    })
    mockedSubmitAppointment.mockRejectedValue(new ApiError(409, '该时段已被预约'))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(mockedGetSlots).toHaveBeenCalledTimes(1)
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('.slot-chip').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('该时段已被预约')
    expect(mockedGetSlots).toHaveBeenCalledTimes(2)
  })
})
