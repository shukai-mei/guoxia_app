import { describe, expect, it } from 'vitest'
import {
  fileExtensionOf,
  IMAGE_MAX_BYTES,
  isValidPhone,
  mediaKindOf,
  PHONE_RE,
  validateMediaFile,
  VIDEO_MAX_BYTES
} from '../validate'

describe('isValidPhone', () => {
  it('accepts 11-digit mainland mobile numbers', () => {
    expect(isValidPhone('13800138000')).toBe(true)
    expect(isValidPhone('19912345678')).toBe(true)
  })

  it('rejects malformed numbers', () => {
    expect(isValidPhone('12800138000')).toBe(false)
    expect(isValidPhone('1380013800')).toBe(false)
    expect(isValidPhone('138001380001')).toBe(false)
    expect(isValidPhone('abcdefghijk')).toBe(false)
    expect(isValidPhone('')).toBe(false)
  })

  it('PHONE_RE matches 11-digit mainland mobile numbers', () => {
    expect(PHONE_RE.test('13800138000')).toBe(true)
    expect(PHONE_RE.test('12800138000')).toBe(false)
  })
})

describe('fileExtensionOf', () => {
  it('extracts lowercase extension', () => {
    expect(fileExtensionOf('a.JPG')).toBe('jpg')
    expect(fileExtensionOf('b.Mp4')).toBe('mp4')
    expect(fileExtensionOf('c.webp')).toBe('webp')
  })

  it('returns empty string without extension', () => {
    expect(fileExtensionOf('noext')).toBe('')
    expect(fileExtensionOf('trailing.')).toBe('')
  })
})

describe('mediaKindOf', () => {
  it('classifies image extensions', () => {
    expect(mediaKindOf('a.jpg')).toBe('image')
    expect(mediaKindOf('a.jpeg')).toBe('image')
    expect(mediaKindOf('a.png')).toBe('image')
    expect(mediaKindOf('a.webp')).toBe('image')
  })

  it('classifies video extensions', () => {
    expect(mediaKindOf('a.mp4')).toBe('video')
  })

  it('returns null for unsupported extensions', () => {
    expect(mediaKindOf('a.gif')).toBeNull()
    expect(mediaKindOf('a.txt')).toBeNull()
    expect(mediaKindOf('a')).toBeNull()
  })
})

function fileWithSize(name: string, size: number): File {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateMediaFile', () => {
  it('accepts valid images under limit', () => {
    expect(validateMediaFile(fileWithSize('a.jpg', 1024))).toBeNull()
    expect(validateMediaFile(fileWithSize('a.webp', IMAGE_MAX_BYTES))).toBeNull()
  })

  it('accepts valid videos under limit', () => {
    expect(validateMediaFile(fileWithSize('a.mp4', VIDEO_MAX_BYTES))).toBeNull()
  })

  it('rejects unsupported types', () => {
    expect(validateMediaFile(fileWithSize('a.gif', 1024))).toBe('仅支持 jpg/jpeg/png/webp 图片与 mp4 视频')
    expect(validateMediaFile(fileWithSize('a.txt', 1024))).toBe('仅支持 jpg/jpeg/png/webp 图片与 mp4 视频')
  })

  it('rejects oversized images', () => {
    expect(validateMediaFile(fileWithSize('a.png', IMAGE_MAX_BYTES + 1))).toBe('图片大小不能超过 10MB')
  })

  it('rejects oversized videos', () => {
    expect(validateMediaFile(fileWithSize('a.mp4', VIDEO_MAX_BYTES + 1))).toBe('视频大小不能超过 100MB')
  })
})
