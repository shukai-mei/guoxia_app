import { http } from './http'
import type {
  AdminPropertyQuery,
  Appointment,
  AppointmentInput,
  Building,
  BuildingInput,
  DailyPassword,
  DailyPasswordInput,
  FaqListView,
  MyAppointment,
  PageResult,
  Property,
  PropertyInput,
  PropertyQuery,
  PropertyStatus,
  RentStatus,
  SlotList,
  UploadResult,
  ViewingRulesView,
  WechatConfig,
  WechatConfigInput
} from './types'

export function listProperties(params: PropertyQuery = {}): Promise<Property[]> {
  return http.get('/api/properties', { params }).then((r) => r.data as Property[])
}

export function getProperty(id: number | string): Promise<Property> {
  return http.get(`/api/properties/${id}`).then((r) => r.data as Property)
}

export function getSlots(propertyId: number | string, date: string): Promise<SlotList> {
  return http
    .get(`/api/properties/${propertyId}/slots`, { params: { date } })
    .then((r) => r.data as SlotList)
}

export function submitAppointment(
  propertyId: number | string,
  input: AppointmentInput
): Promise<Appointment> {
  return http.post(`/api/properties/${propertyId}/appointments`, input).then((r) => r.data as Appointment)
}

export function sendVerificationCode(phone: string): Promise<void> {
  return http.post('/api/sms/verification-codes', { phone }).then(() => undefined)
}

export function getWechatConfig(): Promise<WechatConfig> {
  return http.get('/api/config/wechat').then((r) => r.data as WechatConfig)
}

export function getFaq(): Promise<FaqListView> {
  return http.get('/api/config/faq').then((r) => r.data as FaqListView)
}

export function getViewingRules(): Promise<ViewingRulesView> {
  return http.get('/api/config/viewing-rules').then((r) => r.data as ViewingRulesView)
}

export function exchangeWechatSession(code: string): Promise<{ openid: string }> {
  return http.post('/api/wechat/session', { code }).then((r) => r.data as { openid: string })
}

export function getMyAppointments(page?: number): Promise<PageResult<MyAppointment>> {
  return http
    .get('/api/me/appointments', { params: page === undefined ? undefined : { page } })
    .then((r) => r.data as PageResult<MyAppointment>)
}

export function openDoor(id: number | string): Promise<void> {
  return http.post(`/api/me/appointments/${id}/open-door`).then(() => undefined)
}

export function adminListProperties(params: AdminPropertyQuery = {}): Promise<Property[]> {
  return http.get('/admin/api/properties', { params }).then((r) => r.data as Property[])
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

export function batchUpdatePropertyStatus(ids: number[], status: PropertyStatus): Promise<void> {
  return http.post('/admin/api/properties/batch-status', { ids, status }).then(() => undefined)
}

export function updatePropertyRentStatus(id: number | string, rentStatus: RentStatus): Promise<void> {
  return http.put(`/admin/api/properties/${id}/rent-status`, { rentStatus }).then(() => undefined)
}

export function getDailyPassword(propertyId: number | string, date: string): Promise<DailyPassword> {
  return http
    .get(`/admin/api/properties/${propertyId}/daily-passwords`, { params: { date } })
    .then((r) => r.data as DailyPassword)
}

export function upsertDailyPassword(
  propertyId: number | string,
  input: DailyPasswordInput
): Promise<DailyPassword> {
  return http
    .post(`/admin/api/properties/${propertyId}/daily-passwords`, input)
    .then((r) => r.data as DailyPassword)
}

export function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  return http.post('/admin/api/files', formData).then((r) => r.data as UploadResult)
}

export function adminListBuildings(): Promise<Building[]> {
  return http.get('/admin/api/buildings').then((r) => r.data as Building[])
}

export function adminGetBuilding(id: number | string): Promise<Building> {
  return http.get(`/admin/api/buildings/${id}`).then((r) => r.data as Building)
}

export function adminCreateBuilding(input: BuildingInput): Promise<Building> {
  return http.post('/admin/api/buildings', input).then((r) => r.data as Building)
}

export function adminUpdateBuilding(id: number | string, input: BuildingInput): Promise<Building> {
  return http.put(`/admin/api/buildings/${id}`, input).then((r) => r.data as Building)
}

export function adminDeleteBuilding(id: number | string): Promise<void> {
  return http.delete(`/admin/api/buildings/${id}`).then(() => undefined)
}

export function adminListAppointments(page?: number): Promise<PageResult<Appointment>> {
  return http
    .get('/admin/api/appointments', { params: page === undefined ? undefined : { page } })
    .then((r) => r.data as PageResult<Appointment>)
}

export function confirmAppointment(id: number | string): Promise<void> {
  return http.put(`/admin/api/appointments/${id}/confirm`).then(() => undefined)
}

export function rejectAppointment(id: number | string, reason: string): Promise<void> {
  return http.put(`/admin/api/appointments/${id}/reject`, { reason }).then(() => undefined)
}

export function resendAppointmentSms(id: number | string): Promise<Appointment> {
  return http.post(`/admin/api/appointments/${id}/resend-sms`).then((r) => r.data as Appointment)
}

export function adminGetWechatConfig(): Promise<WechatConfig> {
  return http.get('/admin/api/config/wechat').then((r) => r.data as WechatConfig)
}

export function adminUpdateWechatConfig(input: WechatConfigInput): Promise<WechatConfig> {
  return http.put('/admin/api/config/wechat', input).then((r) => r.data as WechatConfig)
}

export function adminGetFaq(): Promise<FaqListView> {
  return http.get('/admin/api/config/faq').then((r) => r.data as FaqListView)
}

export function adminUpdateFaq(input: FaqListView): Promise<FaqListView> {
  return http.put('/admin/api/config/faq', input).then((r) => r.data as FaqListView)
}

export function adminGetViewingRules(): Promise<ViewingRulesView> {
  return http.get('/admin/api/config/viewing-rules').then((r) => r.data as ViewingRulesView)
}

export function adminUpdateViewingRules(input: ViewingRulesView): Promise<ViewingRulesView> {
  return http.put('/admin/api/config/viewing-rules', input).then((r) => r.data as ViewingRulesView)
}
