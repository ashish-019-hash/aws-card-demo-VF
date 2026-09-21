import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { UserResponse } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { required } from '../validation/rules'

export function UserDeletePage() {
  const [searchParams] = useSearchParams()
  const [userId, setUserId] = useState(searchParams.get('userId') ?? '')
  const [user, setUser] = useState<UserResponse | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  async function handleLookup(e: FormEvent) {
    e.preventDefault()
    // VR-127
    const err = required(userId, 'User ID can NOT be empty...')
    setFieldError(err)
    if (err) return
    try {
      const found = await endpoints.getUser(userId.trim())
      setUser(found)
      setMessage(null)
    } catch (e2) {
      setUser(null)
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to load user.' })
    }
  }

  async function handleDelete() {
    if (!user) return
    try {
      await endpoints.deleteUser(user.userId)
      setMessage({ kind: 'success', text: 'User has been deleted ...' })
      setUser(null)
      setUserId('')
    } catch (e2) {
      setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to delete user.' })
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COUSR03C" title="Delete User" />
      <MessageBar kind={message?.kind ?? 'error'} message={message?.text} />
      <form onSubmit={handleLookup} className="form">
        <div className="form-row">
          <label htmlFor="userId">User ID</label>
          <input id="userId" value={userId} onChange={(e) => setUserId(e.target.value)} maxLength={8} />
          <FieldError message={fieldError} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      {user && (
        <>
          <dl className="detail-grid" data-testid="user-delete-detail">
            <dt>User ID</dt>
            <dd>{user.userId}</dd>
            <dt>First Name</dt>
            <dd>{user.firstName}</dd>
            <dt>Last Name</dt>
            <dd>{user.lastName}</dd>
            <dt>User Type</dt>
            <dd>{user.userType}</dd>
          </dl>
          <div className="form-actions" data-testid="confirm-actions">
            <button type="button" onClick={() => void handleDelete()}>
              F5 = Delete
            </button>
          </div>
        </>
      )}
      <BackLink to="/users" />
    </div>
  )
}
