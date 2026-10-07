import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileDrawer } from './MobileDrawer'

afterEach(cleanup)

const session = { userId: 'USER0001', userType: 'U' } as const

describe('MobileDrawer', () => {
  it('renders nothing while closed', () => {
    render(
      <MemoryRouter>
        <MobileDrawer open={false} onClose={() => {}} session={session} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens as a dialog, focuses the close button and closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <MobileDrawer open onClose={onClose} session={session} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('dialog', { name: 'Navigation menu' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
