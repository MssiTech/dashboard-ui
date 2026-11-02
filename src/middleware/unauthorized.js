import { clearSession } from '../auth/session'

export const UNAUTHORIZED_EVENT = 'monitor:unauthorized'

export function unauthorized(response) {
  if (response.status !== 401) return
  clearSession()
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
}
