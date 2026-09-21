import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { CardViewPage } from '../../pages/CardViewPage'

const detail = {
  acctId: 10,
  cardNum: '1111222233334444',
  fields: {
    cvvCd: 123,
    embossedName: 'JOHN Q PUBLIC',
    expirationDate: '2027-05-01',
    activeStatus: 'Y',
  },
}

function renderPage(initialEntries?: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries ?? ['/cards/view']}>
      <CardViewPage />
    </MemoryRouter>,
  )
}

describe('CardViewPage (COCRDSLC)', () => {
  it('renders the screen header and filter inputs with no detail grid initially', () => {
    renderPage()
    expect(screen.getByText('COCRDSLC')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'View Card Detail' })).toBeInTheDocument()
    expect(screen.getByLabelText('Account ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Card Number')).toBeInTheDocument()
    expect(screen.queryByTestId('card-detail')).not.toBeInTheDocument()
  })

  it('auto-looks-up the card when cardNum is present in the URL search params', async () => {
    server.use(http.get('/api/cards/:cardNum', () => HttpResponse.json(detail)))
    renderPage(['/cards/view?cardNum=1111222233334444'])
    const grid = await screen.findByTestId('card-detail')
    expect(grid).toHaveTextContent('JOHN Q PUBLIC')
    expect(grid).toHaveTextContent('2027-05-01')
  })

  it('blocks submit with "must be entered" message when both filters are blank', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Account ID or Card Number must be entered...')).toBeInTheDocument()
    expect(screen.queryByTestId('card-detail')).not.toBeInTheDocument()
  })

  it('blocks submit with the legacy account-filter message for a non-numeric account filter', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), 'ABC')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(
      await screen.findByText('ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER'),
    ).toBeInTheDocument()
  })

  it('looks up by card number entered manually and renders the detail grid', async () => {
    server.use(http.get('/api/cards/:cardNum', () => HttpResponse.json(detail)))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Card Number'), detail.cardNum)
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const grid = await screen.findByTestId('card-detail')
    expect(grid).toHaveTextContent('1111222233334444')
    expect(grid).toHaveTextContent('Y')
  })

  it('shows the backend not-found message instead of the detail grid', async () => {
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
    expect(screen.queryByTestId('card-detail')).not.toBeInTheDocument()
  })

  it('has a Back link to the main menu', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })

  it('looks up by account only (no card number) and shows the single matching card detail', async () => {
    server.use(
      http.get('/api/cards', () =>
        HttpResponse.json({
          items: [{ acctId: 10, cardNum: '1111222233334444', activeStatus: 'Y', embossedName: 'JOHN Q PUBLIC' }],
          hasNext: false,
          hasPrevious: false,
        }),
      ),
      http.get('/api/cards/:cardNum', () => HttpResponse.json(detail)),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '00000000010')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const grid = await screen.findByTestId('card-detail')
    expect(grid).toHaveTextContent('1111222233334444')
    expect(grid).toHaveTextContent('JOHN Q PUBLIC')
  })

  it('looks up by account only and lists all matches when the account has more than one card', async () => {
    server.use(
      http.get('/api/cards', () =>
        HttpResponse.json({
          items: [
            { acctId: 10, cardNum: '1111222233334444', activeStatus: 'Y', embossedName: 'JOHN Q PUBLIC' },
            { acctId: 10, cardNum: '5555666677778888', activeStatus: 'Y', embossedName: 'JOHN Q PUBLIC' },
          ],
          hasNext: false,
          hasPrevious: false,
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '00000000010')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    const table = await screen.findByTestId('card-matches')
    expect(table).toHaveTextContent('1111222233334444')
    expect(table).toHaveTextContent('5555666677778888')
    expect(screen.queryByTestId('card-detail')).not.toBeInTheDocument()
  })

  it('looks up by account only and shows the not-found message when the account has no cards', async () => {
    server.use(http.get('/api/cards', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Account ID'), '00000000010')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Did not find cards for this search condition')).toBeInTheDocument()
  })
})
