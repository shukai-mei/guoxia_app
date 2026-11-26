import { ApiError } from '../api/http'

export function errorMessageOf(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }
  return '操作失败，请稍后重试'
}

export function isPropertyUnavailableError(code: number | null | undefined): boolean {
  return code === 40901 || code === 40902
}

export function isShelfDeviceBlockedError(code: number | null | undefined): boolean {
  return code === 40903
}
