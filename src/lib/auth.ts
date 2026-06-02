import { appConfig } from '../config/app.config'

const SESSION_KEY = 'veai_authenticated'

export function validateCredentials(username: string, password: string): boolean {
  const trimmed = username.trim()
  return (
    trimmed === appConfig.auth.username &&
    password === appConfig.auth.password
  )
}

export function signIn(): void {
  sessionStorage.setItem(SESSION_KEY, 'true')
}

export function signOut(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}
