import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { UserDeletePage } from '../../pages/UserDeletePage'

const existingUser = { userId: 'USER0001', firstName: 'JOHN', lastName: 'PUBLIC', userType: 'U' }

function renderPage() {
  return render(
    <MemoryRouter>
      <UserDeletePage />
    </MemoryRouter>,
  )
}

describe('UserDeletePage (COUSR03C, admin only)', () => {
  it('renders the lookup form with no detail grid initially', () => {
    renderPage()
    expect(screen.getByText('COUSR03C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delete User' })).toBeInTheDocument()
    expect(screen.queryByTestId('user-delete-detail')).not.toBeInTheDocument()
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
  })

  it('blocks lookup with "User ID can NOT be empty..." when blank (VR-127)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('User ID can NOT be empty...')).toBeInTheDocument()
  })

  it('looks up the user and shows the delete-confirmation detail grid', async () => {
    server.use(http.get('/api/users/:userId', () => HttpResponse.json(existingUser)))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('User ID'), existingUser.userId)
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const grid = await screen.findByTestId('user-delete-detail')
    expect(grid).toHaveTextContent('JOHN')
    expect(grid).toHaveTextContent('PUBLIC')
    expect(screen.getByTestId('confirm-actions')).toBeInTheDocument()
  })

  it('shows the backend error message and no detail grid when lookup fails', async () => {
    server.use(
      http.get('/api/users/:userId', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'User ID NOT found...' }, { status: 404 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('User ID'), 'NOBODY01')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('User ID NOT found...')).toBeInTheDocument()
    expect(screen.queryByTestId('user-delete-detail')).not.toBeInTheDocument()
  })

  it('F5 = Delete deletes the user and shows the success message, clearing the detail grid', async () => {
    server.use(
      http.get('/api/users/:userId', () => HttpResponse.json(existingUser)),
      http.delete('/api/users/:userId', () => new HttpResponse(null, { status: 204 })),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('User ID'), existingUser.userId)
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F5 = Delete' }))
    expect(await screen.findByText('User has been deleted ...')).toBeInTheDocument()
    expect(screen.queryByTestId('user-delete-detail')).not.toBeInTheDocument()
  })

  it('shows the backend error message when delete fails', async () => {
    server.use(
      http.get('/api/users/:userId', () => HttpResponse.json(existingUser)),
      http.delete('/api/users/:userId', () =>
        HttpResponse.json({ code: 'CONFLICT', message: 'Unable to delete user.' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('User ID'), existingUser.userId)
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F5 = Delete' }))
    expect(await screen.findByText('Unable to delete user.')).toBeInTheDocument()
  })

  it('has a Back link to the user list', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/users')
  })
})
