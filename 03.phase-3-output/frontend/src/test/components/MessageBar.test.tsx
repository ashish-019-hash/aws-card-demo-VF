import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MessageBar } from '../../components/MessageBar'

describe('MessageBar', () => {
  it('renders nothing when the message is null/undefined', () => {
    const { container: c1 } = render(<MessageBar kind="error" message={null} />)
    expect(c1).toBeEmptyDOMElement()
    const { container: c2 } = render(<MessageBar kind="info" message={undefined} />)
    expect(c2).toBeEmptyDOMElement()
  })

  it('uses role="alert" for error messages (screen-reader accessibility)', () => {
    render(<MessageBar kind="error" message="User not found. Try again ..." />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('User not found. Try again ...')
  })

  it('uses role="status" for success and info messages', () => {
    render(<MessageBar kind="success" message="Changes committed to database" />)
    expect(screen.getByRole('status')).toHaveTextContent('Changes committed to database')
  })
})
