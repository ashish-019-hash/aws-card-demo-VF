import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { userApi } from '../api/services'
import type { ApplicationUser, Page } from '../api/types'
import {
  Empty,
  ErrorMessage,
  Loading,
  Notice,
  PageHeader,
  Pagination,
  SearchForm,
  SubmitButton,
} from '../components/ui'

export function UserListPage() {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState<Page<ApplicationUser>>()
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)
  const load = async (next = 0) => {
    setLoading(true)
    try {
      setPage(await userApi.list({ startsWith: filter, page: next, size: 10 }))
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  return (
    <>
      <PageHeader title="Security users" description="Browse security users and select a maintenance task." />
      <SearchForm
        onSubmit={(event) => {
          event.preventDefault()
          void load()
        }}
      >
        <label>
          User ID starts with
          <input value={filter} onChange={(event) => setFilter(event.target.value.toUpperCase())} />
        </label>
        <SubmitButton pending={loading}>Search</SubmitButton>
      </SearchForm>
      <ErrorMessage error={error} />
      {loading && <Loading />}
      {page &&
        (page.content.length ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>First name</th>
                  <th>Last name</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((user) => (
                  <tr key={user.userId}>
                    <td>{user.userId}</td>
                    <td>{user.firstName}</td>
                    <td>{user.lastName}</td>
                    <td>{user.userType}</td>
                    <td>
                      <Link to={`/users/update?id=${user.userId}`}>Update</Link>{' '}
                      <Link to={`/users/delete?id=${user.userId}`}>Delete</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} onChange={(next) => void load(next)} />
          </>
        ) : (
          <Empty>No users match the supplied filter.</Empty>
        ))}
    </>
  )
}

const blank = { userId: '', firstName: '', lastName: '', password: '', userType: 'U' }
export function UserFormPage({ mode }: { mode: 'add' | 'update' | 'delete' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryId = searchParams.get('id') ?? ''
  const [values, setValues] = useState({ ...blank, userId: queryId })
  const [user, setUser] = useState<ApplicationUser>()
  const [error, setError] = useState<unknown>()
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const set = (key: keyof typeof values, value: string) => setValues((old) => ({ ...old, [key]: value }))
  const retrieve = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!values.userId.trim()) {
      setError(new Error('User ID is required.'))
      return
    }
    setPending(true)
    try {
      const item = await userApi.get(values.userId)
      setUser(item)
      setValues((old) => ({ ...old, firstName: item.firstName, lastName: item.lastName, userType: item.userType }))
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setPending(false)
    }
  }
  useEffect(() => {
    if (queryId && mode !== 'add') void retrieve()
  }, [])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const required = mode === 'delete' ? ['userId'] : ['userId', 'firstName', 'lastName', 'password', 'userType']
    if (required.some((key) => !values[key as keyof typeof values].trim())) {
      setError(
        new Error(
          mode === 'delete'
            ? 'Retrieve a user before deleting it.'
            : 'User ID, first name, last name, password, and user type are required.',
        ),
      )
      return
    }
    if (mode === 'delete' && !user) {
      setError(new Error('Retrieve a user before deleting it.'))
      return
    }
    setPending(true)
    try {
      if (mode === 'add') {
        await userApi.add(values)
        setMessage(`User ${values.userId} was created.`)
        setValues(blank)
      } else if (mode === 'update') {
        await userApi.update(values.userId, {
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
          userType: values.userType,
        })
        setMessage(`User ${values.userId} was updated.`)
        await retrieve()
      } else {
        await userApi.delete(values.userId)
        setMessage(`User ${values.userId} has been deleted.`)
        setValues(blank)
        setUser(undefined)
      }
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setPending(false)
    }
  }
  const title =
    mode === 'add' ? 'Add security user' : mode === 'update' ? 'Update security user' : 'Delete security user'
  return (
    <>
      <PageHeader
        title={title}
        description={
          mode === 'delete'
            ? 'Retrieve a user for review, then explicitly delete it.'
            : 'Maintain application user access.'
        }
      />
      {mode !== 'add' && (
        <SearchForm onSubmit={retrieve}>
          <label>
            User ID
            <input value={values.userId} onChange={(event) => set('userId', event.target.value.toUpperCase())} />
          </label>
          <SubmitButton pending={pending}>Retrieve user</SubmitButton>
        </SearchForm>
      )}
      <ErrorMessage error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {(mode === 'add' || user) && (
        <form className="data-form compact" onSubmit={save} noValidate>
          {mode === 'add' && (
            <label>
              User ID
              <input value={values.userId} onChange={(event) => set('userId', event.target.value.toUpperCase())} />
            </label>
          )}
          <label>
            First name
            <input
              disabled={mode === 'delete'}
              value={values.firstName}
              onChange={(event) => set('firstName', event.target.value)}
            />
          </label>
          <label>
            Last name
            <input
              disabled={mode === 'delete'}
              value={values.lastName}
              onChange={(event) => set('lastName', event.target.value)}
            />
          </label>
          {mode !== 'delete' && (
            <>
              <label>
                Password
                <input
                  type="password"
                  value={values.password}
                  onChange={(event) => set('password', event.target.value)}
                />
              </label>
              <label>
                User type
                <input
                  maxLength={1}
                  value={values.userType}
                  onChange={(event) => set('userType', event.target.value.toUpperCase())}
                />
              </label>
            </>
          )}
          <SubmitButton pending={pending}>
            {mode === 'add' ? 'Create user' : mode === 'update' ? 'Save user' : 'Delete user'}
          </SubmitButton>
          {mode === 'delete' && (
            <button type="button" className="secondary" onClick={() => navigate('/users')}>
              Cancel
            </button>
          )}
        </form>
      )}
    </>
  )
}
