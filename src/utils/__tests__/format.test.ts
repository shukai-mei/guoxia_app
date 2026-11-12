import { describe, expect, it } from 'vitest'
import { formatDateTime, formatTime, toApiDateTime, toDateString } from '../format'

describe('formatDateTime', () => {
  it('formats ISO datetime to readable form', () => {
    expect(formatDateTime('2026-11-15T10:30:00')).toBe('2026-11-15 10:30')
  })

  it('keeps already formatted datetime', () => {
    expect(formatDateTime('2026-11-15 10:30:00')).toBe('2026-11-15 10:30')
  })

  it('returns empty string for missing value', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
  })

  it('passes through unparseable values', () => {
    expect(formatDateTime('tomorrow')).toBe('tomorrow')
  })
})

describe('toApiDateTime', () => {
  it('formats Date to yyyy-MM-dd HH:mm:ss', () => {
    expect(toApiDateTime(new Date(2026, 10, 15, 9, 5, 3))).toBe('2026-11-15 09:05:03')
  })

  it('passes through string values', () => {
    expect(toApiDateTime('2026-11-15 10:30:00')).toBe('2026-11-15 10:30:00')
  })
})

describe('formatTime', () => {
  it('extracts HH:mm from ISO datetime', () => {
    expect(formatTime('2026-11-15T10:30:00')).toBe('10:30')
  })

  it('keeps plain HH:mm values', () => {
    expect(formatTime('09:05')).toBe('09:05')
  })

  it('returns empty string for missing value', () => {
    expect(formatTime(null)).toBe('')
    expect(formatTime(undefined)).toBe('')
    expect(formatTime('')).toBe('')
  })
})

describe('toDateString', () => {
  it('formats Date to yyyy-MM-dd', () => {
    expect(toDateString(new Date(2026, 10, 15))).toBe('2026-11-15')
  })

  it('pads month and day', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
