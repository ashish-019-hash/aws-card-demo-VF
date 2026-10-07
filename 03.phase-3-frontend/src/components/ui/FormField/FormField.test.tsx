import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FormField } from '.'

afterEach(cleanup)

describe('FormField', () => {
  it('links label, hint and error to the control', () => {
    render(
      <FormField label="Account number" hint="11 digits" error="Account number is required">
        <input />
      </FormField>,
    )
    const input = screen.getByLabelText('Account number')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const describedBy = input.getAttribute('aria-describedby') ?? ''
    const ids = describedBy.split(' ').filter(Boolean)
    expect(ids).toHaveLength(2)
    const texts = ids.map((id) => document.getElementById(id)?.textContent)
    expect(texts).toContain('11 digits')
    expect(texts).toContain('Account number is required')
  })

  it('omits aria-invalid and the error id when there is no error', () => {
    render(
      <FormField label="Account number" hint="11 digits">
        <input />
      </FormField>,
    )
    const input = screen.getByLabelText('Account number')
    expect(input).not.toHaveAttribute('aria-invalid')
    const describedBy = input.getAttribute('aria-describedby') ?? ''
    expect(describedBy.split(' ').filter(Boolean)).toHaveLength(1)
  })
})
