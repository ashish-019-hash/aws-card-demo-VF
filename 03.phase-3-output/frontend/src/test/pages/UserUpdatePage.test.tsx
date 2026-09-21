import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { UserUpdatePage } from '../../pages/UserUpdatePage'

const existingUser = { userId: 'USER0001', firstName: 'JOHN', lastName: 'PUBLIC', userType: 'U' }

function renderPage() {
  return render(
    <MemoryRouter>
      <UserUpdatePage />
    </MemoryRouter>,
  )
}

async function lookupUser(user: ReturnType<typeof userEvent.setup>) {
  server.use(http.get('/api/users/:userId', () => HttpResponse.json(existingUser)))
  await user.type(screen.getByLabelText('User ID'), existingUser.userId)
  await user.click(screen.getByRole('button', { name: 'Enter' }))
  await screen.findByTestId('user-update-form')
}

describe('UserUpdatePage (COUSR02C, admin only)', () => {
  it('renders the lookup form with no edit form initially', () => {
    renderPage()
    expect(screen.getByText('COUSR02C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Update User' })).toBeInTheDocument()
    expect(screen.getByLabelText('User ID')).toBeInTheDocument()
    expect(screen.queryByTestId('user-update-form')).not.toBeInTheDocument()
  })

  it('blocks lookup with "User ID can NOT be empty..." when blank', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('User ID can NOT be empty...')).toBeInTheDocument()
  })

  it('looks up the user and pre-fills the edit form with a blank password', async () => {
    const user = userEvent.setup()
    renderPage()
    await lookupUser(user)
    expect(screen.getByLabelText('First Name')).toHaveValue('JOHN')
    expect(screen.getByLabelText('Last Name')).toHaveValue('PUBLIC')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('User Type (A/U)')).toHaveValue('U')
  })

  it('shows the backend error message and no edit form when lookup fails', async () => {
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
    expect(screen.queryByTestId('user-update-form')).not.toBeInTheDocument()
  })

  it.each([
    ['firstName', 'First Name', 'First Name can NOT be empty...'],
    ['lastName', 'Last Name', 'Last Name can NOT be empty...'],
    ['password', 'Password', 'Password can NOT be empty...'],
    ['userType', 'User Type (A/U)', 'User Type can NOT be empty...'],
  ])('blocks save with the exact legacy message when %s is cleared', async (_field, label, expected) => {
    const user = userEvent.setup()
    renderPage()
    await lookupUser(user)
    await user.clear(screen.getByLabelText(label))
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('blocks save with "User Type must be A or U" for an invalid type value', async () => {
    const user = userEvent.setup()
    renderPage()
    await lookupUser(user)
    await user.clear(screen.getByLabelText('User Type (A/U)'))
    await user.type(screen.getByLabelText('User Type (A/U)'), 'X')
    await user.type(screen.getByLabelText('Password'), 'NEWPASS1')
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('User Type must be A or U')).toBeInTheDocument()
  })

  it('saves the update and shows the success message', async () => {
    server.use(http.put('/api/users/:userId', () => HttpResponse.json({ ...existingUser, firstName: 'JANE' })))
    const user = userEvent.setup()
    renderPage()
    await lookupUser(user)
    await user.clear(screen.getByLabelText('First Name'))
    await user.type(screen.getByLabelText('First Name'), 'JANE')
    await user.type(screen.getByLabelText('Password'), 'NEWPASS1')
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('User has been updated ...')).toBeInTheDocument()
  })

  it('maps backend 400 field errors onto the form when the save fails', async () => {
    server.use(
      http.put('/api/users/:userId', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed.',
            errors: [{ field: 'userType', message: 'User Type must be A or U' }],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await lookupUser(user)
    await user.type(screen.getByLabelText('Password'), 'NEWPASS1')
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('Validation failed.')).toBeInTheDocument()
  })

  it('has a Back link to the user list', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/users')
  })
})
