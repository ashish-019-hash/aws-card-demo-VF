import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BackLink } from '../../components/BackLink'

describe('BackLink', () => {
  it('renders the default legacy F3 label and links to the given route', () => {
    render(
      <MemoryRouter>
        <BackLink to="/menu" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'F3 = Exit/Back' })
    expect(link).toHaveAttribute('href', '/menu')
  })

  it('renders a custom label when supplied', () => {
    render(
      <MemoryRouter>
        <BackLink to="/users" label="F12 = Cancel" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'F12 = Cancel' })).toHaveAttribute('href', '/users')
  })
})
