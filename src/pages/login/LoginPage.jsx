import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../../assets/logo1.png'
import { homePath } from '../../auth/access'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../lib/pageTitle'

export default function LoginPage() {
  usePageTitle('Tizimga kirish')
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    const result = await login(loginName, password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    navigate(homePath(result.user), { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">
          <span className="brand-logo">
            <img src={logo} alt="Buxoro viloyati ko'p tarmoqli tibbiyot markazi" />
          </span>
          <span className="brand-name">
            <span>Buxoro viloyati</span>
            <span>ko'p tarmoqli tibbiyot markazi</span>
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {error ? <p className="form-error">{error}</p> : null}
          <label>
            Login
            <input
              type="text"
              name="login"
              autoComplete="username"
              value={loginName}
              onChange={(event) => {
                setLoginName(event.target.value)
                setError('')
              }}
              placeholder="Login"
            />
          </label>
          <label>
            Parol
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
                placeholder="Parol"
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      d="M3.2 3.2 16.8 16.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.2 8.4A2.2 2.2 0 0 0 11.6 12M4.2 7.2C2.8 8.4 2 10 2 10s2.6 4.8 8 4.8c1.1 0 2.1-.2 3-.6M7.4 5.5A8 8 0 0 1 10 5.2C15.4 5.2 18 10 18 10a14 14 0 0 1-2.2 2.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      d="M2 10s2.6-4.8 8-4.8S18 10 18 10s-2.6 4.8-8 4.8S2 10 2 10Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>
      </section>
    </main>
  )
}
