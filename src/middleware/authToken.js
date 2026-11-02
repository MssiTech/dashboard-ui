import { TOKEN_KEY } from '../api/config'

export function authToken({ input, options }) {
  const headers = new Headers(options.headers || {})
  const token = localStorage.getItem(TOKEN_KEY)
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return { input, options: { ...options, headers } }
}
