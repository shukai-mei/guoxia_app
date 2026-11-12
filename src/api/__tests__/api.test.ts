import { describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http } from '../http'
import {
  adminCreateBuilding,
  adminDeleteBuilding,
  adminGetWechatConfig,
  adminListAppointments,
  adminListBuildings,
  adminListProperties,
  adminUpdateBuilding,
  adminUpdateWechatConfig,
  confirmAppointment,
  createProperty,
  getDailyPassword,
  getProperty,
  getSlots,
  getWechatConfig,
  listProperties,
  rejectAppointment,
  resendAppointmentSms,
  submitAppointment,
  updateProperty,
  updatePropertyStatus,
  uploadFile,
  upsertDailyPassword
} from '../index'

const mock = new MockAdapter(http)

function ok(data: unknown) {
  return [200, { code: 0, message: 'success', data }] as const
}

function fail(code: number, message: string) {
  return [200, { code, message, data: null }] as const
}

describe('tenant api', () => {
  it('listProperties GET /api/properties with filter params', async () => {
    mock.onGet('/api/properties', { params: { keyword: '两室', rentMin: 1000, rentMax: 3000 } }).reply(...ok([]))
    await listProperties({ keyword: '两室', rentMin: 1000, rentMax: 3000 })
    expect(mock.history.get.some((r) => r.url === '/api/properties')).toBe(true)
  })

  it('listProperties defaults to no params', async () => {
    mock.onGet('/api/properties').reply(...ok([]))
    await listProperties()
    const request = mock.history.get.find(
      (r) => r.url === '/api/properties' && (!r.params || Object.keys(r.params).length === 0)
    )
    expect(request).toBeDefined()
  })

  it('getProperty GET /api/properties/{id}', async () => {
    mock.onGet('/api/properties/5').reply(...ok({ id: 5 }))
    const property = await getProperty(5)
    expect(property).toEqual({ id: 5 })
  })

  it('getSlots GET /api/properties/{id}/slots with date param', async () => {
    mock
      .onGet('/api/properties/5/slots', { params: { date: '2026-11-15' } })
      .reply(...ok({ propertyId: 5, supported: true, slots: [] }))
    const result = await getSlots(5, '2026-11-15')
    expect(result).toEqual({ propertyId: 5, supported: true, slots: [] })
  })

  it('submitAppointment POST /api/properties/{id}/appointments with new slot body', async () => {
    mock.onPost('/api/properties/5/appointments').reply(...ok({ id: 9 }))
    const result = await submitAppointment(5, {
      name: '张三',
      phone: '13800138000',
      date: '2026-11-15',
      slotStart: '10:00',
      slotEnd: '12:00'
    })
    expect(result).toEqual({ id: 9 })
    const request = mock.history.post.find((r) => r.url === '/api/properties/5/appointments')
    expect(request).toBeDefined()
    expect(JSON.parse(request!.data)).toEqual({
      name: '张三',
      phone: '13800138000',
      date: '2026-11-15',
      slotStart: '10:00',
      slotEnd: '12:00'
    })
  })

  it('submitAppointment surfaces business error envelope as ApiError', async () => {
    mock.onPost('/api/properties/5/appointments').reply(...fail(409, '该时段已被预约'))
    await expect(
      submitAppointment(5, {
        name: '张三',
        phone: '13800138000',
        date: '2026-11-15',
        slotStart: '10:00',
        slotEnd: '12:00'
      })
    ).rejects.toMatchObject({ code: 409, message: '该时段已被预约' })
  })

  it('getWechatConfig GET /api/config/wechat', async () => {
    mock.onGet('/api/config/wechat').reply(...ok({ contact: 'wx', qrUrl: 'https://signed' }))
    const config = await getWechatConfig()
    expect(config).toEqual({ contact: 'wx', qrUrl: 'https://signed' })
  })
})

describe('admin property api', () => {
  it('adminListProperties GET /admin/api/properties', async () => {
    mock.onGet('/admin/api/properties').reply(...ok([]))
    await adminListProperties()
    expect(mock.history.get.some((r) => r.url === '/admin/api/properties')).toBe(true)
  })

  it('createProperty POST /admin/api/properties with buildingId and media inputs', async () => {
    mock.onPost('/admin/api/properties').reply(...ok({ id: 1 }))
    await createProperty({
      title: '阳光公寓',
      location: '幸福路 1 号',
      layout: '两室一厅',
      area: 60,
      rent: 3000,
      contact: '13800138000',
      buildingId: 3,
      media: [{ type: 'SURROUNDING', key: '20261111/a.jpg', sortOrder: 0 }]
    })
    const request = mock.history.post.find((r) => r.url === '/admin/api/properties')
    expect(request).toBeDefined()
    expect(JSON.parse(request!.data)).toEqual({
      title: '阳光公寓',
      location: '幸福路 1 号',
      layout: '两室一厅',
      area: 60,
      rent: 3000,
      contact: '13800138000',
      buildingId: 3,
      media: [{ type: 'SURROUNDING', key: '20261111/a.jpg', sortOrder: 0 }]
    })
  })

  it('updateProperty PUT /admin/api/properties/{id}', async () => {
    mock.onPut('/admin/api/properties/5').reply(...ok({ id: 5 }))
    await updateProperty(5, {
      title: 't',
      location: 'l',
      layout: '一室一厅',
      area: 40,
      rent: 2000,
      contact: '13800138000',
      buildingId: 3,
      media: []
    })
    expect(mock.history.put.some((r) => r.url === '/admin/api/properties/5')).toBe(true)
  })

  it('updatePropertyStatus PUT /admin/api/properties/{id}/status', async () => {
    mock.onPut('/admin/api/properties/5/status').reply(...ok(null))
    await updatePropertyStatus(5, 'OFF_SHELF')
    const request = mock.history.put.find((r) => r.url === '/admin/api/properties/5/status')
    expect(JSON.parse(request!.data)).toEqual({ status: 'OFF_SHELF' })
  })

  it('getDailyPassword GET /admin/api/properties/{id}/daily-passwords with date', async () => {
    mock
      .onGet('/admin/api/properties/5/daily-passwords', { params: { date: '2026-11-15' } })
      .reply(...ok({ propertyId: 5, date: '2026-11-15', passwordSet: true }))
    const result = await getDailyPassword(5, '2026-11-15')
    expect(result).toEqual({ propertyId: 5, date: '2026-11-15', passwordSet: true })
  })

  it('upsertDailyPassword POST /admin/api/properties/{id}/daily-passwords', async () => {
    mock
      .onPost('/admin/api/properties/5/daily-passwords')
      .reply(...ok({ propertyId: 5, date: '2026-11-15', passwordSet: true }))
    const result = await upsertDailyPassword(5, { date: '2026-11-15', password: '1234' })
    expect(result.passwordSet).toBe(true)
    const request = mock.history.post.find(
      (r) => r.url === '/admin/api/properties/5/daily-passwords'
    )
    expect(JSON.parse(request!.data)).toEqual({ date: '2026-11-15', password: '1234' })
  })

  it('uploadFile POST /admin/api/files with multipart field "file"', async () => {
    mock.onPost('/admin/api/files').reply(...ok({ key: '20261111/b.jpg', url: 'https://signed' }))
    const file = new File(['x'], 'b.jpg', { type: 'image/jpeg' })
    const result = await uploadFile(file)
    expect(result).toEqual({ key: '20261111/b.jpg', url: 'https://signed' })
    const request = mock.history.post.find((r) => r.url === '/admin/api/files')
    const formData = request!.data as FormData
    expect(formData.get('file')).toBe(file)
  })
})

describe('admin building api', () => {
  it('adminListBuildings GET /admin/api/buildings', async () => {
    mock.onGet('/admin/api/buildings').reply(...ok([]))
    await adminListBuildings()
    expect(mock.history.get.some((r) => r.url === '/admin/api/buildings')).toBe(true)
  })

  it('adminCreateBuilding POST /admin/api/buildings with slot config and media', async () => {
    mock.onPost('/admin/api/buildings').reply(...ok({ id: 3 }))
    await adminCreateBuilding({
      name: 'A 栋',
      address: '幸福路 1 号',
      slotStartTime: '06:00',
      slotEndTime: '14:00',
      slotDurationMinutes: 120,
      media: [{ key: '20261111/map.jpg', sortOrder: 0 }]
    })
    const request = mock.history.post.find((r) => r.url === '/admin/api/buildings')
    expect(JSON.parse(request!.data)).toEqual({
      name: 'A 栋',
      address: '幸福路 1 号',
      slotStartTime: '06:00',
      slotEndTime: '14:00',
      slotDurationMinutes: 120,
      media: [{ key: '20261111/map.jpg', sortOrder: 0 }]
    })
  })

  it('adminUpdateBuilding PUT /admin/api/buildings/{id}', async () => {
    mock.onPut('/admin/api/buildings/3').reply(...ok({ id: 3 }))
    await adminUpdateBuilding(3, {
      name: 'A 栋',
      address: '幸福路 1 号',
      slotStartTime: '06:00',
      slotEndTime: '14:00',
      slotDurationMinutes: 120,
      media: []
    })
    expect(mock.history.put.some((r) => r.url === '/admin/api/buildings/3')).toBe(true)
  })

  it('adminDeleteBuilding DELETE /admin/api/buildings/{id}', async () => {
    mock.onDelete('/admin/api/buildings/3').reply(...ok(null))
    await adminDeleteBuilding(3)
    expect(mock.history.delete.some((r) => r.url === '/admin/api/buildings/3')).toBe(true)
  })

  it('adminDeleteBuilding surfaces conflict error', async () => {
    mock.onDelete('/admin/api/buildings/3').reply(...fail(409, '该楼栋下存在房源'))
    await expect(adminDeleteBuilding(3)).rejects.toMatchObject({
      code: 409,
      message: '该楼栋下存在房源'
    })
  })
})

describe('admin appointment api', () => {
  it('adminListAppointments GET /admin/api/appointments', async () => {
    mock.onGet('/admin/api/appointments').reply(...ok([]))
    await adminListAppointments()
    expect(mock.history.get.some((r) => r.url === '/admin/api/appointments')).toBe(true)
  })

  it('confirmAppointment PUT /admin/api/appointments/{id}/confirm', async () => {
    mock.onPut('/admin/api/appointments/3/confirm').reply(...ok(null))
    await confirmAppointment(3)
    expect(mock.history.put.some((r) => r.url === '/admin/api/appointments/3/confirm')).toBe(true)
  })

  it('rejectAppointment PUT /admin/api/appointments/{id}/reject with reason', async () => {
    mock.onPut('/admin/api/appointments/3/reject').reply(...ok(null))
    await rejectAppointment(3, '房源已租出')
    const request = mock.history.put.find((r) => r.url === '/admin/api/appointments/3/reject')
    expect(JSON.parse(request!.data)).toEqual({ reason: '房源已租出' })
  })

  it('resendAppointmentSms POST /admin/api/appointments/{id}/resend-sms', async () => {
    mock.onPost('/admin/api/appointments/3/resend-sms').reply(...ok({ id: 3, passwordSmsStatus: 'SENT' }))
    const result = await resendAppointmentSms(3)
    expect(result).toEqual({ id: 3, passwordSmsStatus: 'SENT' })
  })
})

describe('admin wechat config api', () => {
  it('adminGetWechatConfig GET /admin/api/config/wechat', async () => {
    mock.onGet('/admin/api/config/wechat').reply(...ok({ contact: 'wx', qrObjectKey: '2026/qr.png' }))
    const config = await adminGetWechatConfig()
    expect(config).toEqual({ contact: 'wx', qrObjectKey: '2026/qr.png' })
  })

  it('adminUpdateWechatConfig PUT /admin/api/config/wechat', async () => {
    mock
      .onPut('/admin/api/config/wechat')
      .reply(...ok({ contact: 'wx', qrObjectKey: '2026/qr.png' }))
    const config = await adminUpdateWechatConfig({ contact: 'wx', qrObjectKey: '2026/qr.png' })
    expect(config.contact).toBe('wx')
    const request = mock.history.put.find((r) => r.url === '/admin/api/config/wechat')
    expect(JSON.parse(request!.data)).toEqual({ contact: 'wx', qrObjectKey: '2026/qr.png' })
  })
})
