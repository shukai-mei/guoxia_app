import { http } from '../api/http'

const STORAGE_KEY = 'viewerIdentity'

let initPromise: Promise<string> | null = null

function generatePseudoIdentity(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function getOrCreateIdentity(): string {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) {
    return existing
  }
  const created = generatePseudoIdentity()
  localStorage.setItem(STORAGE_KEY, created)
  return created
}

function persistIdentity(value: string): void {
  localStorage.setItem(STORAGE_KEY, value)
}

async function exchangeOpenid(code: string): Promise<string> {
  const response = await http.post('/api/wechat/session', { code })
  const data = response.data as { openid?: string }
  if (!data || !data.openid) {
    throw new Error('微信登录凭证换取失败')
  }
  return data.openid
}

function initializeIdentity(): Promise<string> {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) {
    return Promise.resolve(existing)
  }
  const wxcode = new URLSearchParams(window.location.search).get('wxcode')
  if (!wxcode) {
    return Promise.resolve(getOrCreateIdentity())
  }
  return exchangeOpenid(wxcode)
    .then((openid) => {
      persistIdentity(openid)
      return openid
    })
    .catch(() => getOrCreateIdentity())
}

export function ensureIdentityInitialized(): Promise<string> {
  if (!initPromise) {
    initPromise = initializeIdentity()
  }
  return initPromise
}
