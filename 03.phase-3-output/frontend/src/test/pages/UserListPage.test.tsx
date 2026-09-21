import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { UserListPage } from '../../pages/UserListPage'

const oneUser = {
  items: [{ userId: 'USER0001', firstName: 'JOHN', lastName: 'PUBLIC', userType: 'U' }],
  hasNext: false,
  hasPrevious: false,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <UserListPage />
    </MemoryRouter>,
  )
}

describe('UserListPage (COUSR00C, admin only)', () => {
  it('loads and renders the user list on initial mount', async () => {
    server.use(http.get('/api/users', () => HttpResponse.json(oneUser)))
    renderPage()
    const table = await screen.findByTestId('user-list')
    expect(within(table).getByText('USER0001')).toBeInTheDocument()
    expect(within(table).getByText('JOHN')).toBeInTheDocument()
  })

  it('shows "No users found." for an empty list', async () => {
    server.use(http.get('/api/users', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })))
    renderPage()
    expect(await screen.findByText('No users found.')).toBeInTheDocument()
  })

  it('paginates with F7/F8 and disables the buttons appropriately', async () => {
    const page0 = { items: [{ userId: 'USERPG01', firstName: 'PG1', lastName: 'PG1', userType: 'U' }], hasNext: true, hasPrevious: false }
    const page1 = { items: [{ userId: 'USERPG02', firstName: 'PG2', lastName: 'PG2', userType: 'U' }], hasNext: false, hasPrevious: true }
    let calls = 0
    server.use(
      http.get('/api/users', () => {
        calls += 1
        return HttpResponse.json(calls === 1 ? page0 : page1)
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('USERPG01')
    expect(screen.getByRole('button', { name: 'F7 = Prev Page' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'F8 = Next Page' }))
    expect(await screen.findByText('USERPG02')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'F8 = Next Page' })).toBeDisabled()
  })

  it('renders Add User link and per-row Update/Delete links, plus a Back link to /admin', async () => {
    server.use(http.get('/api/users', () => HttpResponse.json(oneUser)))
    renderPage()
    await screen.findByText('USER0001')
    expect(screen.getByRole('link', { name: 'Add User' })).toHaveAttribute('href', '/users/add')
    expect(screen.getByRole('link', { name: 'U = Update' })).toHaveAttribute('href', '/users/update?userId=USER0001')
    expect(screen.getByRole('link', { name: 'D = Delete' })).toHaveAttribute('href', '/users/delete?userId=USER0001')
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/admin')
  })

  it('shows the backend error message when the list request fails', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Unable to load users right now.' }, { status: 500 }),
      ),
    )
    renderPage()
    expect(await screen.findByText('Unable to load users right now.')).toBeInTheDocument()
  })
})
