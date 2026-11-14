export type MediaType = 'SURROUNDING' | 'VIDEO'
export type PropertyStatus = 'AVAILABLE' | 'OFF_SHELF'
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED'
export type ConfirmChannel = 'MANUAL' | 'AUTO'
export type SmsStatus = 'SENT' | 'FAILED'

export interface MediaItem {
  type: MediaType
  key: string
  url: string
  sortOrder: number
}

export interface BuildingMediaItem {
  key: string
  url: string
  sortOrder: number
}

export interface BuildingInfo {
  id: number
  name: string
  address: string
  hasElevator: boolean | null
  totalFloors: number | null
  elevatorRatio: string | null
  deliveryFacilities: string | null
  livingExperience: string | null
  media: BuildingMediaItem[]
}

export interface Property {
  id: number
  title: string
  location: string
  layout: string
  area: number
  rent: number
  description: string | null
  contact: string
  buildingId: number | null
  building: BuildingInfo | null
  ttlockLockId?: string | null
  status: PropertyStatus
  media: MediaItem[]
}

export interface Building {
  id: number
  name: string
  address: string
  hasElevator: boolean | null
  totalFloors: number | null
  elevatorRatio: string | null
  deliveryFacilities: string | null
  livingExperience: string | null
  slotStartTime: string
  slotEndTime: string
  slotDurationMinutes: number
  accessDeviceSerial?: string | null
  media: BuildingMediaItem[]
}

export interface Slot {
  start: string
  end: string
  available: boolean
}

export interface SlotList {
  propertyId: number
  buildingId: number | null
  buildingName: string | null
  supported: boolean
  slots: Slot[]
}

export interface DailyPassword {
  propertyId: number
  date: string
  passwordSet: boolean
}

export interface WechatConfig {
  contact: string | null
  qrObjectKey: string | null
  qrUrl: string | null
}

export interface Appointment {
  id: number
  propertyId: number
  propertyTitle: string
  tenantName: string
  phone: string
  slotStart: string
  slotEnd: string
  confirmChannel: ConfirmChannel | null
  bookingSmsStatus: SmsStatus | null
  passwordSmsStatus: SmsStatus | null
  passwordSet: boolean
  status: AppointmentStatus
  rejectReason: string | null
  createdAt: string
}

export interface MyAppointment {
  id: number
  propertyId: number
  propertyTitle: string
  tenantName: string
  phone: string
  slotStart: string
  slotEnd: string
  status: AppointmentStatus
  rejectReason: string | null
  passcode?: string | null
  canOpenDoor: boolean
  doorSupported: boolean
  lockSupported: boolean
  buildingName: string | null
  buildingAddress: string | null
  propertyLocation: string | null
  propertyLayout: string | null
  createdAt: string
}

export interface UploadResult {
  key: string
  url: string
}

export interface MediaInput {
  type: MediaType
  key: string
  sortOrder: number
}

export interface BuildingMediaInput {
  key: string
  sortOrder: number
}

export interface PropertyInput {
  title: string
  location: string
  layout: string
  area: number
  rent: number
  description?: string
  contact: string
  buildingId: number
  ttlockLockId?: string
  media: MediaInput[]
}

export interface BuildingInput {
  name: string
  address: string
  hasElevator?: boolean
  totalFloors?: number
  elevatorRatio?: string
  deliveryFacilities?: string
  livingExperience?: string
  slotStartTime: string
  slotEndTime: string
  slotDurationMinutes: number
  accessDeviceSerial?: string
  media: BuildingMediaInput[]
}

export interface AppointmentInput {
  name: string
  phone: string
  code: string
  date: string
  slotStart: string
  slotEnd: string
}

export interface DailyPasswordInput {
  date: string
  password: string
}

export interface WechatConfigInput {
  contact?: string
  qrObjectKey?: string
}

export interface PropertyQuery {
  keyword?: string
  rentMin?: number
  rentMax?: number
}
