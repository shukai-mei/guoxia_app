import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import MyAppointments from '../tenant/MyAppointments.vue'
import type { MyAppointment, PageResult } from '../../api/types'

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
  getMyAppointments: vi.fn(),
  getViewingRules: vi.fn(),
  openDoor: vi.fn()
}))

import { showDialog, showSuccessToast, showToast } from 'vant'
import { getMyAppointments, getViewingRules, openDoor } from '../../api'
import { ApiError } from '../../api/http'
import { formatDateTime } from '../../utils/format'

const mockedList = vi.mocked(getMyAppointments)
const mockedRules = vi.mocked(getViewingRules)
const mockedOpenDoor = vi.mocked(openDoor)

function pageResult(
  items: MyAppointment[],
  hasMore: boolean,
  page = 1
): PageResult<MyAppointment> {
  return { items, page, size: 20, hasMore }
}

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
  cancelReason: null,
  cancelSmsStatus: null,
  cancelSmsSentAt: null,
  passcode: '5678',
  canOpenDoor: true,
  doorSupported: false,
  lockSupported: false,
  selfOpenSupported: true,
  housekeeper: null,
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
  cancelReason: null,
  cancelSmsStatus: null,
  cancelSmsSentAt: null,
  passcode: null,
  canOpenDoor: false,
  doorSupported: false,
  lockSupported: false,
  selfOpenSupported: true,
  housekeeper: null,
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
  cancelReason: null,
  cancelSmsStatus: null,
  cancelSmsSentAt: null,
  passcode: null,
  canOpenDoor: false,
  doorSupported: false,
  lockSupported: false,
  selfOpenSupported: true,
  housekeeper: null,
  buildingName: '幸福大厦',
  buildingAddress: '测试路 2 号',
  propertyLocation: '测试路 2 号 1 单元 101',
  propertyLayout: '一室一厅',
  createdAt: '2026-11-13T10:00:00'
}

const HOUSEKEEPER = {
  id: 7,
  name: '王管家',
  contact: '13800001111',
  qrObjectKey: 'housekeeper/qr.png',
  qrUrl: 'https://signed/qr.png'
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
  vi.resetAllMocks()
  mockedList.mockResolvedValue(pageResult([], false))
  mockedRules.mockResolvedValue({ items: [] })
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true
  })
})

describe('MyAppointments', () => {
  it('renders appointment list with status mapping and time range', async () => {
    const confirmed = inWindowConfirmed()
    mockedList.mockResolvedValue(pageResult([confirmed, PENDING, REJECTED], false))
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
    mockedList.mockResolvedValue(pageResult([], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无预约记录')
  })

  it('shows error with retry and recovers after retry', async () => {
    mockedList.mockRejectedValueOnce(new Error('网络异常，请稍后重试'))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('加载失败，点击重试')
    mockedList.mockResolvedValueOnce(pageResult([PENDING], false))
    await wrapper.find('.van-list__error-text').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('待处理')
    expect(wrapper.text()).not.toContain('加载失败，点击重试')
  })

  it('pull refresh reloads list', async () => {
    mockedList.mockResolvedValueOnce(pageResult([PENDING], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.appointment-card').length).toBe(1)
    mockedList.mockResolvedValueOnce(pageResult([PENDING, CONFIRMED], false))
    await (
      wrapper.vm as unknown as { onRefresh: () => Promise<void> }
    ).onRefresh()
    await flushPromises()
    expect(wrapper.findAll('.appointment-card').length).toBe(2)
  })

  it('loads first page on mount with page param 1', async () => {
    mockedList.mockResolvedValueOnce(pageResult([inWindowConfirmed()], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(mockedList).toHaveBeenNthCalledWith(1, 1)
    expect(wrapper.findAll('.appointment-card').length).toBe(1)
  })

  it('appends next page while hasMore and stops when finished', async () => {
    mockedList
      .mockResolvedValueOnce(pageResult([inWindowConfirmed()], true))
      .mockResolvedValueOnce(pageResult([PENDING], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(mockedList).toHaveBeenNthCalledWith(1, 1)
    expect(mockedList).toHaveBeenNthCalledWith(2, 2)
    expect(wrapper.findAll('.appointment-card').length).toBe(2)
    expect(wrapper.text()).toContain('5678')
    expect(wrapper.text()).toContain('待处理')
  })

  it('shows finished text when last page has no more', async () => {
    mockedList.mockResolvedValueOnce(pageResult([inWindowConfirmed()], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('没有更多了')
  })

  it('keeps loaded items and shows retry when next page fails', async () => {
    mockedList
      .mockResolvedValueOnce(pageResult([inWindowConfirmed()], true))
      .mockRejectedValueOnce(new Error('网络异常'))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.appointment-card').length).toBe(1)
    expect(wrapper.text()).toContain('加载失败，点击重试')

    await wrapper.find('.van-list__error-text').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.appointment-card').length).toBe(1)
    expect(wrapper.text()).not.toContain('加载失败，点击重试')
  })

  it('refresh resets to first page and can page again', async () => {
    mockedList
      .mockResolvedValueOnce(pageResult([inWindowConfirmed()], true))
      .mockResolvedValueOnce(pageResult([PENDING], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.appointment-card').length).toBe(2)

    mockedList
      .mockResolvedValueOnce(pageResult([futureConfirmed(true, true)], true))
      .mockResolvedValueOnce(pageResult([PENDING], false))
    await (
      wrapper.vm as unknown as { onRefresh: () => Promise<void> }
    ).onRefresh()
    await flushPromises()
    expect(mockedList).toHaveBeenNthCalledWith(3, 1)
    expect(mockedList).toHaveBeenNthCalledWith(4, 2)
    expect(wrapper.findAll('.appointment-card').length).toBe(2)
    expect(wrapper.text()).toContain('房门密码：暂未下发')
    expect(wrapper.text()).not.toContain('5678')
  })

  it('shows open door button only for canOpenDoor records', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed(), PENDING], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.action-btn--primary').length).toBe(1)
  })

  it('opens door successfully with loading state during request', async () => {
    let resolveDoor: (value: void) => void = () => undefined
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
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
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    mockedOpenDoor.mockRejectedValue(new Error('未到开门时间'))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--primary').trigger('click')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('未到开门时间')
  })

  it('shows invalidated tag and reason for cancelled records without door or passcode ops', async () => {
    mockedList.mockResolvedValue(
      pageResult(
        [
          endedAppointment('CANCELLED', { cancelReason: '房源已租出' }),
          endedAppointment('CANCELLED')
        ],
        false
      )
    )
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('已失效')
    expect(wrapper.text()).toContain('失效原因：房源已租出')
    expect(wrapper.text()).not.toContain('已过期')
    expect(wrapper.findAll('.status-tag').length).toBe(2)
    expect(wrapper.findAll('.ended-tag').length).toBe(0)
    expect(wrapper.find('.passcode-row').exists()).toBe(false)
    const actions = wrapper.findAll('.card-actions')
    expect(actions.length).toBe(2)
    for (const action of actions) {
      expect(action.text()).not.toContain('门禁开门')
      expect(action.text()).toContain('房源详情')
    }
  })

  it('shows dialog instead of toast when open door blocked by rented property', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    mockedOpenDoor.mockRejectedValue(new ApiError(40901, '房源已租出，无法开门，请联系客服'))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--primary').trigger('click')
    await flushPromises()
    expect(showDialog).toHaveBeenCalledWith({ message: '房源已租出，无法开门，请联系客服' })
    expect(showToast).not.toHaveBeenCalled()
  })

  it('shows dialog instead of toast when open door blocked by off-shelf property', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    mockedOpenDoor.mockRejectedValue(new ApiError(40902, '房源已下架，无法开门'))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--primary').trigger('click')
    await flushPromises()
    expect(showDialog).toHaveBeenCalledWith({ message: '房源已下架，无法开门' })
    expect(showToast).not.toHaveBeenCalled()
  })

  it('copies passcode via clipboard and shows success toast', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).toContain('房门密码')
    expect(wrapper.text()).toContain('5678')
    await wrapper.find('.passcode-row button').trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('5678')
    expect(showSuccessToast).toHaveBeenCalledWith('房门密码已复制')
  })

  it('copies passcode via execCommand fallback when clipboard write is denied', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true
    })
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(true),
      configurable: true
    })
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.passcode-row button').trigger('click')
    await flushPromises()
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(showSuccessToast).toHaveBeenCalledWith('房门密码已复制')
    expect(showToast).not.toHaveBeenCalled()
  })

  it('falls back to text selection when clipboard fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true
    })
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(false),
      configurable: true
    })
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
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
    mockedList.mockResolvedValue(pageResult([PENDING], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.passcode-row').exists()).toBe(false)
  })

  it('shows passcode pending hint and greyed open door before window', async () => {
    mockedList.mockResolvedValue(pageResult([futureConfirmed(true, true)], false))
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
    mockedList.mockResolvedValue(pageResult([futureConfirmed(true, false)], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--pending').trigger('click')
    expect(showToast).toHaveBeenCalledWith('预约时间段内才能操作门禁')
    expect(mockedOpenDoor).not.toHaveBeenCalled()
  })

  it('hides pending hint and greyed button without door or lock support', async () => {
    mockedList.mockResolvedValue(pageResult([futureConfirmed(false, false)], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).not.toContain('房门密码：暂未下发')
    expect(wrapper.find('.action-btn--pending').exists()).toBe(false)
    expect(wrapper.find('.action-btn--primary').exists()).toBe(false)
    expect(wrapper.find('.action-btn--plain').exists()).toBe(true)
  })

  it('shows unconfirmed hint and greyed door button for pending status with support', async () => {
    const pendingWithSupport = { ...futureConfirmed(true, true), id: 22, status: 'PENDING' as const }
    mockedList.mockResolvedValue(pageResult([pendingWithSupport], false))
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
    mockedList.mockResolvedValue(pageResult([pendingWithDoor], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--pending').trigger('click')
    expect(showToast).toHaveBeenCalledWith('预约确认后可用')
    expect(mockedOpenDoor).not.toHaveBeenCalled()
  })

  it('does not show hint or greyed button for pending status without support', async () => {
    const pendingNoSupport = { ...futureConfirmed(false, false), id: 22, status: 'PENDING' as const }
    mockedList.mockResolvedValue(pageResult([pendingNoSupport], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).not.toContain('房门密码：暂未下发')
    expect(wrapper.find('.action-btn--pending').exists()).toBe(false)
    expect(wrapper.find('.action-btn--plain').exists()).toBe(true)
  })

  it('does not show hint or greyed button for rejected status even with support', async () => {
    const rejectedWithSupport = { ...futureConfirmed(true, true), id: 22, status: 'REJECTED' as const, rejectReason: '时间不合适' }
    mockedList.mockResolvedValue(pageResult([rejectedWithSupport], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.text()).not.toContain('房门密码：暂未下发')
    expect(wrapper.find('.action-btn--pending').exists()).toBe(false)
  })

  it('greys out ended records, hides door/passcode ops but keeps property detail link', async () => {
    mockedList.mockResolvedValue(
      pageResult(
        [
          endedAppointment('CONFIRMED', { passcode: '2468', canOpenDoor: true }),
          endedAppointment('PENDING'),
          endedAppointment('REJECTED', { rejectReason: '时间不合适' })
        ],
        false
      )
    )
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    const cards = wrapper.findAll('.appointment-card')
    expect(cards.length).toBe(3)
    for (const card of cards) {
      expect(card.classes()).toContain('appointment-card--ended')
    }
    expect(wrapper.findAll('.ended-tag').length).toBe(3)
    expect(wrapper.text()).toContain('已过期')
    const actions = wrapper.findAll('.card-actions')
    expect(actions.length).toBe(3)
    for (const action of actions) {
      expect(action.text()).toContain('房源详情')
      expect(action.text()).not.toContain('门禁开门')
    }
    expect(wrapper.find('.passcode-row').exists()).toBe(false)
    expect(wrapper.find('.passcode-pending').exists()).toBe(false)
  })

  it('property detail button on ended record still navigates', async () => {
    mockedList.mockResolvedValue(pageResult([endedAppointment('CONFIRMED')], false))
    const { wrapper, router } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--plain').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('tenant-property-detail')
    expect(router.currentRoute.value.params.id).toBe(String(endedAppointment('CONFIRMED').propertyId))
  })

  it('does not grey out upcoming or in-window records', async () => {
    mockedList.mockResolvedValue(
      pageResult([inWindowConfirmed(), futureConfirmed(true, true)], false)
    )
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    for (const card of wrapper.findAll('.appointment-card')) {
      expect(card.classes()).not.toContain('appointment-card--ended')
    }
    expect(wrapper.find('.ended-tag').exists()).toBe(false)
  })

  it('clicking card expands and collapses address details', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
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
    mockedList.mockResolvedValue(
      pageResult(
        [
          inWindowConfirmed({
            buildingName: null,
            buildingAddress: null,
            propertyLocation: null,
            propertyLayout: null
          })
        ],
        false
      )
    )
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.appointment-card').trigger('click')
    expect(wrapper.find('.card-detail').text()).toContain('—')
  })

  it('buttons inside card do not toggle details', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
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
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    const { wrapper, router } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.action-btn--plain').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('tenant-property-detail')
    expect(router.currentRoute.value.params.id).toBe('5')
    expect(router.currentRoute.value.query.from).toBe('appointment')
  })

  it('shows viewing rules board with title and rule items', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    mockedRules.mockResolvedValue({
      items: ['看房期间请勿破坏房内设施', '如有满意房源，可联系管家走签约流程']
    })
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    const board = wrapper.find('.rules')
    expect(board.exists()).toBe(true)
    expect(board.text()).toContain('看房规则须知')
    expect(board.findAll('li').length).toBe(2)
    expect(board.text()).toContain('看房期间请勿破坏房内设施')
    expect(board.text()).toContain('如有满意房源，可联系管家走签约流程')
  })

  it('hides rules board when rules request fails', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    mockedRules.mockRejectedValue(new Error('网络异常'))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.rules').exists()).toBe(false)
    expect(wrapper.findAll('.appointment-card').length).toBe(1)
  })

  it('hides rules board when rules list is empty', async () => {
    mockedList.mockResolvedValue(pageResult([inWindowConfirmed()], false))
    mockedRules.mockResolvedValue({ items: [] })
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.rules').exists()).toBe(false)
    expect(wrapper.findAll('.appointment-card').length).toBe(1)
  })

  it('marks pending and confirmed selfOpenSupported false records as escort', async () => {
    const escortConfirmed = inWindowConfirmed({
      selfOpenSupported: false,
      housekeeper: null,
      passcode: null,
      canOpenDoor: false
    })
    const escortPending = {
      ...futureConfirmed(false, false),
      id: 31,
      status: 'PENDING' as const,
      selfOpenSupported: false,
      housekeeper: null
    }
    mockedList.mockResolvedValue(pageResult([escortConfirmed, escortPending], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.escort-tip').length).toBe(2)
  })

  it('does not mark selfOpenSupported true or undefined records as escort', async () => {
    const selfOpen = inWindowConfirmed()
    const undefinedFlag = inWindowConfirmed({ id: 32, selfOpenSupported: undefined })
    mockedList.mockResolvedValue(pageResult([selfOpen, undefinedFlag], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.escort-tip').length).toBe(0)
    expect(wrapper.findAll('.action-btn--primary').length).toBe(2)
  })

  it('does not mark cancelled or expired escort records as escort', async () => {
    const cancelled = endedAppointment('CANCELLED', {
      selfOpenSupported: false,
      cancelReason: '房源已租出'
    })
    const expired = endedAppointment('CONFIRMED', { selfOpenSupported: false })
    mockedList.mockResolvedValue(pageResult([cancelled, expired], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.findAll('.escort-tip').length).toBe(0)
    expect(wrapper.text()).toContain('已失效')
    expect(wrapper.text()).toContain('已过期')
  })

  it('escort card shows tip and hides passcode and door buttons', async () => {
    const escort = inWindowConfirmed({
      selfOpenSupported: false,
      housekeeper: null,
      passcode: '5678',
      canOpenDoor: true,
      doorSupported: true,
      lockSupported: true
    })
    mockedList.mockResolvedValue(pageResult([escort], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.escort-tip').exists()).toBe(true)
    expect(wrapper.text()).toContain('本楼栋门禁不支持自助开门')
    expect(wrapper.text()).toContain('需联系管家带看，请提前添加管家微信或拨打电话预约带看')
    expect(wrapper.find('.passcode-row').exists()).toBe(false)
    expect(wrapper.find('.passcode-pending').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('房门密码')
    expect(wrapper.text()).not.toContain('门禁开门')
    expect(wrapper.find('.escort-actions').exists()).toBe(true)
    expect(wrapper.text()).toContain('房源详情')
  })

  it('escort card with housekeeper shows qr, name, online tag, phone and tel link', async () => {
    const escort = inWindowConfirmed({
      selfOpenSupported: false,
      housekeeper: HOUSEKEEPER,
      passcode: null,
      canOpenDoor: false
    })
    mockedList.mockResolvedValue(pageResult([escort], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.escort-qr').exists()).toBe(true)
    expect(wrapper.find('img[src="https://signed/qr.png"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('王管家')
    expect(wrapper.text()).toContain('在线')
    expect(wrapper.text()).toContain('13800001111')
    const call = wrapper.find('.escort-btn--primary')
    expect(call.exists()).toBe(true)
    expect(call.text()).toContain('联系管家带看')
    expect(call.attributes('href')).toBe('tel:13800001111')
  })

  it('escort housekeeper without qr url falls back to decorative qr box', async () => {
    const escort = inWindowConfirmed({
      selfOpenSupported: false,
      housekeeper: { ...HOUSEKEEPER, qrObjectKey: null, qrUrl: null },
      passcode: null,
      canOpenDoor: false
    })
    mockedList.mockResolvedValue(pageResult([escort], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.escort-qr').exists()).toBe(true)
    expect(wrapper.find('.qr-center').exists()).toBe(true)
    expect(wrapper.find('.qr-real').exists()).toBe(false)
    expect(wrapper.find('.escort-btn--primary').attributes('href')).toBe('tel:13800001111')
  })

  it('escort card without housekeeper degrades to tip and property detail only', async () => {
    const escort = inWindowConfirmed({
      selfOpenSupported: false,
      housekeeper: null,
      passcode: null,
      canOpenDoor: false
    })
    mockedList.mockResolvedValue(pageResult([escort], false))
    const { wrapper } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    expect(wrapper.find('.escort-tip').exists()).toBe(true)
    expect(wrapper.find('.escort-qr').exists()).toBe(false)
    expect(wrapper.find('.escort-btn--primary').exists()).toBe(false)
    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
    expect(wrapper.find('.escort-btn--ghost').exists()).toBe(true)
    expect(wrapper.text()).toContain('房源详情')
  })

  it('escort property detail button navigates to property detail page', async () => {
    const escort = inWindowConfirmed({
      selfOpenSupported: false,
      housekeeper: HOUSEKEEPER,
      passcode: null,
      canOpenDoor: false
    })
    mockedList.mockResolvedValue(pageResult([escort], false))
    const { wrapper, router } = await mountAt(MyAppointments, '/my-appointments')
    await flushPromises()
    await wrapper.find('.escort-btn--ghost').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('tenant-property-detail')
    expect(router.currentRoute.value.params.id).toBe('5')
    expect(router.currentRoute.value.query.from).toBe('appointment')
  })
})
