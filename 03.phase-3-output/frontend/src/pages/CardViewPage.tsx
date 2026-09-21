import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { CardDetail, CardSummary } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { optionalNonZeroDigits, isBlank } from '../validation/rules'
import { formatAccountId } from '../format'

export function CardViewPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/menu'
  const [acctFilter, setAcctFilter] = useState('')
  const [cardFilter, setCardFilter] = useState(searchParams.get('cardNum') ?? '')
  const [card, setCard] = useState<CardDetail | null>(null)
  const [matches, setMatches] = useState<CardSummary[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ acctFilter?: string; cardFilter?: string; both?: string }>({})

  // STORY-023 (COCRDSLC 9000-READ-DATA): when both filters are supplied the card is read
  // by card number and then its account id must match the entered account; otherwise the
  // legacy screen reports "Did not find cards for this search condition".
  async function lookupByCardNumber(cardNum: string, acctId?: string) {
    try {
      const detail = await endpoints.getCard(cardNum)
      if (acctId !== undefined && detail.acctId !== Number(acctId)) {
        setCard(null)
        setMatches(null)
        setMessage('Did not find cards for this search condition')
        return
      }
      setCard(detail)
      setMatches(null)
      setMessage(null)
    } catch (e) {
      setCard(null)
      setMatches(null)
      setMessage(e instanceof ApiError ? e.message : 'Unable to look up card.')
    }
  }

  // STORY-023/VR-057 (COCRDSLC): an account-only search (no card number supplied) must
  // look up cards *by account*, not re-use the card-number lookup with a blank card
  // number. If the account has exactly one card, show its full detail grid (following up
  // with a card-number lookup for the fields `listCards` doesn't return, e.g. cvv/expiry);
  // if it has more than one, list the matches so the user can pick one to view.
  // The list endpoint pages 7 cards at a time (COCRDLIC page size); follow hasNext so an
  // account with more than one page of cards shows every match, not just the first page.
  async function lookupByAccount(acctId: string) {
    try {
      const items: CardSummary[] = []
      let page = 0
      let hasNext = true
      while (hasNext) {
        const response = await endpoints.listCards({ acctId, page })
        items.push(...response.items)
        hasNext = response.hasNext && response.items.length > 0
        page += 1
      }
      if (items.length === 0) {
        setCard(null)
        setMatches(null)
        setMessage('Did not find cards for this search condition')
      } else if (items.length === 1) {
        setMatches(null)
        await lookupByCardNumber(items[0].cardNum)
      } else {
        setCard(null)
        setMatches(items)
        setMessage(null)
      }
    } catch (e) {
      setCard(null)
      setMatches(null)
      setMessage(e instanceof ApiError ? e.message : 'Unable to look up card.')
    }
  }

  useEffect(() => {
    const initial = searchParams.get('cardNum')
    if (initial) void lookupByCardNumber(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors: { acctFilter?: string; cardFilter?: string; both?: string } = {
      acctFilter: optionalNonZeroDigits(acctFilter, 11, 'ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER'),
      cardFilter: optionalNonZeroDigits(cardFilter, 16, 'CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER'),
    }
    if (isBlank(acctFilter) && isBlank(cardFilter)) {
      nextErrors.both = 'Account ID or Card Number must be entered...'
    }
    setErrors(nextErrors)
    if (nextErrors.acctFilter || nextErrors.cardFilter || nextErrors.both) return
    if (!isBlank(cardFilter)) {
      void lookupByCardNumber(cardFilter.trim(), isBlank(acctFilter) ? undefined : acctFilter.trim())
    } else {
      void lookupByAccount(acctFilter.trim())
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COCRDSLC" title="View Card Detail" />
      <MessageBar kind="error" message={message ?? errors.both} />
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label htmlFor="acctFilter">Account ID</label>
          <input id="acctFilter" aria-invalid={Boolean(errors.acctFilter)} aria-describedby={errors.acctFilter ? 'acctFilter-error' : undefined} value={acctFilter} onChange={(e) => setAcctFilter(e.target.value)} maxLength={11} />
          <FieldError id="acctFilter-error" message={errors.acctFilter} />
        </div>
        <div className="form-row">
          <label htmlFor="cardFilter">Card Number</label>
          <input id="cardFilter" aria-invalid={Boolean(errors.cardFilter)} aria-describedby={errors.cardFilter ? 'cardFilter-error' : undefined} value={cardFilter} onChange={(e) => setCardFilter(e.target.value)} maxLength={16} />
          <FieldError id="cardFilter-error" message={errors.cardFilter} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      {matches && (
        <table className="data-table" data-testid="card-matches">
          <thead>
            <tr>
              <th>Account Number</th>
              <th>Card Number</th>
              <th>Card Status</th>
              <th>Embossed Name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.cardNum}>
                <td>{formatAccountId(m.acctId)}</td>
                <td>{m.cardNum}</td>
                <td>{m.activeStatus}</td>
                <td>{m.embossedName}</td>
                <td>
                  <Link to={`/cards/view?cardNum=${m.cardNum}`} state={{ from: backTo }}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {card && (
        <dl className="detail-grid" data-testid="card-detail">
          <dt>Account ID</dt>
          <dd>{formatAccountId(card.acctId)}</dd>
          <dt>Card Number</dt>
          <dd>{card.cardNum}</dd>
          <dt>Cardholder Name on Card</dt>
          <dd>{card.fields.embossedName}</dd>
          <dt>Active Status</dt>
          <dd>{card.fields.activeStatus}</dd>
          <dt>Expiry Date</dt>
          <dd>{card.fields.expirationDate}</dd>
        </dl>
      )}
      <BackLink to={backTo} />
    </div>
  )
}
