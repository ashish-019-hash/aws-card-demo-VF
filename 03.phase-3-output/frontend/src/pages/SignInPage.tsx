import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionApi } from '../api/services'
import { setCsrfHeaderToken } from '../api/client'
import type { Session } from '../api/types'
import { ErrorMessage, SubmitButton } from '../components/ui'
export function SignInPage({ onSignIn }: { onSignIn: (session: Session) => void }) {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>()
  const [pending, setPending] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId.trim() || !password.trim()) {
      setError(new Error(!userId.trim() ? 'User ID is required.' : 'Password is required.'))
      return
    }
    setPending(true)
    setError(undefined)
    try {
      const session = await sessionApi.signIn(userId.toUpperCase(), password.toUpperCase())
      const csrf = (await sessionApi.csrf()) as { token: string }
      setCsrfHeaderToken(csrf.token)
      onSignIn(session)
      navigate('/')
    } catch (cause) {
      setError(cause)
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">CARD SERVICES</p>
        <h1>Welcome to CardDemo</h1>
        <p>Securely manage credit-card accounts, transactions, payments, and user access.</p>
        <form onSubmit={submit} noValidate>
          <ErrorMessage error={error} />
          <label>
            User ID
            <input
              autoComplete="username"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              maxLength={8}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={8}
            />
          </label>
          <SubmitButton pending={pending}>Sign in</SubmitButton>
        </form>
        <aside className="credentials">
          <strong>Local development accounts</strong>
          <span>Administrator: ADMIN001 / ADMIN123</span>
          <span>Standard user: USER0001 / USER123</span>
        </aside>
      </section>
    </div>
  )
}
