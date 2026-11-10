export const PHONE_RE = /^1[3-9]\d{9}$/

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
export const VIDEO_EXTENSIONS = ['mp4']

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024

export function fileExtensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  if (index < 0 || index === name.length - 1) {
    return ''
  }
  return name.slice(index + 1).toLowerCase()
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value)
}

export function mediaKindOf(fileName: string): 'image' | 'video' | null {
  const ext = fileExtensionOf(fileName)
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return 'image'
  }
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return 'video'
  }
  return null
}

export function validateMediaFile(file: File): string | null {
  const kind = mediaKindOf(file.name)
  if (kind === null) {
    return '仅支持 jpg/jpeg/png/webp 图片与 mp4 视频'
  }
  if (kind === 'image' && file.size > IMAGE_MAX_BYTES) {
    return '图片大小不能超过 10MB'
  }
  if (kind === 'video' && file.size > VIDEO_MAX_BYTES) {
    return '视频大小不能超过 100MB'
  }
  return null
}

export function isPositiveNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
  }
  if (typeof value === 'string') {
    const num = Number(value)
    return value.trim() !== '' && Number.isFinite(num) && num > 0
  }
  return false
}
