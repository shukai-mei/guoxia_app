import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import MyAppointments from '../tenant/MyAppointments.vue'
import type { MyAppointment } from '../../api/types'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  getMyAppointments: vi.fn(),
  openDoor: vi.fn()
}))

import { showSuccessToast, showToast } from 'vant'
import { getMyAppointments, openDoor } from '../../api'
import { formatDateTime } from '../../utils/format'

const mockedList = vi.mocked(getMyAppointments)
const mockedOpenDoor = vi.mocked(openDoor)

const CONFIRMED: MyAppointment = {
  id: 11,
  propertyId: 5,
  propertyTitle: '阳光公寓',
  tenantName: '张三',
  phone: '13800000001',
  slotStart: '2026-11-15T10:00:00',
  slotEnd: '2026-11-15T12:00:00',
  status: 'CONFIRMED',
  rejectReason: null,
  passcode: '5678',
  canOpenDoor: true,
  doorSupported: false,
  lockSupported: false,
  buildingName: '阳光大厦',
  buildingAddress: '测试路 1 号',
  propertyLocation: '测试路 1 号 3 单元 502',
  propertyLayout: '两室一厅',
  createdAt: '2026-11-14T09:00:00'
}

const PENDING: MyAppointment = {
  id: 12,
  propertyId: 5,
  propertyTitle: '阳光公寓',
  tenantName: '张三',
  phone: '13800000001',
  slotStart: new Date(Date.now() + 2 * 86400000).toISOString(),
  slotEnd: new Date(Date.now() + 2 * 86400000 + 7200000).toISOString(),
  status: 'PENDING',
  rejectReason: null,
  passcode: null,
  canOpenDoor: false,
  doorSupported: false,
  lockSupported: false,
  buildingName: '阳光大厦',
  buildingAddress: '测试路 1 号',
  propertyLocation: '测试路 1 号 3 单元 502',
  propertyLayout: '两室一厅',
  createdAt: '2026-11-15T10:00:00'
}

const REJECTED: MyAppointment = {
  id: 13,
  propertyId: 6,
  propertyTitle: '幸福里',
  tenantName: '张三',
  phone: '13800000001',
  slotStart: new Date(Date.now() + 2 * 86400000).toISOString(),
  slotEnd: new Date(Date.now() + 2 * 86400000 + 7200000).toISOString(),
  status: 'REJECTED',
  rejectReason: '时间不合适',
  passcode: null,
  canOpenDoor: false,
  doorSupported: false,
  lockSupported: false,
  buildingName: '幸福大厦',
  buildingAddress: '测试路 2 号',
  propertyLocation: '测试路 2 号 1 单元 101',
  propertyLayout: '一室一厅',
  createdAt: '2026-11-13T10:00:00'
}

function futureConfirmed(doorSupported: boolean, lockSupported: boolean): MyAppointment {
  const start = new Date(Date.now() + 3600000)
  const end = new Date(start.getTime() + 7200000)
  return {
    ...CONFIRMED,
    id: 21,
    slotStart: start.toISOString(),
    slotEnd: end.toISOString(),
    passcode: null,
    canOpenDoor: false,
    doorSupported,
    lockSupported
  }
}

function inWindowConfirmed(overrides: Partial<MyAppointment> = {}): MyAppointment {
  const start = new Date(Date.now() - 3600000)
  const end = new Date(Date.now() + 3600000)
  return {
    ...CONFIRMED,
    id: 11,
    slotStart: start.toISOString(),
    slotEnd: end.toISOString(),
    passcode: '5678',
    canOpenDoor: true,
    ...overrides
  }
}

function endedAppointment(
  status: MyAppointment['status'],
  overrides: Partial<MyAppointment> = {}
): MyAppointment {
  const end = new Date(Date.now() - 3600000)
  const start = new Date(end.getTime() - 7200000)
  return {
    ...CONFIRMED,
    id: 23,
    status,
    slotStart: start.toISOString(),
    slotEnd: end.toISOString(),
    passcode: null,
    canOpenDoor: false,
    doorSupported: true,
    lockSupported: true,
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true
  })
})

describe('MyAppointments', () => {
  it('renders appointment list with status mapping and time range', async () => {
    const confirmed = inWindowConfirmed()
    mockedList.mockResolvedValue([confirmed, PENDING, REJECTED])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('阳光公寓')
    expect(text).toContain(
      `看房时间：${formatDateTime(confirmed.slotStart)}~${formatDateTime(confirmed.slotEnd)!.slice(11)}`
    )
    expect(text).not.toContain('已确认')
    expect(text).toContain('进行中')
    expect(text).toContain('待处理')
    expect(text).toContain('已拒绝')
    expect(text).not.toContain('已过期')
    expect(text).toContain('拒绝原因：时间不合适')
    expect(wrapper.findAll('.appointment-card').length).toBe(3)
    expect(wrapper.findAll('.status-tag').length).toBe(2)
  })

  it('shows empty state when no appointments', async () => {
    mockedList.mockResolvedValue([])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无预约记录')
  })

  it('shows error with retry and recovers after retry', async () => {
    mockedList.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('网络异常，请稍后重试')
    mockedList.mockResolvedValueOnce([PENDING])
    await wrapper.find('.van-empty button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('待处理')
  })

  it('pull refresh reloads list', async () => {
    mockedList.mockResolvedValueOnce([PENDING])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.appointment-card').length).toBe(1)
    mockedList.mockResolvedValueOnce([PENDING, CONFIRMED])
    await (
      wrapper.vm as unknown as { onRefresh: () => Promise<void> }
    ).onRefresh()
    await flushPromises()
    expect(wrapper.findAll('.appointment-card').length).toBe(2)
  })

  it('shows open door button only for canOpenDoor records', async () => {
    mockedList.mockResolvedValue([inWindowConfirmed(), PENDING])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.action-btn--primary').length).toBe(1)
  })

  it('opens door successfully with loading state during request', async () => {
    let resolveDoor: (value: void) => void = () => undefined
    mockedList.mockResolvedValue([inWindowConfirmed()])
    mockedOpenDoor.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDoor = resolve
        })
    )
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--primary').trigger('click')
    await flushPromises()
    expect(mockedOpenDoor).toHaveBeenCalledWith(11)
    expect(wrapper.find('.action-btn--primary.van-button--loading').exists()).toBe(true)
    expect(wrapper.find('.action-btn--primary.van-button--disabled').exists()).toBe(true)
    resolveDoor()
    await flushPromises()
    expect(showSuccessToast).toHaveBeenCalledWith('门禁已开启')
    expect(wrapper.find('.action-btn--primary.van-button--loading').exists()).toBe(false)
  })

  it('shows backend message on open door failure', async () => {
    mockedList.mockResolvedValue([inWindowConfirmed()])
    mockedOpenDoor.mockRejectedValue(new Error('未到开门时间'))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--primary').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('未到开门时间')
  })

  it('copies passcode via clipboard and shows success toast', async () => {
    mockedList.mockResolvedValue([inWindowConfirmed()])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('房门密码')
    expect(wrapper.text()).toContain('5678')
    await wrapper.find('.passcode-row button').trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('5678')
    expect(showSuccessToast).toHaveBeenCalledWith('房门密码已复制')
  })

  it('falls back to text selection when clipboard fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true
    })
    mockedList.mockResolvedValue([inWindowConfirmed()])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.passcode-row button').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('复制失败，请手动复制房门密码')
    const fallback = document.querySelector('textarea')
    expect(fallback).not.toBeNull()
    expect(fallback!.value).toBe('5678')
  })

  it('does not render passcode area when passcode absent', async () => {
    mockedList.mockResolvedValue([PENDING])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.passcode-row').exists()).toBe(false)
  })

  it('shows passcode pending hint and greyed open door before window', async () => {
    mockedList.mockResolvedValue([futureConfirmed(true, true)])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('房门密码：暂未下发')
    expect(wrapper.text()).toContain('密码将在预约时间段前5分钟下发')
    expect(wrapper.find('.passcode-row').exists()).toBe(false)
    expect(wrapper.find('.action-btn--primary').exists()).toBe(false)
    expect(wrapper.find('.action-btn--pending').exists()).toBe(true)
    expect(wrapper.find('.action-btn--pending').attributes('disabled')).toBeUndefined()
  })

  it('clicking greyed open door shows window toast and does not call api', async () => {
    mockedList.mockResolvedValue([futureConfirmed(true, false)])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--pending').trigger('click')
    expect(showToast).toHaveBeenCalledWith('预约时间段内才能操作门禁')
    expect(mockedOpenDoor).not.toHaveBeenCalled()
  })

  it('hides pending hint and greyed button without door or lock support', async () => {
    mockedList.mockResolvedValue([futureConfirmed(false, false)])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).not.toContain('房门密码：暂未下发')
    expect(wrapper.find('.action-btn--pending').exists()).toBe(false)
    expect(wrapper.find('.action-btn--primary').exists()).toBe(false)
    expect(wrapper.find('.action-btn--plain').exists()).toBe(true)
  })

  it('shows unconfirmed hint and greyed door button for pending status with support', async () => {
    const pendingWithSupport = { ...futureConfirmed(true, true), id: 22, status: 'PENDING' as const }
    mockedList.mockResolvedValue([pendingWithSupport])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('房门密码：暂未下发')
    expect(wrapper.text()).toContain('预约确认后，密码将在预约时间段前5分钟下发')
    expect(wrapper.find('.passcode-row').exists()).toBe(false)
    expect(wrapper.find('.action-btn--primary').exists()).toBe(false)
    expect(wrapper.find('.action-btn--pending').exists()).toBe(true)
  })

  it('clicking unconfirmed greyed door button shows confirm toast and does not call api', async () => {
    const pendingWithDoor = { ...futureConfirmed(true, false), id: 22, status: 'PENDING' as const }
    mockedList.mockResolvedValue([pendingWithDoor])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--pending').trigger('click')
    expect(showToast).toHaveBeenCalledWith('预约确认后可用')
    expect(mockedOpenDoor).not.toHaveBeenCalled()
  })

  it('does not show hint or greyed button for pending status without support', async () => {
    const pendingNoSupport = { ...futureConfirmed(false, false), id: 22, status: 'PENDING' as const }
    mockedList.mockResolvedValue([pendingNoSupport])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).not.toContain('房门密码：暂未下发')
    expect(wrapper.find('.action-btn--pending').exists()).toBe(false)
    expect(wrapper.find('.action-btn--plain').exists()).toBe(true)
  })

  it('does not show hint or greyed button for rejected status even with support', async () => {
    const rejectedWithSupport = { ...futureConfirmed(true, true), id: 22, status: 'REJECTED' as const, rejectReason: '时间不合适' }
    mockedList.mockResolvedValue([rejectedWithSupport])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).not.toContain('房门密码：暂未下发')
    expect(wrapper.find('.action-btn--pending').exists()).toBe(false)
  })

  it('greys out ended records and hides all operations', async () => {
    mockedList.mockResolvedValue([
      endedAppointment('CONFIRMED', { passcode: '2468', canOpenDoor: true }),
      endedAppointment('PENDING'),
      endedAppointment('REJECTED', { rejectReason: '时间不合适' })
    ])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    const cards = wrapper.findAll('.appointment-card')
    expect(cards.length).toBe(3)
    for (const card of cards) {
      expect(card.classes()).toContain('appointment-card--ended')
    }
    expect(wrapper.findAll('.ended-tag').length).toBe(3)
    expect(wrapper.text()).toContain('已过期')
    expect(wrapper.find('.card-actions').exists()).toBe(false)
    expect(wrapper.find('.passcode-row').exists()).toBe(false)
    expect(wrapper.find('.passcode-pending').exists()).toBe(false)
  })

  it('does not grey out upcoming or in-window records', async () => {
    mockedList.mockResolvedValue([inWindowConfirmed(), futureConfirmed(true, true)])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    for (const card of wrapper.findAll('.appointment-card')) {
      expect(card.classes()).not.toContain('appointment-card--ended')
    }
    expect(wrapper.find('.ended-tag').exists()).toBe(false)
  })

  it('clicking card expands and collapses address details', async () => {
    mockedList.mockResolvedValue([inWindowConfirmed()])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.card-detail').exists()).toBe(false)

    await wrapper.find('.appointment-card').trigger('click')
    const detail = wrapper.find('.card-detail')
    expect(detail.exists()).toBe(true)
    expect(detail.text()).toContain('阳光大厦')
    expect(detail.text()).toContain('测试路 1 号')
    expect(detail.text()).toContain('测试路 1 号 3 单元 502')
    expect(detail.text()).toContain('两室一厅')

    await wrapper.find('.appointment-card').trigger('click')
    expect(wrapper.find('.card-detail').exists()).toBe(false)
  })

  it('shows placeholder for missing address fields', async () => {
    mockedList.mockResolvedValue([
      inWindowConfirmed({
        buildingName: null,
        buildingAddress: null,
        propertyLocation: null,
        propertyLayout: null
      })
    ])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.appointment-card').trigger('click')
    expect(wrapper.find('.card-detail').text()).toContain('—')
  })

  it('buttons inside card do not toggle details', async () => {
    mockedList.mockResolvedValue([inWindowConfirmed()])
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.passcode-row button').trigger('click')
    await flushPromises()
    expect(showSuccessToast).toHaveBeenCalledWith('房门密码已复制')
    expect(wrapper.find('.card-detail').exists()).toBe(false)
    await wrapper.find('.action-btn--primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('.card-detail').exists()).toBe(false)
  })

  it('detail button navigates to property detail page', async () => {
    mockedList.mockResolvedValue([inWindowConfirmed()])
    const { wrapper, router } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--plain').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('tenant-property-detail')
    expect(router.currentRoute.value.params.id).toBe('5')
    expect(router.currentRoute.value.query.from).toBe('appointment')
  })
})
