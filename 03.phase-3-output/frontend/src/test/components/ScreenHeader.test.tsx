import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScreenHeader } from '../../components/ScreenHeader'

describe('ScreenHeader', () => {
  it('renders the app name, screen id, and title (legacy BMS header equivalent)', () => {
    render(<ScreenHeader screenId="COSGN00C" title="Sign On" />)
    expect(screen.getByText('CardDemo')).toBeInTheDocument()
    expect(screen.getByText('COSGN00C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign On' })).toBeInTheDocument()
  })

  it('renders a live date/time string', () => {
    render(<ScreenHeader screenId="COMEN01C" title="Main Menu" />)
    // Presence check only: the legacy BMS map shows a program date/time in a corner of
    // every screen; the exact clock text is environment/locale-dependent so we just
    // assert something non-empty was rendered rather than pinning a format.
    const datetime = document.querySelector('.screen-header__datetime')
    expect(datetime?.textContent).toBeTruthy()
  })
})
