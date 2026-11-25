import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountAt } from './helpers'
import PropertyDetail from '../tenant/PropertyDetail.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn(),
    showDialog: vi.fn()
  }
})

vi.mock('../../api', () => ({
  getProperty: vi.fn(),
  getSlots: vi.fn(),
  submitAppointment: vi.fn(),
  sendVerificationCode: vi.fn()
}))

import { showDialog, showSuccessToast, showToast } from 'vant'
import { getProperty, getSlots, sendVerificationCode, submitAppointment } from '../../api'
import { ApiError } from '../../api/http'
import type { BuildingInfo, Property, RentStatus } from '../../api/types'

const mockedGetProperty = vi.mocked(getProperty)
const mockedGetSlots = vi.mocked(getSlots)
const mockedSubmitAppointment = vi.mocked(submitAppointment)
const mockedSendVerificationCode = vi.mocked(sendVerificationCode)

const DEFAULT_BUILDING: BuildingInfo = {
  id: 3,
  name: 'A栋',
  address: '幸福路 1 号',
  hasElevator: null,
  totalFloors: null,
  elevatorRatio: null,
  deliveryFacilities: null,
  livingExperience: null,
  housekeeper: null,
  media: []
}

function propertyWithBuilding(
  building: Partial<BuildingInfo> | null,
  rentStatus: RentStatus = 'PENDING_RENT'
): Property {
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
    building: building === null ? null : { ...DEFAULT_BUILDING, ...building },
    status: 'AVAILABLE',
    rentStatus,
    media: []
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockedGetSlots.mockResolvedValue({ propertyId: 5, buildingId: 3, buildingName: 'A栋', supported: true, slots: [] })
})

async function agreeToTerms(wrapper: VueWrapper) {
  await wrapper.find('.agreement-row .van-checkbox').trigger('click')
}

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

  it('shows housekeeper service card with real qr image', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({
        id: 3,
        name: 'A栋',
        address: '幸福路 1 号',
        hasElevator: null,
        totalFloors: null,
        elevatorRatio: null,
        deliveryFacilities: null,
        livingExperience: null,
        media: [],
        housekeeper: {
          id: 7,
          name: '王管家',
          contact: 'guoxia',
          qrObjectKey: '2026/qr.png',
          qrUrl: 'https://signed/qr.png'
        }
      })
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(wrapper.text()).toContain('管家服务')
    expect(wrapper.text()).toContain('王管家')
    expect(wrapper.text()).toContain('在线')
    expect(wrapper.text()).toContain('微信号：guoxia')
    expect(wrapper.text()).toContain('扫码添加管家微信，咨询房源、看房及签约事宜')
    expect(wrapper.find('.qr-wrap').exists()).toBe(true)
    expect(wrapper.find('img[src="https://signed/qr.png"]').exists()).toBe(true)
    expect(wrapper.find('.qr-box').exists()).toBe(false)
  })

  it('shows decorative qr placeholder when housekeeper has no qr url', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({
        id: 3,
        name: 'A栋',
        address: '幸福路 1 号',
        hasElevator: null,
        totalFloors: null,
        elevatorRatio: null,
        deliveryFacilities: null,
        livingExperience: null,
        media: [],
        housekeeper: { id: 7, name: '王管家', contact: 'guoxia', qrObjectKey: null, qrUrl: null }
      })
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(wrapper.text()).toContain('管家服务')
    expect(wrapper.find('.qr-box').exists()).toBe(true)
    expect(wrapper.find('.qr-center').exists()).toBe(true)
    expect(wrapper.find('.qr-real').exists()).toBe(false)
  })

  it('hides housekeeper card when building has no housekeeper', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({
        id: 3,
        name: 'A栋',
        address: '幸福路 1 号',
        hasElevator: null,
        totalFloors: null,
        elevatorRatio: null,
        deliveryFacilities: null,
        livingExperience: null,
        media: [],
        housekeeper: null
      })
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(wrapper.text()).not.toContain('管家服务')
    expect(wrapper.find('.qr-wrap').exists()).toBe(false)
  })

  it('shows unsupported tip when property has no building and skips slot loading', async () => {
    mockedGetProperty.mockResolvedValue(propertyWithBuilding(null))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(wrapper.text()).toContain('该房源暂不支持预约看房')
    expect(mockedGetSlots).not.toHaveBeenCalled()
  })

  it('hides booking section and skips slot loading when reached from appointment records', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({
        id: 3,
        name: 'A栋',
        address: '幸福路 1 号',
        hasElevator: true,
        totalFloors: 12,
        elevatorRatio: null,
        deliveryFacilities: null,
        livingExperience: null,
        media: []
      })
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5?from=appointment')
    await flushPromises()
    expect(wrapper.text()).toContain('A栋')
    expect(wrapper.text()).not.toContain('预约看房')
    expect(wrapper.find('form').exists()).toBe(false)
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
      cancelReason: null,
      cancelSmsStatus: null,
      cancelSmsSentAt: null,
      createdAt: '2026-11-11T10:00:00'
    })
    const { wrapper, replaceSpy } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('123456')
    await wrapper.find('.slot-chip').trigger('click')
    await agreeToTerms(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockedSubmitAppointment).toHaveBeenCalledWith('5', {
      name: '张三',
      phone: '13800138000',
      code: '123456',
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
    await wrapper.find('input[name="code"]').setValue('123456')
    await wrapper.find('.slot-chip').trigger('click')
    await agreeToTerms(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('该时段已被预约')
    expect(mockedGetSlots).toHaveBeenCalledTimes(2)
  })

  it('shows same-property rejection message from backend', async () => {
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
    mockedSubmitAppointment.mockRejectedValue(new ApiError(409, '该房源已有未结束的预约'))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('123456')
    await wrapper.find('.slot-chip').trigger('click')
    await agreeToTerms(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('该房源已有未结束的预约')
  })

  it('shows five-property limit rejection message from backend', async () => {
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
    mockedSubmitAppointment.mockRejectedValue(new ApiError(409, '最多可同时预约 5 个房源'))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('123456')
    await wrapper.find('.slot-chip').trigger('click')
    await agreeToTerms(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('最多可同时预约 5 个房源')
  })

  it('does not send code for invalid phone', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="phone"]').setValue('123')
    await agreeToTerms(wrapper)
    await wrapper.find('.send-code-btn').trigger('click')
    await flushPromises()
    expect(mockedSendVerificationCode).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('请输入有效的手机号')
  })

  it('starts 60s countdown on successful code send and restores after it ends', async () => {
    vi.useFakeTimers()
    try {
      mockedGetProperty.mockResolvedValue(
        propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
      )
      mockedSendVerificationCode.mockResolvedValue(undefined)
      const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
      await flushPromises()
      await wrapper.find('input[name="phone"]').setValue('13800138000')
      await flushPromises()
      await agreeToTerms(wrapper)
    await wrapper.find('.send-code-btn').trigger('click')
      await flushPromises()
      expect(mockedSendVerificationCode).toHaveBeenCalledWith('13800138000')
      expect(showToast).toHaveBeenCalledWith('验证码已发送')
      const button = wrapper.find('.send-code-btn')
      expect(button.text()).toContain('重新获取(60s)')
      expect(button.attributes('disabled')).toBeDefined()

      await vi.advanceTimersByTimeAsync(60_000)
      await flushPromises()
      expect(wrapper.find('.send-code-btn').text()).toContain('获取验证码')
      expect(wrapper.find('.send-code-btn').attributes('disabled')).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps countdown idle when code send fails', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    mockedSendVerificationCode.mockRejectedValue(new ApiError(500, '短信发送失败，请稍后重试'))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await flushPromises()
    await agreeToTerms(wrapper)
    await wrapper.find('.send-code-btn').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('短信发送失败，请稍后重试')
    const button = wrapper.find('.send-code-btn')
    expect(button.text()).toContain('获取验证码')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('blocks submit when code is not 6 digits', async () => {
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
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('12345')
    await wrapper.find('.slot-chip').trigger('click')
    await agreeToTerms(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('请输入 6 位验证码')
    expect(mockedSubmitAppointment).not.toHaveBeenCalled()
  })

  it('shows 400 code error, keeps form values and does not refresh slots', async () => {
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
    mockedSubmitAppointment.mockRejectedValue(new ApiError(400, '验证码错误或已过期'))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(mockedGetSlots).toHaveBeenCalledTimes(1)
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('654321')
    await wrapper.find('.slot-chip').trigger('click')
    await agreeToTerms(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('验证码错误或已过期')
    expect(mockedGetSlots).toHaveBeenCalledTimes(1)
    expect((wrapper.find('input[name="name"]').element as HTMLInputElement).value).toBe('张三')
    expect((wrapper.find('input[name="code"]').element as HTMLInputElement).value).toBe('654321')
  })

  it('clears code when phone changes', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('123456')
    expect((wrapper.find('input[name="code"]').element as HTMLInputElement).value).toBe('123456')
    await wrapper.find('input[name="phone"]').setValue('13800138001')
    expect((wrapper.find('input[name="code"]').element as HTMLInputElement).value).toBe('')
  })

  it('blocks sending code until agreement is checked', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('.send-code-btn').trigger('click')
    await flushPromises()
    expect(mockedSendVerificationCode).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('请先阅读并同意《用户服务协议》和《隐私政策》')
  })

  it('blocks submit until agreement is checked', async () => {
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
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('123456')
    await wrapper.find('.slot-chip').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockedSubmitAppointment).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('请先阅读并同意《用户服务协议》和《隐私政策》')
  })

  it('opens agreement pages from the checkbox links', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    const { wrapper, router } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    const pushSpy = vi.spyOn(router, 'push')
    const links = wrapper.findAll('.agreement-link')
    await links[0].trigger('click')
    await links[1].trigger('click')
    expect(pushSpy).toHaveBeenCalledWith('/agreement/service')
    expect(pushSpy).toHaveBeenCalledWith('/agreement/privacy')
    expect(wrapper.find('.agreement-row .van-checkbox__icon').classes()).not.toContain(
      'van-checkbox__icon--checked'
    )
  })

  it('remembers agreement consent on later visits', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding({ id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] })
    )
    const first = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await agreeToTerms(first.wrapper)
    first.wrapper.unmount()
    const second = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(second.wrapper.find('.agreement-row .van-checkbox__icon').classes()).toContain(
      'van-checkbox__icon--checked'
    )
  })

  it('shows rented notice, hides booking form and skips slot loading', async () => {
    mockedGetProperty.mockResolvedValue(
      propertyWithBuilding(
        { id: 3, name: 'A栋', address: 'x', hasElevator: null, totalFloors: null, elevatorRatio: null, deliveryFacilities: null, livingExperience: null, media: [] },
        'RENTED'
      )
    )
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    expect(wrapper.find('.status-tag--rented').text()).toBe('已租出')
    expect(wrapper.text()).toContain('该房源已租出')
    expect(wrapper.text()).toContain('暂不支持预约，可查看其他待租房源')
    expect(wrapper.text()).toContain('提交预约（已禁用）')
    expect(wrapper.text()).not.toContain('预约看房')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('A栋')
    expect(mockedGetSlots).not.toHaveBeenCalled()
  })

  it('shows dialog when submit rejected because property rented', async () => {
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
    mockedSubmitAppointment.mockRejectedValue(new ApiError(40901, '房源已租出，暂不支持预约看房'))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('123456')
    await wrapper.find('.slot-chip').trigger('click')
    await agreeToTerms(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showDialog).toHaveBeenCalledWith({ message: '房源已租出，暂不支持预约看房' })
    expect(showToast).not.toHaveBeenCalled()
  })

  it('shows dialog when submit rejected because property off shelf', async () => {
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
    mockedSubmitAppointment.mockRejectedValue(new ApiError(40902, '房源已下架，无法预约看房'))
    const { wrapper } = await mountAt(PropertyDetail, '/properties/5')
    await flushPromises()
    await wrapper.find('input[name="name"]').setValue('张三')
    await wrapper.find('input[name="phone"]').setValue('13800138000')
    await wrapper.find('input[name="code"]').setValue('123456')
    await wrapper.find('.slot-chip').trigger('click')
    await agreeToTerms(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showDialog).toHaveBeenCalledWith({ message: '房源已下架，无法预约看房' })
    expect(showToast).not.toHaveBeenCalled()
  })
})
