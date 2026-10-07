import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { adminMenuItems, mainMenuItems } from './navItems'
import { SideNav } from './SideNav'

afterEach(cleanup)

describe('SideNav', () => {
  it('shows the ten business options for a regular user', () => {
    render(
      <MemoryRouter>
        <SideNav session={{ userId: 'USER0001', userType: 'U' }} />
      </MemoryRouter>,
    )
    expect(mainMenuItems).toHaveLength(10)
    for (const item of mainMenuItems) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)
    }
    expect(screen.getByRole('link', { name: 'Main Menu' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'User List' })).not.toBeInTheDocument()
  })

  it('shows only the four administration functions for an admin', () => {
    render(
      <MemoryRouter>
        <SideNav session={{ userId: 'ADMIN001', userType: 'A' }} />
      </MemoryRouter>,
    )
    expect(adminMenuItems).toHaveLength(4)
    for (const item of adminMenuItems) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)
    }
    expect(screen.getByRole('link', { name: 'Admin Menu' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bill Payment' })).not.toBeInTheDocument()
  })
})
