import { http } from './http'
import type {
  Appointment,
  AppointmentInput,
  Property,
  PropertyInput,
  PropertyQuery,
  PropertyStatus,
  UploadResult
} from './types'

export function listProperties(params: PropertyQuery = {}): Promise<Property[]> {
  return http.get('/api/properties', { params }).then((r) => r.data as Property[])
}

export function getProperty(id: number | string): Promise<Property> {
  return http.get(`/api/properties/${id}`).then((r) => r.data as Property)
}

export function submitAppointment(propertyId: number | string, input: AppointmentInput): Promise<void> {
  return http.post(`/api/properties/${propertyId}/appointments`, input).then(() => undefined)
}

export function adminListProperties(): Promise<Property[]> {
  return http.get('/admin/api/properties').then((r) => r.data as Property[])
}

export function createProperty(input: PropertyInput): Promise<Property> {
  return http.post('/admin/api/properties', input).then((r) => r.data as Property)
}

export function updateProperty(id: number | string, input: PropertyInput): Promise<Property> {
  return http.put(`/admin/api/properties/${id}`, input).then((r) => r.data as Property)
}

export function updatePropertyStatus(id: number | string, status: PropertyStatus): Promise<void> {
  return http.put(`/admin/api/properties/${id}/status`, { status }).then(() => undefined)
}

export function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  return http.post('/admin/api/files', formData).then((r) => r.data as UploadResult)
}

export function adminListAppointments(): Promise<Appointment[]> {
  return http.get('/admin/api/appointments').then((r) => r.data as Appointment[])
}

export function confirmAppointment(id: number | string): Promise<void> {
  return http.put(`/admin/api/appointments/${id}/confirm`).then(() => undefined)
}

export function rejectAppointment(id: number | string, reason: string): Promise<void> {
  return http.put(`/admin/api/appointments/${id}/reject`, { reason }).then(() => undefined)
}
