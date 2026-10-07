import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../hooks/useSession'
import { ApiError, api } from '../services/api'
import type { PageResponse, UserDto } from '../services/api'
import UserAddPage from './UserAddPage'
import UserDeletePage from './UserDeletePage'
import UserListPage from './UserListPage'
import UserUpdatePage from './UserUpdatePage'

vi.mock('../services/api', () => ({
  api: {
    users: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    status: number
    detail?: string
    constructor(message: string, status: number, detail?: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.detail = detail
    }
  },
}))

afterEach(cleanup)
afterEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
})

const user = (id: string, firstName: string, lastName: string, userType: 'A' | 'U' = 'U'): UserDto => ({
  id,
  firstName,
  lastName,
  userType,
})

/** 23 id-sorted users, matching the backend's `sort=id,asc` list order. */
const allUsers: UserDto[] = [
  user('ADMIN001', 'Alex', 'Morgan', 'A'),
  user('ADMIN002', 'Dana', 'Whitaker', 'A'),
  ...Array.from({ length: 21 }, (_, index) =>
    user(`USER${String(index + 1).padStart(4, '0')}`, `First${index + 1}`, `Last${index + 1}`),
  ),
]

function pageOf(users: UserDto[], page: number, size: number): PageResponse<UserDto> {
  const content = users.slice(page * size, page * size + size)
  return {
    content,
    page: {
      size,
      number: page,
      totalElements: users.length,
      totalPages: Math.ceil(users.length / size),
    },
  }
}

/** Renders a user-administration page with an admin session (SCREEN-14..17 are admin-only). */
function renderAdminPage(ui: ReactNode, { routePath, url }: { routePath: string; url: string }) {
  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ userId: 'ADMIN001', userType: 'A' }),
  )
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={routePath} element={ui} />
          <Route path="*" element={<div>other route</div>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('UserListPage', () => {
  it('fetches the first backend page of ten users and renders labelled row actions', async () => {
    vi.mocked(api.users.list).mockImplementation(async (page, size) => pageOf(allUsers, page, size))
    renderAdminPage(<UserListPage />, { routePath: '/admin/users', url: '/admin/users' })
    expect(screen.getByRole('heading', { name: 'User List' })).toBeInTheDocument()
    expect(document.querySelector('[data-screen="COUSR00"]')).not.toBeNull()
    expect((await screen.findAllByText('USER0003')).length).toBeGreaterThan(0)
    expect(api.users.list).toHaveBeenCalledWith(0, 10)
    expect(screen.getAllByRole('button', { name: 'Update' }).length).toBeGreaterThanOrEqual(10)
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBeGreaterThanOrEqual(10)
  })

  it('shows the legacy top-of-list message without refetching when Previous is pressed on page 1', async () => {
    vi.mocked(api.users.list).mockImplementation(async (page, size) => pageOf(allUsers, page, size))
    renderAdminPage(<UserListPage />, { routePath: '/admin/users', url: '/admin/users' })
    await screen.findAllByText('USER0003')
    expect(api.users.list).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getAllByRole('button', { name: 'Previous' })[0])
    expect(screen.getByText('You are already at the top of the page...')).toBeInTheDocument()
    expect(api.users.list).toHaveBeenCalledTimes(1)
  })

  it('applies the start-user filter client-side over bounded backend pages', async () => {
    vi.mocked(api.users.list).mockImplementation(async (page, size) => pageOf(allUsers, page, size))
    renderAdminPage(<UserListPage />, { routePath: '/admin/users', url: '/admin/users' })
    await screen.findAllByText('USER0003')

    await userEvent.type(screen.getByLabelText(/Start from user ID/), 'USER0015')
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect((await screen.findAllByText('USER0015')).length).toBeGreaterThan(0)
    // Filtered views fetch bounded 100-row pages because the backend has no start-user parameter.
    expect(api.users.list).toHaveBeenLastCalledWith(0, 100)
    expect(screen.queryByText('USER0014')).not.toBeInTheDocument()
    expect(screen.getAllByText('USER0021').length).toBeGreaterThan(0)
  })

  it('shows the documented browse failure when the list call fails', async () => {
    vi.mocked(api.users.list).mockRejectedValue(new ApiError('Request failed with status 500.', 500))
    renderAdminPage(<UserListPage />, { routePath: '/admin/users', url: '/admin/users' })
    expect(await screen.findByText('Unable to lookup User...')).toBeInTheDocument()
  })
})

describe('UserAddPage', () => {
  it('creates the user through the API and shows the documented success message', async () => {
    vi.mocked(api.users.create).mockResolvedValue(user('USER0099', 'Jordan', 'Blake', 'A'))
    renderAdminPage(<UserAddPage />, { routePath: '/admin/users/add', url: '/admin/users/add' })
    expect(document.querySelector('[data-screen="COUSR01"]')).not.toBeNull()
    await userEvent.type(screen.getByLabelText(/First name/), 'Jordan')
    await userEvent.type(screen.getByLabelText(/Last name/), 'Blake')
    await userEvent.type(screen.getByLabelText(/User ID/), 'user0099')
    await userEvent.type(screen.getByLabelText(/Password/), 'welcome1')
    await userEvent.click(screen.getByLabelText(/A — Administrator/))
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    await waitFor(() =>
      expect(screen.getByText('User USER0099 has been added.')).toBeInTheDocument(),
    )
    expect(api.users.create).toHaveBeenCalledWith('USER0099', {
      firstName: 'Jordan',
      lastName: 'Blake',
      password: 'welcome1',
      userType: 'A',
    })
  })

  it('shows the duplicate-ID message when the API reports a conflict', async () => {
    vi.mocked(api.users.create).mockRejectedValue(
      new ApiError('User already exists: USER0001', 409),
    )
    renderAdminPage(<UserAddPage />, { routePath: '/admin/users/add', url: '/admin/users/add' })
    await userEvent.type(screen.getByLabelText(/First name/), 'Priya')
    await userEvent.type(screen.getByLabelText(/Last name/), 'Shah')
    await userEvent.type(screen.getByLabelText(/User ID/), 'USER0001')
    await userEvent.type(screen.getByLabelText(/Password/), 'welcome1')
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'User ID already exists. Choose a different ID.',
      ),
    )
  })

  it('shows the legacy required-field messages and focuses the first invalid field (RULE-VAL-075)', async () => {
    renderAdminPage(<UserAddPage />, { routePath: '/admin/users/add', url: '/admin/users/add' })
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText('First Name can NOT be empty.')).toBeInTheDocument()
    expect(screen.getByText('Last Name can NOT be empty.')).toBeInTheDocument()
    expect(screen.getByText('User ID can NOT be empty.')).toBeInTheDocument()
    expect(screen.getByText('Password can NOT be empty.')).toBeInTheDocument()
    // User type defaults to 'U', so RULE-VAL-075's empty-type message has no path here.
    expect(api.users.create).not.toHaveBeenCalled()
    // The first invalid field (legacy check order) receives focus.
    expect(screen.getByLabelText(/First name/)).toHaveFocus()
  })

  it('rejects a password outside the backend 8-72 length contract', async () => {
    renderAdminPage(<UserAddPage />, { routePath: '/admin/users/add', url: '/admin/users/add' })
    await userEvent.type(screen.getByLabelText(/First name/), 'Jordan')
    await userEvent.type(screen.getByLabelText(/Last name/), 'Blake')
    await userEvent.type(screen.getByLabelText(/User ID/), 'USER0099')
    await userEvent.type(screen.getByLabelText(/Password/), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText('Password must be 8 to 72 characters.')).toBeInTheDocument()
    expect(api.users.create).not.toHaveBeenCalled()
  })
})

describe('UserUpdatePage', () => {
  it('loads the selected user, requires a password field-level (RULE-VAL-078), then saves', async () => {
    vi.mocked(api.users.get).mockResolvedValue(user('USER0002', 'Marcus', 'Lee'))
    vi.mocked(api.users.update).mockResolvedValue(user('USER0002', 'Marc', 'Lee'))
    renderAdminPage(<UserUpdatePage />, {
      routePath: '/admin/users/update/:userId?',
      url: '/admin/users/update/USER0002',
    })
    expect(document.querySelector('[data-screen="COUSR02"]')).not.toBeNull()
    expect(await screen.findByDisplayValue('Marcus')).toBeInTheDocument()
    expect(api.users.get).toHaveBeenCalledWith('USER0002')
    // The stored password is never fetched or shown.
    expect(screen.getByLabelText(/Password/)).toHaveValue('')

    await userEvent.clear(screen.getByDisplayValue('Marcus'))
    await userEvent.type(screen.getByLabelText(/First name/), 'Marc')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Password can NOT be empty.')).toBeInTheDocument()
    expect(api.users.update).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Password/)).toHaveFocus()

    await userEvent.type(screen.getByLabelText(/Password/), 'newpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(screen.getByText('User USER0002 has been updated.')).toBeInTheDocument(),
    )
    expect(api.users.update).toHaveBeenCalledWith('USER0002', {
      firstName: 'Marc',
      lastName: 'Lee',
      password: 'newpass1',
      userType: 'U',
    })
    // The submitted password is cleared from the remounted form.
    expect(screen.getByLabelText(/Password/)).toHaveValue('')
  })

  it('maps the backend no-change rejection to the documented message (RULE-VAL-081)', async () => {
    vi.mocked(api.users.get).mockResolvedValue(user('USER0002', 'Marcus', 'Lee'))
    vi.mocked(api.users.update).mockRejectedValue(
      new ApiError('At least one field must change for an update.', 400),
    )
    renderAdminPage(<UserUpdatePage />, {
      routePath: '/admin/users/update/:userId?',
      url: '/admin/users/update/USER0002',
    })
    expect(await screen.findByDisplayValue('Marcus')).toBeInTheDocument()
    // Only the backend can compare the typed password with the stored hash,
    // so a same-values resubmit is decided server-side.
    await userEvent.type(screen.getByLabelText(/Password/), 'samepass1')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(
        screen.getByText('Please modify to update. No fields were changed.'),
      ).toBeInTheDocument(),
    )
  })

  it('rejects a blank lookup with the legacy field message without calling the API (RULE-VAL-077)', async () => {
    renderAdminPage(<UserUpdatePage />, {
      routePath: '/admin/users/update/:userId?',
      url: '/admin/users/update',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Fetch user' }))
    expect(await screen.findByText('User ID can NOT be empty.')).toBeInTheDocument()
    expect(api.users.get).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/User ID/)).toHaveFocus()
  })

  it('shows the documented not-found message when the lookup returns 404', async () => {
    vi.mocked(api.users.get).mockRejectedValue(new ApiError('User not found: NOBODY01', 404))
    renderAdminPage(<UserUpdatePage />, {
      routePath: '/admin/users/update/:userId?',
      url: '/admin/users/update/NOBODY01',
    })
    expect(await screen.findByText('User ID NOT found.')).toBeInTheDocument()
  })
})

describe('UserDeletePage', () => {
  it('shows the review card for the selected user and deletes through the API', async () => {
    vi.mocked(api.users.get).mockResolvedValue(user('USER0008', 'Sam', 'Patel'))
    vi.mocked(api.users.delete).mockResolvedValue(undefined)
    renderAdminPage(<UserDeletePage />, {
      routePath: '/admin/users/delete/:userId?',
      url: '/admin/users/delete/USER0008',
    })
    expect(document.querySelector('[data-screen="COUSR03"]')).not.toBeNull()
    expect(
      await screen.findByRole('heading', { name: 'Confirm deletion' }),
    ).toBeInTheDocument()
    expect(api.users.get).toHaveBeenCalledWith('USER0008')
    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(screen.getByText('Review the user, then press Delete user.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete user' }))
    await waitFor(() =>
      expect(screen.getByText('User USER0008 has been deleted.')).toBeInTheDocument(),
    )
    expect(api.users.delete).toHaveBeenCalledWith('USER0008')
  })

  it('rejects a blank lookup with the legacy field message without calling the API (RULE-VAL-080)', async () => {
    renderAdminPage(<UserDeletePage />, {
      routePath: '/admin/users/delete/:userId?',
      url: '/admin/users/delete',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Fetch user' }))
    expect(await screen.findByText('User ID can NOT be empty.')).toBeInTheDocument()
    expect(api.users.get).not.toHaveBeenCalled()
  })

  it('shows the documented not-found message when the lookup returns 404', async () => {
    vi.mocked(api.users.get).mockRejectedValue(new ApiError('User not found: NOBODY01', 404))
    renderAdminPage(<UserDeletePage />, {
      routePath: '/admin/users/delete/:userId?',
      url: '/admin/users/delete/NOBODY01',
    })
    expect(await screen.findByText('User ID NOT found.')).toBeInTheDocument()
  })
})
