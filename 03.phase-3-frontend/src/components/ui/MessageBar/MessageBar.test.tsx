import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageBar } from '.'

afterEach(cleanup)

describe('MessageBar', () => {
  it('announces errors with role="alert"', () => {
    render(<MessageBar tone="error">Account not found</MessageBar>)
    expect(screen.getByRole('alert')).toHaveTextContent('Account not found')
  })

  it('announces other tones with role="status"', () => {
    render(<MessageBar tone="success">Changes committed to database</MessageBar>)
    expect(screen.getByRole('status')).toHaveTextContent('Changes committed to database')
  })

  it('supports dismissal', async () => {
    const onDismiss = vi.fn()
    render(<MessageBar onDismiss={onDismiss}>Heads up</MessageBar>)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss message' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
