import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { ApiError } from '../api/client'
import { focusFirstInvalidField, hasErrors, required, type FieldErrors } from '../validation/rules'

const FIELD_ORDER = ['userId', 'password']

export function SignOnPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { message?: string } }

  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string | null>(location.state?.message ?? null)
  const [submitting, setSubmitting] = useState(false)

  function validate(): FieldErrors {
    return {
      // VR-001 / VR-002
      userId: required(userId, 'Please enter User ID ...'),
      password: required(password, 'Please enter Password ...'),
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const fieldErrors = validate()
    setErrors(fieldErrors)
    if (hasErrors(fieldErrors)) {
      focusFirstInvalidField(fieldErrors, FIELD_ORDER)
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const result = await signIn(userId.trim(), password)
      navigate(result.userType === 'A' ? '/admin' : '/menu', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setMessage(err.message)
      } else {
        setMessage('Unable to sign on. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COSGN00C" title="Sign On" />
      <MessageBar kind="error" message={message} />
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label htmlFor="userId">User ID</label>
          <input
            id="userId"
            aria-invalid={Boolean(errors.userId)}
            aria-describedby={errors.userId ? 'userId-error' : undefined}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            maxLength={8}
            autoFocus
          />
          <FieldError id="userId-error" message={errors.userId} />
        </div>
        <div className="form-row">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={8}
          />
          <FieldError id="password-error" message={errors.password} />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            Sign On
          </button>
        </div>
      </form>
    </div>
  )
}
