import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { server } from './server'
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
describe('CardDemo sign-on and account lookup', () => {
  it('validates credentials before submitting', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('User ID is required')
  })
  it('signs in and lets a user retrieve an account', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('User ID'), { target: { value: 'user0001' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'user123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Workspace')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Account lookup'))
    fireEvent.change(screen.getByLabelText('Account ID'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find account' }))
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument())
  })
})
