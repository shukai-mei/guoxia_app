import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import AdminAppointmentList from '../admin/AdminAppointmentList.vue'
import type { Appointment, PageResult } from '../../api/types'

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

const mockedList = vi.mocked(adminListAppointments)
const mockedConfirm = vi.mocked(confirmAppointment)
const mockedResend = vi.mocked(resendAppointmentSms)

function pageResult(
  items: Appointment[],
  hasMore: boolean,
  page = 1
): PageResult<Appointment> {
  return { items, page, size: 20, hasMore }
}

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
  vi.resetAllMocks()
  mockedList.mockResolvedValue(pageResult([], false))
})

describe('AdminAppointmentList', () => {
  it('renders slot range, channel, sms status and password warnings', async () => {
    mockedList.mockResolvedValue(
      pageResult(
        [
          appointment(),
          appointment({
            id: 10,
            status: 'CONFIRMED',
            confirmChannel: 'AUTO',
            bookingSmsStatus: 'SENT',
            passwordSmsStatus: 'FAILED',
            passwordSet: true
          })
        ],
        false
      )
    )
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('预约时段：2026-11-15 10:00 ~ 12:00')
    expect(wrapper.text()).toContain('自动通过')
    expect(wrapper.text()).toContain('发送失败')
    expect(wrapper.text()).toContain('当日密码未设置，确认前请先在「每日密码」中设置')
    expect(wrapper.findAll('.appointment-card')).toHaveLength(2)
  })

  it('shows empty state when no appointments', async () => {
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无预约申请')
  })

  it('loads first page on mount with page param 1', async () => {
    mockedList.mockResolvedValueOnce(pageResult([appointment()], false))
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    expect(mockedList).toHaveBeenNthCalledWith(1, 1)
    expect(wrapper.findAll('.appointment-card')).toHaveLength(1)
  })

  it('appends next page while hasMore and stops when finished', async () => {
    mockedList
      .mockResolvedValueOnce(pageResult([appointment()], true))
      .mockResolvedValueOnce(pageResult([appointment({ id: 10, tenantName: '李四' })], false))
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    expect(mockedList).toHaveBeenNthCalledWith(1, 1)
    expect(mockedList).toHaveBeenNthCalledWith(2, 2)
    expect(wrapper.findAll('.appointment-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('李四')
    expect(wrapper.text()).toContain('没有更多了')
  })

  it('keeps loaded items and shows retry when next page fails', async () => {
    mockedList
      .mockResolvedValueOnce(pageResult([appointment()], true))
      .mockRejectedValueOnce(new Error('网络异常'))
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    expect(wrapper.findAll('.appointment-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('加载失败，点击重试')

    await wrapper.find('.van-list__error-text').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.appointment-card')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('加载失败，点击重试')
  })

  it('resends sms for failed items and reloads', async () => {
    mockedList.mockResolvedValueOnce(
      pageResult([appointment({ bookingSmsStatus: 'FAILED', passwordSmsStatus: null })], false)
    )
    mockedResend.mockResolvedValue(appointment({ bookingSmsStatus: 'SENT' }))
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    await wrapper.find('.appointment-sms button').trigger('click')
    await flushPromises()
    expect(mockedResend).toHaveBeenCalledWith(9)
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('shows backend message when confirm is rejected for missing password', async () => {
    mockedList.mockResolvedValueOnce(pageResult([appointment()], false))
    mockedConfirm.mockRejectedValue(new ApiError(400, '请先设置当日密码'))
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    await wrapper.find('.appointment-actions button').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('请先设置当日密码')
  })

  it('confirm success reloads from first page', async () => {
    mockedList
      .mockResolvedValueOnce(pageResult([appointment()], true))
      .mockResolvedValueOnce(pageResult([appointment({ id: 10 })], false))
    mockedConfirm.mockResolvedValue(undefined)
    const { wrapper } = await mountAt(AdminAppointmentList, '/admin/appointments')
    await flushPromises()
    expect(wrapper.findAll('.appointment-card')).toHaveLength(2)

    mockedList.mockResolvedValueOnce(pageResult([appointment()], false))
    await wrapper.find('.appointment-actions button').trigger('click')
    await flushPromises()
    expect(mockedList).toHaveBeenCalledTimes(3)
    expect(mockedList).toHaveBeenLastCalledWith(1)
    expect(wrapper.findAll('.appointment-card')).toHaveLength(1)
  })
})
