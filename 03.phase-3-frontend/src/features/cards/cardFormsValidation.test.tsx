import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardUpdateFormValues } from '../../validation/cardUpdate'
import { CardListFilterForm } from './CardListFilterForm'
import { CardSearchForm } from './CardSearchForm'
import { CardUpdateForm } from './CardUpdateForm'

afterEach(cleanup)

/** Step 4 — field-level error wiring on the card forms. */
describe('CardListFilterForm validation (SCREEN-06 COCRDLI)', () => {
  it('RULE-VAL-035/036 — blank filters are accepted as "no filter"', async () => {
    const onApply = vi.fn()
    render(<CardListFilterForm onApply={onApply} />)
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenCalledWith({ accountId: '', cardNumber: '' })
  })

  it('RULE-VAL-035/036 — supplied filters must be 11- and 16-digit numbers', async () => {
    const onApply = vi.fn()
    render(<CardListFilterForm onApply={onApply} />)
    await userEvent.type(screen.getByLabelText(/Account number/), '123')
    await userEvent.type(screen.getByLabelText(/Card number/), '4000')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('Account number must be an 11-digit number.')).toBeInTheDocument()
    expect(screen.getByText('Card number must be a 16-digit number.')).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })
})

describe('CardSearchForm validation (SCREEN-07/08 lookup)', () => {
  it('RULE-VAL-039/040 — blank keys show the legacy prompts', async () => {
    const onSearch = vi.fn()
    render(<CardSearchForm onSearch={onSearch} />)
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(await screen.findByText('Account number not provided')).toBeInTheDocument()
    expect(screen.getByText('Card number not provided')).toBeInTheDocument()
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('RULE-VAL-039/040 — supplied keys must be 11- and 16-digit numbers', async () => {
    const onSearch = vi.fn()
    render(<CardSearchForm onSearch={onSearch} />)
    await userEvent.type(screen.getByLabelText(/Account number/), '123')
    await userEvent.type(screen.getByLabelText(/Card number/), '4000')
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(
      await screen.findByText('Account number must be a non-zero 11-digit number.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Card number must be a 16-digit number.')).toBeInTheDocument()
    expect(onSearch).not.toHaveBeenCalled()
  })
})

const baseline: CardUpdateFormValues = {
  embossedName: 'SARAH WHITFIELD',
  activeStatus: 'Y',
  expiryMonth: '3',
  expiryYear: '2027',
}

function renderCardUpdateForm() {
  const onValidated = vi.fn()
  render(
    <CardUpdateForm
      accountId="00000000010"
      cardNumber="4000123456789012"
      baseline={baseline}
      phase="editing"
      onValidated={onValidated}
      onSave={vi.fn()}
      onDiscard={vi.fn()}
      onEdited={vi.fn()}
    />,
  )
  return { onValidated }
}

describe('CardUpdateForm validation (SCREEN-08 COCRDUP)', () => {
  it('RULE-VAL-045 — a non-alphabetic embossed name shows the legacy message', async () => {
    const { onValidated } = renderCardUpdateForm()
    const name = screen.getByLabelText(/Embossed name/)
    await userEvent.clear(name)
    await userEvent.type(name, 'SARAH W 3RD')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(
      await screen.findByText('Card name can only contain alphabets and spaces'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Embossed name/)).toHaveAttribute('aria-invalid', 'true')
    expect(onValidated).not.toHaveBeenCalled()
  })

  it('RULE-VAL-047 — an out-of-range expiry month shows the legacy message', async () => {
    renderCardUpdateForm()
    const month = screen.getByLabelText(/Expiry month/)
    await userEvent.clear(month)
    await userEvent.type(month, '13')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(
      await screen.findByText('Card expiry month must be between 1 and 12'),
    ).toBeInTheDocument()
  })

  it('RULE-VAL-048 — an out-of-range expiry year shows the legacy message', async () => {
    renderCardUpdateForm()
    const year = screen.getByLabelText(/Expiry year/)
    await userEvent.clear(year)
    await userEvent.type(year, '1949')
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(await screen.findByText('Invalid card expiry year')).toBeInTheDocument()
  })

  it('accepts baseline values and reports no change', async () => {
    const { onValidated } = renderCardUpdateForm()
    await userEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
    expect(onValidated).toHaveBeenCalledWith(baseline, false)
  })
})
