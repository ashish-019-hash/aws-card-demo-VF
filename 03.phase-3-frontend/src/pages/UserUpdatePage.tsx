import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, LoadingState, MessageBar, PageHeader } from '../components/ui'
import { userMessages, type PageMessage } from '../features/users/messages'
import { UserForm, type UserFormValues } from '../features/users/UserForm'
import { UserSearchForm } from '../features/users/UserSearchForm'
import styles from '../features/users/users.module.css'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import { ApiError, api } from '../services/api'
import type { AsyncState } from '../types/async'
import type { AppUser } from '../types/user'

/** SCREEN-16 COUSR02 — fetch a user and change name, password or type (STORY-023). */
export function UserUpdatePage() {
  useDocumentTitle('User Update')
  const navigate = useNavigate()
  const location = useLocation()
  const { userId: userIdParam } = useParams()
  const from = (location.state as { from?: string } | null)?.from
  const cameFromList = from === '/admin/users'

  const [lookup, setLookup] = useState<AsyncState<AppUser>>(
    userIdParam ? { status: 'loading' } : { status: 'idle' },
  )
  const [baseline, setBaseline] = useState<UserFormValues | null>(null)
  const [message, setMessage] = useState<PageMessage | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchCount, setFetchCount] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  /** Ignores responses from superseded lookups. */
  const requestRef = useRef(0)

  const lookupUser = useCallback(async (userId: string) => {
    // RULE-VAL-077: a blank User ID never reaches here — userSearchSchema
    // rejects it with the legacy field message. RULE-VAL-079 (user must
    // exist) stays server-backed via the 404 mapping below.
    const key = userId.trim().toUpperCase()
    setMessage(null)
    setBaseline(null)
    setLookup({ status: 'loading' })
    const request = ++requestRef.current
    try {
      const user = await api.users.get(key)
      if (requestRef.current !== request) return
      setLookup({ status: 'success', data: user })
      setBaseline({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        // The API never returns the stored password; the field starts blank.
        password: '',
        userType: user.userType,
      })
      setFetchCount((count) => count + 1)
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

  // A route userId change within this same mounted component supersedes any
  // in-flight save (the effect cleanup below bumps requestRef, so its
  // completion is ignored) — the busy flag must be released too or the
  // controls would stay locked forever. Adjusted during render, per React's
  // prior-render-state pattern, instead of synchronously inside the effect.
  const [renderedUserId, setRenderedUserId] = useState(userIdParam)
  if (renderedUserId !== userIdParam) {
    setRenderedUserId(userIdParam)
    setSaving(false)
    if (!userIdParam) {
      setLookup({ status: 'idle' })
      setBaseline(null)
    }
  }

  useEffect(() => {
    if (userIdParam) {
      void lookupUser(userIdParam)
    }
    return () => {
      requestRef.current += 1
    }
  }, [userIdParam, lookupUser])

  const handleClear = () => {
    requestRef.current += 1
    setLookup({ status: 'idle' })
    setBaseline(null)
    setMessage(null)
    setSaving(false)
    setResetKey((key) => key + 1)
  }

  const handleSave = async (values: UserFormValues) => {
    if (!baseline) return
    // RULE-VAL-077/078 required fields (and the backend 8-72 password length)
    // are enforced field-level by userUpdateSchema before this handler runs.
    // RULE-VAL-081 (no-change detection) stays page-level: the stored password
    // is never returned by the API and a password must always be typed, so
    // only the backend can tell a real change from a same-values resubmit —
    // its "must change" 400 is mapped to the documented message below.
    setMessage(null)
    setSaving(true)
    // A Clear, a newer lookup or an unmount bumps requestRef; this save's
    // completion must not overwrite that newer screen state.
    const request = requestRef.current
    try {
      const updated = await api.users.update(baseline.userId, {
        firstName: values.firstName,
        lastName: values.lastName,
        password: values.password,
        userType: values.userType === 'A' ? 'A' : 'U',
      })
      if (requestRef.current !== request) return
      setLookup({ status: 'success', data: updated })
      setBaseline({
        userId: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        password: '',
        userType: updated.userType,
      })
      // Remount the form so the submitted password is not kept on screen.
      setFetchCount((count) => count + 1)
      setMessage({ tone: 'success', text: userMessages.userUpdated(updated.id) })
    } catch (error) {
      if (requestRef.current !== request) return
      if (error instanceof ApiError && error.status === 404) {
        setMessage({ tone: 'error', text: userMessages.userNotFound })
      } else if (
        error instanceof ApiError &&
        error.status === 400 &&
        /must change/i.test(error.message)
      ) {
        // Same password re-entered with no other change (backend no-change check).
        setMessage({ tone: 'warning', text: userMessages.noChange })
      } else {
        setMessage({
          tone: 'error',
          text: error instanceof Error ? error.message : userMessages.lookupFailed,
        })
      }
    } finally {
      if (requestRef.current === request) setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className={styles.stack}>
        <PageHeader
          screen="COUSR02"
          title="User Update"
          description="Fetch a user, change their name, password or type, then save."
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
            disabled={saving}
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
        {lookup.status === 'success' && baseline ? (
          <UserForm
            key={`${baseline.userId}-${fetchCount}`}
            mode="update"
            title="User details"
            subtitle={`User ${baseline.userId}`}
            defaultValues={baseline}
            submitLabel="Save changes"
            submitting={saving}
            footerNote={userMessages.pressSaveToUpdate}
            secondaryActions={
              <Button variant="secondary" onClick={() => navigate('/admin')}>
                Cancel to admin menu
              </Button>
            }
            onSubmit={handleSave}
          />
        ) : null}
      </div>
    </AppShell>
  )
}

export default UserUpdatePage
