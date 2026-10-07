import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  DataTable,
  MessageBar,
  PageHeader,
  Pagination,
  UserTypeBadge,
  type DataTableColumn,
} from '../components/ui'
import { userMessages, type PageMessage } from '../features/users/messages'
import { fetchUserPage, USERS_PAGE_SIZE, type UserListResult } from '../features/users/service'
import { UserListFilterForm } from '../features/users/UserListFilterForm'
import styles from '../features/users/users.module.css'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import type { AsyncState } from '../types/async'
import type { AppUser } from '../types/user'

const columns: Array<DataTableColumn<AppUser>> = [
  { key: 'id', header: 'User ID', cell: (user) => user.id, mono: true },
  { key: 'firstName', header: 'First name', cell: (user) => user.firstName },
  { key: 'lastName', header: 'Last name', cell: (user) => user.lastName },
  { key: 'type', header: 'Type', cell: (user) => <UserTypeBadge userType={user.userType} /> },
]

/** SCREEN-14 COUSR00 — browse application users ten per page (STORY-020/021). */
export function UserListPage() {
  useDocumentTitle('User List')
  const navigate = useNavigate()
  const [listState, setListState] = useState<AsyncState<UserListResult>>({ status: 'loading' })
  const [message, setMessage] = useState<PageMessage | null>(null)
  const filterRef = useRef('')
  /** Ignores responses from superseded requests. */
  const requestRef = useRef(0)

  const load = useCallback((startUserId: string, page: number) => {
    const request = ++requestRef.current
    setListState({ status: 'loading' })
    fetchUserPage(startUserId, page)
      .then((data) => {
        if (requestRef.current === request) setListState({ status: 'success', data })
      })
      .catch(() => {
        if (requestRef.current === request) {
          setListState({ status: 'error', message: userMessages.lookupFailed })
        }
      })
  }, [])

  useEffect(() => {
    load('', 1)
    return () => {
      requestRef.current += 1
    }
  }, [load])

  const handleApply = (userId: string) => {
    filterRef.current = userId
    setMessage(null)
    load(userId, 1)
  }

  const handlePrevious = () => {
    if (listState.status !== 'success') return
    if (!listState.data.hasPrevious) {
      setMessage({ tone: 'info', text: userMessages.listAtTop })
      return
    }
    setMessage(null)
    load(filterRef.current, listState.data.page - 1)
  }

  const handleNext = () => {
    if (listState.status !== 'success') return
    if (!listState.data.hasNext) {
      setMessage({ tone: 'info', text: userMessages.listAtBottom })
      return
    }
    setMessage(null)
    load(filterRef.current, listState.data.page + 1)
  }

  return (
    <AppShell>
      <div className={styles.stack}>
        <PageHeader
          screen="COUSR00"
          title="User List"
          description="Browse application users ten per page. Enter a user ID to start the list from it."
          actions={
            <>
              <Button onClick={() => navigate('/admin/users/add')}>Add user</Button>
              <Button variant="secondary" onClick={() => navigate('/admin')}>
                Back to menu
              </Button>
            </>
          }
        />
        {message ? (
          <MessageBar tone={message.tone} onDismiss={() => setMessage(null)}>
            {message.text}
          </MessageBar>
        ) : null}
        <Card title="Filter">
          <UserListFilterForm loading={listState.status === 'loading'} onApply={handleApply} />
        </Card>
        <Card
          flush
          title="Users"
          subtitle={
            listState.status === 'success'
              ? `Page ${listState.data.page} · ${USERS_PAGE_SIZE} per page`
              : undefined
          }
        >
          <DataTable
            caption="Application users"
            columns={columns}
            rows={listState.status === 'success' ? listState.data.rows : []}
            rowKey={(user) => user.id}
            loading={listState.status === 'loading'}
            error={listState.status === 'error' ? listState.message : undefined}
            empty={{
              title: 'No users to display',
              message:
                'There are no users on file from this ID onwards. Clear the ID to start from the top.',
            }}
            skeletonRows={USERS_PAGE_SIZE}
            rowActions={(user) => (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/admin/users/update/${user.id}`, { state: { from: '/admin/users' } })
                  }
                >
                  Update
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    navigate(`/admin/users/delete/${user.id}`, { state: { from: '/admin/users' } })
                  }
                >
                  Delete
                </Button>
              </>
            )}
          />
          {listState.status === 'success' && listState.data.rows.length > 0 ? (
            <Pagination page={listState.data.page} onPrevious={handlePrevious} onNext={handleNext} />
          ) : null}
        </Card>
      </div>
    </AppShell>
  )
}

export default UserListPage
