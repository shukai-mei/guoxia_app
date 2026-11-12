import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountAt } from './helpers'
import BuildingForm from '../admin/BuildingForm.vue'

vi.mock('vant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vant')>()
  return {
    ...actual,
    showToast: vi.fn(),
    showSuccessToast: vi.fn()
  }
})

vi.mock('../../api', () => ({
  adminGetBuilding: vi.fn(),
  adminCreateBuilding: vi.fn(),
  adminUpdateBuilding: vi.fn()
}))

import { showToast } from 'vant'
import { adminCreateBuilding, adminGetBuilding, adminUpdateBuilding } from '../../api'

const mockedGet = vi.mocked(adminGetBuilding)
const mockedCreate = vi.mocked(adminCreateBuilding)
const mockedUpdate = vi.mocked(adminUpdateBuilding)

beforeEach(() => {
  vi.clearAllMocks()
  mockedGet.mockResolvedValue({
    id: 3,
    name: 'A栋',
    address: '幸福路 1 号',
    hasElevator: true,
    totalFloors: 12,
    elevatorRatio: '两梯四户',
    deliveryFacilities: '楼下驿站',
    livingExperience: '采光好',
    slotStartTime: '06:00',
    slotEndTime: '14:00',
    slotDurationMinutes: 120,
    media: [{ key: '2026/map.jpg', url: 'https://signed/map.jpg', sortOrder: 0 }]
  })
})

type Wrapper = Awaited<ReturnType<typeof mountAt>>['wrapper']

async function confirmTimePicker(wrapper: Wrapper) {
  await wrapper.find('.van-picker__confirm').trigger('click')
  await flushPromises()
}

function vmForm(wrapper: Wrapper) {
  return wrapper.vm as unknown as {
    form: { slotStartTime: string; slotEndTime: string }
  }
}

describe('BuildingForm', () => {
  it('blocks submit when required fields are missing', async () => {
    const { wrapper } = await mountAt(BuildingForm, '/admin/buildings/new')
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('.van-field__error-message')[0].text()).toBe('请填写楼栋名称')
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('echoes existing building in edit mode', async () => {
    const { wrapper } = await mountAt(BuildingForm, '/admin/buildings/3/edit')
    await flushPromises()
    expect((wrapper.find('input[placeholder="请输入楼栋名称"]').element as HTMLInputElement).value).toBe('A栋')
    expect((wrapper.find('input[placeholder="请输入地址"]').element as HTMLInputElement).value).toBe('幸福路 1 号')
    expect(wrapper.text()).toContain('地址参考图')
    expect(wrapper.find('img[src="https://signed/map.jpg"]').exists()).toBe(true)
    const timeFields = wrapper.findAll('.van-field__control[readonly]')
    expect((timeFields[0].element as HTMLInputElement).value).toBe('06:00')
    expect((timeFields[1].element as HTMLInputElement).value).toBe('14:00')
  })

  it('rejects slot config with end not after start', async () => {
    const { wrapper } = await mountAt(BuildingForm, '/admin/buildings/new')
    await flushPromises()
    await wrapper.find('input[placeholder="请输入楼栋名称"]').setValue('A栋')
    await wrapper.find('input[placeholder="请输入地址"]').setValue('幸福路 1 号')
    await wrapper.find('input[placeholder="请输入时段长度，至少 30 分钟"]').setValue('60')
    const timeFields = wrapper.findAll('.van-field__control[readonly]')
    await timeFields[0].trigger('click')
    await confirmTimePicker(wrapper)
    await timeFields[1].trigger('click')
    await confirmTimePicker(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(showToast).toHaveBeenCalledWith('结束时间必须晚于开始时间')
  })

  it('creates building with slot config and media on submit', async () => {
    mockedCreate.mockResolvedValue({ id: 4 } as never)
    const { wrapper, replaceSpy } = await mountAt(BuildingForm, '/admin/buildings/new')
    await flushPromises()
    await wrapper.find('input[placeholder="请输入楼栋名称"]').setValue('B栋')
    await wrapper.find('input[placeholder="请输入地址"]').setValue('幸福路 2 号')
    await wrapper.find('input[placeholder="请输入时段长度，至少 30 分钟"]').setValue('60')
    const form = vmForm(wrapper).form
    form.slotStartTime = '09:00'
    form.slotEndTime = '10:00'
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'B栋',
        address: '幸福路 2 号',
        slotStartTime: '09:00',
        slotEndTime: '10:00',
        slotDurationMinutes: 60,
        media: []
      })
    )
    expect(replaceSpy).toHaveBeenCalledWith('/admin/buildings')
  })

  it('updates building in edit mode', async () => {
    mockedUpdate.mockResolvedValue({ id: 3 } as never)
    const { wrapper, replaceSpy } = await mountAt(BuildingForm, '/admin/buildings/3/edit')
    await flushPromises()
    await wrapper.find('input[placeholder="请输入楼栋名称"]').setValue('A栋改')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockedUpdate).toHaveBeenCalledWith(
      '3',
      expect.objectContaining({ name: 'A栋改', slotStartTime: '06:00', slotEndTime: '14:00' })
    )
    expect(replaceSpy).toHaveBeenCalledWith('/admin/buildings')
  })
})
