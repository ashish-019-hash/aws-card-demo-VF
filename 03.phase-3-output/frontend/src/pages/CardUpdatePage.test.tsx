import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../test/server'
import { CardUpdatePage } from './CardUpdatePage'

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

describe('CardUpdatePage confirm-gate flow', () => {
  it('search -> edit -> validate -> confirm -> save (changed:true) shows success', async () => {
    server.use(
      http.get('/api/cards/:cardNum', () => HttpResponse.json(baseCard)),
      http.put('/api/cards/:cardNum', () =>
        HttpResponse.json({
          changed: true,
          card: { ...baseCard, fields: { ...baseCard.fields, activeStatus: 'N' } },
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Card Number'), baseCard.cardNum)
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    const statusInput = await screen.findByLabelText('Card Active Status (Y/N)')
    expect(statusInput).toHaveValue('Y')
    await user.clear(statusInput)
    await user.type(statusInput, 'N')
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))

    expect(await screen.findByText('Changes validated.Press F5 to save')).toBeInTheDocument()
    const confirmActions = screen.getByTestId('confirm-actions')
    await user.click(within(confirmActions).getByRole('button', { name: 'F5 = Save' }))

    expect(await screen.findByText('Changes committed to database')).toBeInTheDocument()
  })

  it('save conflict (409) shows the backend message and refreshes the snapshot', async () => {
    let getCalls = 0
    server.use(
      http.get('/api/cards/:cardNum', () => {
        getCalls += 1
        return HttpResponse.json(baseCard)
      }),
      http.put('/api/cards/:cardNum', () =>
        HttpResponse.json(
          { code: 'CONFLICT', message: 'DATA_CHANGED: The record has been updated by another user.' },
          { status: 409 },
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
    await screen.findByTestId('confirm-actions')
    await user.click(screen.getByRole('button', { name: 'F5 = Save' }))

    expect(await screen.findByText('DATA_CHANGED: The record has been updated by another user.')).toBeInTheDocument()
    // initial lookup + post-conflict refresh
    expect(getCalls).toBe(2)
  })
})
