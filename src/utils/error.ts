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
