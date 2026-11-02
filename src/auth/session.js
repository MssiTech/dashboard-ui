import { TOKEN_KEY, USER_KEY } from '../api/config'

export function readUser() {
  const saved = localStorage.getItem(USER_KEY)
  if (!saved) return null
  try {
    return JSON.parse(saved)
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function saveSession(token, profile) {
  const groups = Array.isArray(profile.groups)
    ? profile.groups
    : profile.group
      ? [profile.group]
      : []
  const nextUser = {
    id: profile.id,
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    groups,
  }
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  return nextUser
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(USER_KEY)
}
