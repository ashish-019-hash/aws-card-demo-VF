import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { UserSummary } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { BackLink } from '../components/BackLink'

export function UserListPage() {
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<UserSummary[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async (targetPage: number) => {
    try {
      const response = await endpoints.listUsers({ page: targetPage })
      setItems(response.items)
      setHasNext(response.hasNext)
      setHasPrevious(response.hasPrevious)
      setPage(targetPage)
      setMessage(response.items.length === 0 ? 'No users found.' : null)
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Unable to load users.')
    }
  }, [])

  useEffect(() => {
    void load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen">
      <ScreenHeader screenId="COUSR00C" title="List Users" />
      <MessageBar kind="error" message={message} />
      <div className="form-actions">
        <Link to="/users/add">Add User</Link>
      </div>
      <table className="data-table" data-testid="user-list">
        <thead>
          <tr>
            <th>User ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.userId}>
              <td>{u.userId}</td>
              <td>{u.firstName}</td>
              <td>{u.lastName}</td>
              <td>{u.userType}</td>
              <td>
                <Link to={`/users/update?userId=${u.userId}`}>U = Update</Link>{' '}
                <Link to={`/users/delete?userId=${u.userId}`}>D = Delete</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="form-actions">
        <button type="button" disabled={!hasPrevious} onClick={() => void load(page - 1)}>
          F7 = Prev Page
        </button>
        <button type="button" disabled={!hasNext} onClick={() => void load(page + 1)}>
          F8 = Next Page
        </button>
      </div>
      <BackLink to="/admin" />
    </div>
  )
}
