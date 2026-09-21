import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { UserResponse } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar, type Message } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { focusFirstInvalidField, hasErrors, required, userType, type FieldErrors } from '../validation/rules'

const KNOWN_USER_FIELDS: readonly string[] = ['userId', 'firstName', 'lastName', 'password', 'userType']
const FIELD_ORDER = ['firstName', 'lastName', 'password', 'userType']

export function UserUpdatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [userId, setUserId] = useState(searchParams.get('userId') ?? '')
  const [user, setUser] = useState<UserResponse | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [type, setType] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<Message | null>(null)

  async function handleLookup(e: FormEvent) {
    e.preventDefault()
    const err = required(userId, 'User ID can NOT be empty...')
    setErrors({ userId: err })
    if (err) return
    try {
      const found = await endpoints.getUser(userId.trim())
      setUser(found)
      setFirstName(found.firstName ?? '')
      setLastName(found.lastName ?? '')
      setType(found.userType ?? '')
      setPassword('')
      setMessage(null)
    } catch (e2) {
      setUser(null)
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to load user.' })
    }
  }

  // Shared by PF5 (save, stay on screen) and PF3 (save, then return to COADM01C).
  // Returns whether the save succeeded, so PF3's handler knows whether to navigate away.
  async function saveUser(): Promise<boolean> {
    if (!user) return false
    // VR-123..VR-126
    const fieldErrors: FieldErrors = {
      firstName: required(firstName, 'First Name can NOT be empty...'),
      lastName: required(lastName, 'Last Name can NOT be empty...'),
      password: required(password, 'Password can NOT be empty...'),
      userType: required(type, 'User Type can NOT be empty...') ?? userType(type, 'User Type must be A or U'),
    }
    setErrors(fieldErrors)
    if (hasErrors(fieldErrors)) {
      focusFirstInvalidField(fieldErrors, FIELD_ORDER)
      return false
    }
    try {
      const updated = await endpoints.updateUser(user.userId, {
        userId: user.userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: password.trim(),
        userType: type.trim(),
      })
      setUser(updated)
      setMessage({ kind: 'success', text: 'User has been updated ...' })
      return true
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 400) {
        const { fieldErrors, unmapped } = e2.fieldErrors(KNOWN_USER_FIELDS)
        setErrors(fieldErrors)
        setMessage({ kind: 'error', text: unmapped.length ? `${e2.message} ${unmapped.join(' ')}` : e2.message })
        return false
      }
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to update user.' })
      return false
    }
  }

  // PF5 (COUSR02C): save and stay on the update screen.
  async function handleSave(e: FormEvent) {
    e.preventDefault()
    await saveUser()
  }

  // PF3 (COUSR02C): save, then return to the previous (Admin Menu) screen.
  async function handleSaveAndExit() {
    if (await saveUser()) navigate('/users')
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COUSR02C" title="Update User" />
      <MessageBar kind={message?.kind ?? 'error'} message={message?.text} />
      <form onSubmit={handleLookup} className="form">
        <div className="form-row">
          <label htmlFor="userId">User ID</label>
          <input id="userId" aria-invalid={Boolean(errors.userId)} aria-describedby={errors.userId ? 'userId-error' : undefined} value={userId} onChange={(e) => setUserId(e.target.value)} maxLength={8} />
          <FieldError id="userId-error" message={errors.userId} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      {user && (
        <form onSubmit={handleSave} className="form" data-testid="user-update-form">
          <div className="form-row">
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" aria-invalid={Boolean(errors.firstName)} aria-describedby={errors.firstName ? 'firstName-error' : undefined} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <FieldError id="firstName-error" message={errors.firstName} />
          </div>
          <div className="form-row">
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" aria-invalid={Boolean(errors.lastName)} aria-describedby={errors.lastName ? 'lastName-error' : undefined} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <FieldError id="lastName-error" message={errors.lastName} />
          </div>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input id="password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={8} />
            <FieldError id="password-error" message={errors.password} />
          </div>
          <div className="form-row">
            <label htmlFor="userType">User Type (A/U)</label>
            <input id="userType" aria-invalid={Boolean(errors.userType)} aria-describedby={errors.userType ? 'userType-error' : undefined} value={type} maxLength={1} onChange={(e) => setType(e.target.value)} />
            <FieldError id="userType-error" message={errors.userType} />
          </div>
          <div className="form-actions">
            <button type="submit">F5 = Save</button>
            <button type="button" onClick={() => void handleSaveAndExit()}>
              F3 = Save and Exit
            </button>
          </div>
        </form>
      )}
      <BackLink to="/users" label="F12 = Cancel" />
    </div>
  )
}
