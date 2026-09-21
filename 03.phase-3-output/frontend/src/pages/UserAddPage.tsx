import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { required, userType, type FieldErrors } from '../validation/rules'

export function UserAddPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [type, setType] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // VR-116..VR-120
    const fieldErrors: FieldErrors = {
      firstName: required(firstName, 'First Name can NOT be empty...'),
      lastName: required(lastName, 'Last Name can NOT be empty...'),
      userId: required(userId, 'User ID can NOT be empty...'),
      password: required(password, 'Password can NOT be empty...'),
      userType: required(type, 'User Type can NOT be empty...') ?? userType(type, 'User Type must be A or U'),
    }
    setErrors(fieldErrors)
    if (Object.values(fieldErrors).some(Boolean)) return
    try {
      await endpoints.createUser({
        userId: userId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: password.trim(),
        userType: type.trim(),
      })
      setMessage({ kind: 'success', text: 'User has been added ...' })
      setTimeout(() => navigate('/users'), 800)
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 400) {
        const be: FieldErrors = {}
        e2.errors.forEach((fe) => {
          be[fe.field] = fe.message
        })
        setErrors(be)
      }
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to add user.' })
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COUSR01C" title="Add User" />
      <MessageBar kind={message?.kind ?? 'error'} message={message?.text} />
      <form onSubmit={handleSubmit} className="form" data-testid="user-add-form">
        <div className="form-row">
          <label htmlFor="userId">User ID</label>
          <input id="userId" value={userId} onChange={(e) => setUserId(e.target.value)} maxLength={8} />
          <FieldError message={errors.userId} />
        </div>
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
      <BackLink to="/users" />
    </div>
  )
}
