import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY, SessionProvider } from '../hooks/useSession'
import { AppShell } from './AppShell'
import { resetShellNavigationTracking } from './shellNavigation'

afterEach(cleanup)
afterEach(() => window.sessionStorage.removeItem(SESSION_STORAGE_KEY))
beforeEach(resetShellNavigationTracking)

/**
 * Every route page wraps itself in its own AppShell, so navigation unmounts
 * one shell and mounts another — exactly what this harness reproduces.
 */
function PageA() {
  return (
    <AppShell>
      <h1>Page A</h1>
      <Link to="/b">Go to page B</Link>
    </AppShell>
  )
}

function PageB() {
  return (
    <AppShell>
      <h1>Page B</h1>
    </AppShell>
  )
}

function renderShellPages(initialEntry = '/a') {
  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ userId: 'USER0001', userType: 'U' }),
  )
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/a" element={<PageA />} />
          <Route path="/b" element={<PageB />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('AppShell main-content focus', () => {
  it('does not steal focus on the initial page load', () => {
    renderShellPages()
    expect(screen.getByRole('heading', { name: 'Page A' })).toBeInTheDocument()
    expect(screen.getByRole('main')).not.toHaveFocus()
  })

  it('focuses the main landmark after navigating to another route page', async () => {
    renderShellPages()
    await userEvent.click(screen.getByRole('link', { name: 'Go to page B' }))
    expect(screen.getByRole('heading', { name: 'Page B' })).toBeInTheDocument()
    // The new page mounted its own AppShell; its <main> must still receive
    // focus so screen readers announce the new page.
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })
})
