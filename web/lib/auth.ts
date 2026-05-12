import type { User } from './types'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sf_token')
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('sf_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem('sf_token', token)
  localStorage.setItem('sf_user', JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem('sf_token')
  localStorage.removeItem('sf_user')
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
