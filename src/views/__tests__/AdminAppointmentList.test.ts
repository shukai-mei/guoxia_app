import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import AdminAppointmentList from '../admin/AdminAppointmentList.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  adminListAppointments: vi.fn(),
  confirmAppointment: vi.fn(),
  rejectAppointment: vi.fn(),
  resendAppointmentSms: vi.fn()
}))

import { showToast } from 'vant'
import {
  adminListAppointments,
  confirmAppointment,
  resendAppointmentSms
} from '../../api'
import { ApiError } from '../../api/http'
import type { Appointment } from '../../api/types'

const mockedList = vi.mocked(adminListAppointments)
const mockedConfirm = vi.mocked(confirmAppointment)
const mockedResend = vi.mocked(resendAppointmentSms)

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 9,
    propertyId: 5,
    propertyTitle: '阳光公寓',
    tenantName: '张三',
    phone: '13800138000',
    slotStart: '2026-11-15T10:00:00',
    slotEnd: '2026-11-15T12:00:00',
    confirmChannel: null,
    bookingSmsStatus: null,
    passwordSmsStatus: null,
    passwordSet: false,
    status: 'PENDING',
    rejectReason: null,
    createdAt: '2026-11-11T10:00:00',
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminAppointmentList', () => {
  it('renders slot range, channel, sms status and password warnings', async () => {
    mockedList.mockResolvedValue([
      appointment(),
      appointment({
        id: 10,
        status: 'CONFIRMED',
        confirmChannel: 'AUTO',
        bookingSmsStatus: 'SENT',
        passwordSmsStatus: 'FAILED',
        passwordSet: true
      })
    ])
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('预约时段：2026-11-15 10:00 ~ 12:00')
    expect(wrapper.text()).toContain('自动通过')
    expect(wrapper.text()).toContain('发送失败')
    expect(wrapper.text()).toContain('当日密码未设置，确认前请先在「每日密码」中设置')
    expect(wrapper.findAll('.appointment-card')).toHaveLength(2)
  })

  it('resends sms for failed items and reloads', async () => {
    mockedList.mockResolvedValue([
      appointment({ bookingSmsStatus: 'FAILED', passwordSmsStatus: null })
    ])
    mockedResend.mockResolvedValue(appointment({ bookingSmsStatus: 'SENT' }))
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    await wrapper.find('.appointment-sms button').trigger('click')
    await flushPromises()
    expect(mockedResend).toHaveBeenCalledWith(9)
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('shows backend message when confirm is rejected for missing password', async () => {
    mockedList.mockResolvedValue([appointment()])
    mockedConfirm.mockRejectedValue(new ApiError(400, '请先设置当日密码'))
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    await wrapper.find('.appointment-actions button').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('请先设置当日密码')
  })
})
