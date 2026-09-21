import { HttpResponse, http } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { CardListPage } from '../../pages/CardListPage'

const oneCard = {
  items: [{ acctId: 10, cardNum: '1111222233334444', activeStatus: 'Y', embossedName: 'JOHN Q PUBLIC' }],
  hasNext: false,
  hasPrevious: false,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CardListPage />
    </MemoryRouter>,
  )
}

describe('CardListPage (COCRDLIC)', () => {
  it('loads and renders the card list on initial mount (STORY: card list)', async () => {
    server.use(http.get('/api/cards', () => HttpResponse.json(oneCard)))
    renderPage()
    const table = await screen.findByTestId('card-list')
    expect(within(table).getByText('1111222233334444')).toBeInTheDocument()
    expect(within(table).getByText('JOHN Q PUBLIC')).toBeInTheDocument()
  })

  it('shows "No matching cards found." when the list is empty', async () => {
    server.use(http.get('/api/cards', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })))
    renderPage()
    expect(await screen.findByText('No matching cards found.')).toBeInTheDocument()
  })

  it('blocks search with the legacy message when the account filter is not an 11-digit number', async () => {
    server.use(http.get('/api/cards', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No matching cards found.')
    await user.type(screen.getByLabelText('Account ID filter'), 'ABC')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(
      await screen.findByText('ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER'),
    ).toBeInTheDocument()
  })

  it('blocks search with the legacy message when the card filter is not a 16-digit number', async () => {
    server.use(http.get('/api/cards', () => HttpResponse.json({ items: [], hasNext: false, hasPrevious: false })))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No matching cards found.')
    await user.type(screen.getByLabelText('Card Number filter'), '123')
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER')).toBeInTheDocument()
  })

  it('disables F7/F8 paging buttons appropriately and pages forward on F8', async () => {
    const page0 = { items: [{ acctId: 10, cardNum: '1111222233334444', activeStatus: 'Y', embossedName: 'A B' }], hasNext: true, hasPrevious: false }
    const page1 = { items: [{ acctId: 11, cardNum: '5555666677778888', activeStatus: 'Y', embossedName: 'C D' }], hasNext: false, hasPrevious: true }
    let calls = 0
    server.use(
      http.get('/api/cards', () => {
        calls += 1
        return HttpResponse.json(calls === 1 ? page0 : page1)
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('1111222233334444')
    const prevBtn = screen.getByRole('button', { name: 'F7 = Prev Page' })
    const nextBtn = screen.getByRole('button', { name: 'F8 = Next Page' })
    expect(prevBtn).toBeDisabled()
    expect(nextBtn).not.toBeDisabled()

    await user.click(nextBtn)
    expect(await screen.findByText('5555666677778888')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'F8 = Next Page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'F7 = Prev Page' })).not.toBeDisabled()
  })

  it('renders View and Update links to the correct card-scoped routes and a Back link to /menu', async () => {
    server.use(http.get('/api/cards', () => HttpResponse.json(oneCard)))
    renderPage()
    await screen.findByText('1111222233334444')
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/cards/view?cardNum=1111222233334444',
    )
    expect(screen.getByRole('link', { name: 'Update' })).toHaveAttribute(
      'href',
      '/cards/update?cardNum=1111222233334444',
    )
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })

  it('shows the backend error message when the list request fails', async () => {
    server.use(
      http.get('/api/cards', () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Unable to list cards right now.' }, { status: 500 }),
      ),
    )
    renderPage()
    expect(await screen.findByText('Unable to list cards right now.')).toBeInTheDocument()
  })
})
