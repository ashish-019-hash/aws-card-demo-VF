import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldError } from '../../components/FieldError'

describe('FieldError', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(<FieldError message={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the exact message text when supplied', () => {
    render(<FieldError message="Please enter User ID ..." />)
    expect(screen.getByText('Please enter User ID ...')).toBeInTheDocument()
  })
})
