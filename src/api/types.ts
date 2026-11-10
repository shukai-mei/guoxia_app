export type MediaType = 'SURROUNDING' | 'VIDEO' | 'GUIDE'
export type PropertyStatus = 'AVAILABLE' | 'OFF_SHELF'
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED'

export interface MediaItem {
  type: MediaType
  key: string
  url: string
  sortOrder: number
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
  status: PropertyStatus
  media: MediaItem[]
}

export interface Appointment {
  id: number
  propertyId: number
  propertyTitle: string
  tenantName: string
  phone: string
  preferredTime: string
  status: AppointmentStatus
  rejectReason: string | null
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

export interface PropertyInput {
  title: string
  location: string
  layout: string
  area: number
  rent: number
  description?: string
  contact: string
  media: MediaInput[]
}

export interface AppointmentInput {
  name: string
  phone: string
  preferredTime: string
}

export interface PropertyQuery {
  keyword?: string
  rentMin?: number
  rentMax?: number
}
