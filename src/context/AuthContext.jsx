import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clearSession, readUser, saveSession } from '../auth/session'
import { BASE_URL, TOKEN_KEY, apiFetch } from '../api/index.js'
import { UNAUTHORIZED_EVENT } from '../middleware/unauthorized'

const AuthContext = createContext(null)

async function errorMessage(response, fallback) {
  try {
    const data = await response.json()
    if (Array.isArray(data.error) && data.error[0]) return String(data.error[0])
    if (typeof data.error === 'string') return data.error
    if (typeof data.detail === 'string') return data.detail
  } catch {
    // Javob JSON emas.
  }
  return fallback
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setReady(true)
      return undefined
    }

    let cancelled = false
    apiFetch(`${BASE_URL}/api/authen/profile/`)
      .then(async (response) => {
        if (cancelled) return
        if (response.status === 401) {
          clearSession()
          setUser(null)
          return
        }
        if (!response.ok) {
          setUser(readUser())
          return
        }
        const profile = await response.json()
        setUser(saveSession(token, profile))
      })
      .catch(() => {
        if (!cancelled) setUser(readUser())
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onUnauthorized() {
      clearSession()
      setUser(null)
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(loginName, password) {
        const username = loginName.trim()
        if (!username || !password.trim()) {
          return { ok: false, message: 'Login va parolni kiriting.' }
        }

        let response
        try {
          response = await fetch(`${BASE_URL}/api/authen/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })
        } catch {
          return { ok: false, message: 'Serverga ulanib bo‘lmadi.' }
        }

        if (!response.ok) {
          return {
            ok: false,
            message: await errorMessage(response, 'Login yoki parol noto‘g‘ri.'),
          }
        }

        const tokens = await response.json()
        if (!tokens.access) {
          return { ok: false, message: 'Token olinmadi.' }
        }

        localStorage.setItem(TOKEN_KEY, tokens.access)
        let profileResponse
        try {
          profileResponse = await apiFetch(`${BASE_URL}/api/authen/profile/`)
        } catch {
          clearSession()
          return { ok: false, message: 'Profil yuklanmadi.' }
        }

        if (!profileResponse.ok) {
          clearSession()
          return { ok: false, message: 'Profil yuklanmadi.' }
        }

        const profile = await profileResponse.json()
        const nextUser = saveSession(tokens.access, profile)
        setUser(nextUser)
        return { ok: true, user: nextUser }
      },
      logout() {
        clearSession()
        setUser(null)
      },
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth AuthProvider ichida ishlatilishi kerak')
  }
  return context
}
