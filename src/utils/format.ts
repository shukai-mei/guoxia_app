function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  const normalized = value.replace('T', ' ')
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
  if (!match) {
    return value
  }
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`
}

export function toApiDateTime(value: Date | string): string {
  if (typeof value === 'string') {
    return value
  }
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())} ${pad2(
    value.getHours()
  )}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`
}
