import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../server'
import { UserAddPage } from '../../pages/UserAddPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/users/add']}>
      <Routes>
        <Route path="/users/add" element={<UserAddPage />} />
        <Route path="/users" element={<div>USER LIST SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: Record<string, string> = {}) {
  const values = {
    userId: 'USER0002',
    firstName: 'JANE',
    lastName: 'DOE',
    password: 'PASSWORD',
    userType: 'U',
    ...overrides,
  }
  if (values.userId) await user.type(screen.getByLabelText('User ID'), values.userId)
  if (values.firstName) await user.type(screen.getByLabelText('First Name'), values.firstName)
  if (values.lastName) await user.type(screen.getByLabelText('Last Name'), values.lastName)
  if (values.password) await user.type(screen.getByLabelText('Password'), values.password)
  if (values.userType) await user.type(screen.getByLabelText('User Type (A/U)'), values.userType)
}

describe('UserAddPage (COUSR01C, admin only)', () => {
  it('renders the screen header and add-user form initially', () => {
    renderPage()
    expect(screen.getByText('COUSR01C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add User' })).toBeInTheDocument()
    expect(screen.getByTestId('user-add-form')).toBeInTheDocument()
  })

  it.each([
    ['userId', 'User ID can NOT be empty...'],
    ['firstName', 'First Name can NOT be empty...'],
    ['lastName', 'Last Name can NOT be empty...'],
    ['password', 'Password can NOT be empty...'],
    ['userType', 'User Type can NOT be empty...'],
  ])('blocks submit with the exact legacy message when %s is blank', async (field, expected) => {
    const user = userEvent.setup()
    renderPage()
    await fillForm(user, { [field]: '' } as Record<string, string>)
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('blocks submit with "User Type must be A or U" for an invalid type value (VR-118/120)', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillForm(user, { userType: 'X' })
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('User Type must be A or U')).toBeInTheDocument()
  })

  it('creates the user, shows the success message, and navigates to /users after the delay', async () => {
    server.use(http.post('/api/users', () => HttpResponse.json({ userId: 'USER0002' })))
    const user = userEvent.setup()
    renderPage()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('User has been added ...')).toBeInTheDocument()
    expect(await screen.findByText('USER LIST SCREEN', {}, { timeout: 2000 })).toBeInTheDocument()
  })

  it('maps backend 400 field errors onto the form and shows the error message', async () => {
    server.use(
      http.post('/api/users', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'User ID already exists.',
            errors: [{ field: 'userId', message: 'User ID already exists.' }],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))
    // The backend maps this error onto both the top-level message bar and the userId
    // field error, so more than one element carries the same text.
    expect((await screen.findAllByText('User ID already exists.')).length).toBeGreaterThan(0)
  })

  it('has a Back link to the user list', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/users')
  })
})
