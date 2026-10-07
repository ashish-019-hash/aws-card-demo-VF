import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  DescriptionList,
  LoadingState,
  MessageBar,
  PageHeader,
  UserTypeBadge,
} from '../components/ui'
import { userMessages, type PageMessage } from '../features/users/messages'
import { UserSearchForm } from '../features/users/UserSearchForm'
import styles from '../features/users/users.module.css'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import { ApiError, api } from '../services/api'
import type { AsyncState } from '../types/async'
import type { AppUser } from '../types/user'

/** SCREEN-17 COUSR03 — fetch a user, review, then delete (STORY-024). */
export function UserDeletePage() {
  useDocumentTitle('User Delete')
  const navigate = useNavigate()
  const location = useLocation()
  const { userId: userIdParam } = useParams()
  const from = (location.state as { from?: string } | null)?.from
  const cameFromList = from === '/admin/users'

  const [lookup, setLookup] = useState<AsyncState<AppUser>>(
    userIdParam ? { status: 'loading' } : { status: 'idle' },
  )
  const [message, setMessage] = useState<PageMessage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  /** Ignores responses from superseded lookups. */
  const requestRef = useRef(0)

  const lookupUser = useCallback(async (userId: string) => {
    // RULE-VAL-080: a blank User ID never reaches here — userSearchSchema
    // rejects it with the legacy field message. RULE-VAL-079 (user must
    // exist) stays server-backed via the 404 mapping below.
    const key = userId.trim().toUpperCase()
    setMessage(null)
    setLookup({ status: 'loading' })
    const request = ++requestRef.current
    try {
      const user = await api.users.get(key)
      if (requestRef.current !== request) return
      setLookup({ status: 'success', data: user })
    } catch (error) {
      if (requestRef.current !== request) return
      setLookup({
        status: 'error',
        message:
          error instanceof ApiError && error.status === 404
            ? userMessages.userNotFound
            : userMessages.lookupFailed,
      })
    }
  }, [])

  useEffect(() => {
    if (userIdParam) void lookupUser(userIdParam)
    return () => {
      requestRef.current += 1
    }
  }, [userIdParam, lookupUser])

  const handleClear = () => {
    requestRef.current += 1
    setLookup({ status: 'idle' })
    setMessage(null)
    setDeleting(false)
    setResetKey((key) => key + 1)
  }

  const handleDelete = async (user: AppUser) => {
    setMessage(null)
    setDeleting(true)
    try {
      await api.users.delete(user.id)
      setLookup({ status: 'idle' })
      setResetKey((key) => key + 1)
      setMessage({ tone: 'success', text: userMessages.userDeleted(user.id) })
    } catch (error) {
      setMessage({
        tone: 'error',
        text:
          error instanceof ApiError && error.status === 404
            ? userMessages.userNotFound
            : error instanceof Error
              ? error.message
              : userMessages.lookupFailed,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell>
      <div className={styles.stack}>
        <PageHeader
          screen="COUSR03"
          title="User Delete"
          description="Fetch a user, review who they are, then delete them from the security file."
          actions={
            <Button variant="secondary" onClick={() => navigate(from ?? '/admin')}>
              {cameFromList ? 'Back to user list' : 'Back to admin menu'}
            </Button>
          }
        />
        {message ? (
          <MessageBar tone={message.tone} onDismiss={() => setMessage(null)}>
            {message.text}
          </MessageBar>
        ) : null}
        <Card title="Find a user">
          <UserSearchForm
            key={resetKey}
            initialUserId={userIdParam}
            loading={lookup.status === 'loading'}
            onSearch={lookupUser}
            onClear={handleClear}
          />
        </Card>
        {lookup.status === 'loading' ? (
          <Card>
            <LoadingState label="Loading user…" />
          </Card>
        ) : null}
        {lookup.status === 'error' ? <MessageBar tone="error">{lookup.message}</MessageBar> : null}
        {lookup.status === 'success' ? (
          <Card
            title="Confirm deletion"
            subtitle={`User ${lookup.data.id}`}
            footer={
              <>
                <span className={styles.footNote}>{userMessages.reviewThenDelete}</span>
                <div className={styles.footActions}>
                  <Button variant="secondary" onClick={() => navigate('/admin')}>
                    Cancel to admin menu
                  </Button>
                  <Button variant="danger" loading={deleting} onClick={() => handleDelete(lookup.data)}>
                    Delete user
                  </Button>
                </div>
              </>
            }
          >
            <DescriptionList
              columns={2}
              items={[
                { label: 'User ID', value: lookup.data.id, mono: true },
                { label: 'First name', value: lookup.data.firstName },
                { label: 'Last name', value: lookup.data.lastName },
                { label: 'User type', value: <UserTypeBadge userType={lookup.data.userType} /> },
              ]}
            />
            <MessageBar tone="warning" className={styles.reviewWarning}>
              This cannot be undone. {lookup.data.firstName} {lookup.data.lastName} will no longer be
              able to sign on to CardDemo.
            </MessageBar>
          </Card>
        ) : null}
      </div>
    </AppShell>
  )
}

export default UserDeletePage
