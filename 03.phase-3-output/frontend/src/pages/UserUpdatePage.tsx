import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { UserResponse } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { required, userType, type FieldErrors } from '../validation/rules'

export function UserUpdatePage() {
  const [searchParams] = useSearchParams()
  const [userId, setUserId] = useState(searchParams.get('userId') ?? '')
  const [user, setUser] = useState<UserResponse | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [type, setType] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null)

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

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    // VR-123..VR-126
    const fieldErrors: FieldErrors = {
      firstName: required(firstName, 'First Name can NOT be empty...'),
      lastName: required(lastName, 'Last Name can NOT be empty...'),
      password: required(password, 'Password can NOT be empty...'),
      userType: required(type, 'User Type can NOT be empty...') ?? userType(type, 'User Type must be A or U'),
    }
    setErrors(fieldErrors)
    if (Object.values(fieldErrors).some(Boolean)) return
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
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 400) {
        const be: FieldErrors = {}
        e2.errors.forEach((fe) => {
          be[fe.field] = fe.message
        })
        setErrors(be)
      }
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to update user.' })
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COUSR02C" title="Update User" />
      <MessageBar kind={message?.kind ?? 'error'} message={message?.text} />
      <form onSubmit={handleLookup} className="form">
        <div className="form-row">
          <label htmlFor="userId">User ID</label>
          <input id="userId" value={userId} onChange={(e) => setUserId(e.target.value)} maxLength={8} />
          <FieldError message={errors.userId} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      {user && (
        <form onSubmit={handleSave} className="form" data-testid="user-update-form">
          <div className="form-row">
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <FieldError message={errors.firstName} />
          </div>
          <div className="form-row">
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <FieldError message={errors.lastName} />
          </div>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={8} />
            <FieldError message={errors.password} />
          </div>
          <div className="form-row">
            <label htmlFor="userType">User Type (A/U)</label>
            <input id="userType" value={type} maxLength={1} onChange={(e) => setType(e.target.value)} />
            <FieldError message={errors.userType} />
          </div>
          <div className="form-actions">
            <button type="submit">F5 = Save</button>
          </div>
        </form>
      )}
      <BackLink to="/users" />
    </div>
  )
}
