import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { SessionProvider } from './hooks/useSession'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  )
}

describe('CardDemo application routes', () => {
  it('renders the sign-in page at /sign-in', () => {
    renderApp('/sign-in')
    expect(screen.getByRole('heading', { name: 'Sign on' })).toBeInTheDocument()
  })

  it('redirects the root route to sign-in without a session', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: 'Sign on' })).toBeInTheDocument()
  })
})
