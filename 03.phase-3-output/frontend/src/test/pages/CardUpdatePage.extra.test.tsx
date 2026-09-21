import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { CardUpdatePage } from '../../pages/CardUpdatePage'

const baseCard = {
  cardNum: '1111222233334444',
  acctId: 10,
  fields: {
    cvvCd: 123,
    embossedName: 'JOHN Q PUBLIC',
    expirationDate: '2027-05-01',
    activeStatus: 'Y',
  },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CardUpdatePage />
    </MemoryRouter>,
  )
}

async function goToEdit(user: ReturnType<typeof userEvent.setup>) {
  server.use(http.get('/api/cards/:cardNum', () => HttpResponse.json(baseCard)))
  renderPage()
  await user.type(screen.getByLabelText('Card Number'), baseCard.cardNum)
  await user.click(screen.getByRole('button', { name: 'Enter' }))
  await screen.findByLabelText('Cardholder Name on Card')
}

describe('CardUpdatePage (COCRDUPC) - additional coverage', () => {
  it('renders the search screen with the card-number field and Enter action initially', () => {
    renderPage()
    expect(screen.getByText('COCRDUPC')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Update Card' })).toBeInTheDocument()
    expect(screen.getByLabelText('Card Number')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })

  it('blocks search with "Card number not provided" when the card number is blank', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Card number not provided')).toBeInTheDocument()
  })

  it('shows the backend error message when the lookup fails', async () => {
    server.use(
      http.get('/api/cards/:cardNum', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Card NOT found...' }, { status: 404 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Card Number'), '9999888877776666')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Card NOT found...')).toBeInTheDocument()
  })

  it.each([
    ['0', 'Card expiry month must be between 1 and 12'],
    ['13', 'Card expiry month must be between 1 and 12'],
  ])('blocks validate with month=%s (VR-067 boundary)', async (month, expected) => {
    const user = userEvent.setup()
    await goToEdit(user)
    const monthInput = screen.getByLabelText('Expiry Month (1-12)')
    await user.clear(monthInput)
    await user.type(monthInput, month)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText(expected)).toBeInTheDocument()
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
  })

  it.each(['1', '12'])('accepts the boundary month=%s and proceeds to confirm (VR-067)', async (month) => {
    const user = userEvent.setup()
    await goToEdit(user)
    const monthInput = screen.getByLabelText('Expiry Month (1-12)')
    await user.clear(monthInput)
    await user.type(monthInput, month)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByTestId('confirm-actions')).toBeInTheDocument()
  })

  it.each([
    ['1949', 'Invalid card expiry year'],
    ['2100', 'Invalid card expiry year'],
  ])('blocks validate with year=%s (VR-068 boundary)', async (year, expected) => {
    const user = userEvent.setup()
    await goToEdit(user)
    const yearInput = screen.getByLabelText('Expiry Year (1950-2099)')
    await user.clear(yearInput)
    await user.type(yearInput, year)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText(expected)).toBeInTheDocument()
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
  })

  it('blocks validate with "Card Active Status must be Y or N" for an invalid status value', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    const statusInput = screen.getByLabelText('Card Active Status (Y/N)')
    await user.clear(statusInput)
    await user.type(statusInput, 'X')
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Card Active Status must be Y or N')).toBeInTheDocument()
  })

  // Fixed defect (see ../DEFECTS.md #1): the "no change" comparison now uses the shared
  // field-by-field `fieldsEqual()` helper (src/validation/rules.ts) instead of a key-order-
  // sensitive JSON.stringify comparison, so an untouched form correctly reports no change
  // regardless of how buildDraft()'s object literal vs. the fetched CardFields DTO order
  // their keys.
  it('shows "No change detected" when validated values equal the fetched snapshot', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('No change detected with respect to values fetched.')).toBeInTheDocument()
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
  })

  it('F12 = Cancel from confirm reverts fields and returns to the edit step', async () => {
    const user = userEvent.setup()
    await goToEdit(user)
    const nameInput = screen.getByLabelText('Cardholder Name on Card')
    await user.clear(nameInput)
    await user.type(nameInput, 'JANE Q PUBLIC')
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F12 = Cancel' }))
    expect(screen.queryByTestId('confirm-actions')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Cardholder Name on Card')).toHaveValue('JOHN Q PUBLIC')
  })

  it('save failure with a 400 validation error maps field errors from the backend', async () => {
    server.use(
      http.get('/api/cards/:cardNum', () => HttpResponse.json(baseCard)),
      http.put('/api/cards/:cardNum', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed.',
            errors: [{ field: 'embossedName', message: 'Card name can only contain alphabets and spaces' }],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Card Number'), baseCard.cardNum)
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const nameInput = await screen.findByLabelText('Cardholder Name on Card')
    await user.clear(nameInput)
    await user.type(nameInput, 'JANE Q PUBLIC')
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('Card name can only contain alphabets and spaces')).toBeInTheDocument()
    expect(await screen.findByText('Validation failed.')).toBeInTheDocument()
  })

  it('maps a backend expirationDate error onto the expiry-month control and surfaces a cvvCd error in the summary', async () => {
    server.use(
      http.get('/api/cards/:cardNum', () => HttpResponse.json(baseCard)),
      http.put('/api/cards/:cardNum', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed.',
            errors: [
              { field: 'expirationDate', message: 'Card expiry month must be between 1 and 12' },
              { field: 'cvvCd', message: 'CVV must be 3 digits' },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Card Number'), baseCard.cardNum)
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const nameInput = await screen.findByLabelText('Cardholder Name on Card')
    await user.clear(nameInput)
    await user.type(nameInput, 'JANE Q PUBLIC')
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    const confirmActions = await screen.findByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F5 = Save' }))
    expect(await screen.findByText('Card expiry month must be between 1 and 12')).toBeInTheDocument()
    expect(screen.getByLabelText('Expiry Month (1-12)')).toHaveAttribute('aria-invalid', 'true')
    expect(await screen.findByText(/CVV must be 3 digits/)).toBeInTheDocument()
  })
})
