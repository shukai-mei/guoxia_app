const STORAGE_KEY = 'adminAuth'

export interface AdminAuth {
  token: string
  expiresAt: string
}

export function saveAdminAuth(auth: AdminAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function getAdminAuthToken(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const auth = JSON.parse(raw) as AdminAuth
    if (!auth.token || !auth.expiresAt) {
      clearAdminAuth()
      return null
    }
    if (new Date(auth.expiresAt).getTime() <= Date.now()) {
      clearAdminAuth()
      return null
    }
    return auth.token
  } catch {
    clearAdminAuth()
    return null
  }
}

export function clearAdminAuth(): void {
  localStorage.removeItem(STORAGE_KEY)
}
