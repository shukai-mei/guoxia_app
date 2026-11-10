import { describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http } from '../http'
import {
  adminListAppointments,
  adminListProperties,
  confirmAppointment,
  createProperty,
  getProperty,
  listProperties,
  rejectAppointment,
  submitAppointment,
  updateProperty,
  updatePropertyStatus,
  uploadFile
} from '../index'

const mock = new MockAdapter(http)

function ok(data: unknown) {
  return [200, { code: 0, message: 'success', data }] as const
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

  it('submitAppointment POST /api/properties/{id}/appointments with body', async () => {
    mock.onPost('/api/properties/5/appointments').reply(...ok(null))
    await submitAppointment(5, {
      name: '张三',
      phone: '13800138000',
      preferredTime: '2026-11-15 10:30:00'
    })
    const request = mock.history.post.find((r) => r.url === '/api/properties/5/appointments')
    expect(request).toBeDefined()
    expect(JSON.parse(request!.data)).toEqual({
      name: '张三',
      phone: '13800138000',
      preferredTime: '2026-11-15 10:30:00'
    })
  })
})

describe('admin property api', () => {
  it('adminListProperties GET /admin/api/properties', async () => {
    mock.onGet('/admin/api/properties').reply(...ok([]))
    await adminListProperties()
    expect(mock.history.get.some((r) => r.url === '/admin/api/properties')).toBe(true)
  })

  it('createProperty POST /admin/api/properties with media inputs', async () => {
    mock.onPost('/admin/api/properties').reply(...ok({ id: 1 }))
    await createProperty({
      title: '阳光公寓',
      location: '幸福路 1 号',
      layout: '两室一厅',
      area: 60,
      rent: 3000,
      contact: '13800138000',
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
})
