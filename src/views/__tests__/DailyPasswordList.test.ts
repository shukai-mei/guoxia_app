import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import DailyPasswordList from '../admin/DailyPasswordList.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  adminListProperties: vi.fn(),
  getDailyPassword: vi.fn(),
  upsertDailyPassword: vi.fn()
}))

import { showSuccessToast } from 'vant'
import { adminListProperties, getDailyPassword, upsertDailyPassword } from '../../api'
import type { Property } from '../../api/types'

const mockedList = vi.mocked(adminListProperties)
const mockedStatus = vi.mocked(getDailyPassword)
const mockedUpsert = vi.mocked(upsertDailyPassword)

const PROPERTIES: Property[] = [
  {
    id: 5,
    title: '阳光公寓',
    location: '幸福路 1 号',
    layout: '两室一厅',
    area: 60,
    rent: 3000,
    description: null,
    contact: 'x',
    buildingId: 3,
    building: null,
    status: 'AVAILABLE',
    media: []
  }
]

beforeEach(() => {
  vi.clearAllMocks()
  mockedList.mockResolvedValue(PROPERTIES)
  mockedStatus.mockResolvedValue({ propertyId: 5, date: expect.any(String) as unknown as string, passwordSet: false })
})

async function selectProperty(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) {
  const vm = wrapper.vm as unknown as {
    onPropertyConfirm: (payload: { selectedValues: Array<string | number> }) => void
  }
  vm.onPropertyConfirm({ selectedValues: [PROPERTIES[0].id] })
  await flushPromises()
}

describe('DailyPasswordList', () => {
  it('loads status after property selection', async () => {
    const { wrapper } = await mountAt(DailyPasswordList, '/admin/daily-passwords')
    await flushPromises()
    await selectProperty(wrapper)
    expect(mockedStatus).toHaveBeenCalledWith(5, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(wrapper.text()).toContain('未设置')
    expect(wrapper.text()).toContain('设置密码')
  })

  it('shows set status and overwrite hint when password already set', async () => {
    mockedStatus.mockResolvedValue({ propertyId: 5, date: '2026-11-15', passwordSet: true })
    const { wrapper } = await mountAt(DailyPasswordList, '/admin/daily-passwords')
    await flushPromises()
    await selectProperty(wrapper)
    expect(wrapper.text()).toContain('已设置')
    expect(wrapper.text()).toContain('再次设置将覆盖原密码')
    expect(wrapper.text()).toContain('覆盖设置')
  })

  it('submits password for selected property and date', async () => {
    mockedUpsert.mockResolvedValue({ propertyId: 5, date: '2026-11-15', passwordSet: true })
    const { wrapper } = await mountAt(DailyPasswordList, '/admin/daily-passwords')
    await flushPromises()
    await selectProperty(wrapper)
    await wrapper.find('input[placeholder="请输入临时密码"]').setValue('1234')
    await wrapper.find('.submit-wrap button').trigger('click')
    await flushPromises()
    expect(mockedUpsert).toHaveBeenCalledWith(5, {
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      password: '1234'
    })
    expect(showSuccessToast).toHaveBeenCalledWith('设置成功')
  })
})
