import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { CardSummary } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { optionalNonZeroDigits } from '../validation/rules'
import { formatAccountId } from '../format'

export function CardListPage() {
  const [acctFilter, setAcctFilter] = useState('')
  const [cardFilter, setCardFilter] = useState('')
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<CardSummary[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ acctFilter?: string; cardFilter?: string }>({})

  const load = useCallback(async (targetPage: number) => {
    try {
      const response = await endpoints.listCards({
        acctId: acctFilter.trim() || undefined,
        cardNum: cardFilter.trim() || undefined,
        page: targetPage,
      })
      setItems(response.items)
      setHasNext(response.hasNext)
      setHasPrevious(response.hasPrevious)
      setPage(targetPage)
      if (response.items.length === 0) {
        setMessage('No matching cards found.')
      } else {
        setMessage(null)
      }
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Unable to load cards.')
    }
  }, [acctFilter, cardFilter])

  useEffect(() => {
    void load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const nextErrors = {
      acctFilter: optionalNonZeroDigits(acctFilter, 11, 'ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER'),
      cardFilter: optionalNonZeroDigits(cardFilter, 16, 'CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER'),
    }
    setErrors(nextErrors)
    if (nextErrors.acctFilter || nextErrors.cardFilter) return
    void load(0)
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COCRDLIC" title="List Credit Cards" />
      <MessageBar kind="error" message={message} />
      <form onSubmit={handleSearch} className="form">
        <div className="form-row">
          <label htmlFor="acctFilter">Account ID filter</label>
          <input id="acctFilter" aria-invalid={Boolean(errors.acctFilter)} aria-describedby={errors.acctFilter ? 'acctFilter-error' : undefined} value={acctFilter} onChange={(e) => setAcctFilter(e.target.value)} maxLength={11} />
          <FieldError id="acctFilter-error" message={errors.acctFilter} />
        </div>
        <div className="form-row">
          <label htmlFor="cardFilter">Card Number filter</label>
          <input id="cardFilter" aria-invalid={Boolean(errors.cardFilter)} aria-describedby={errors.cardFilter ? 'cardFilter-error' : undefined} value={cardFilter} onChange={(e) => setCardFilter(e.target.value)} maxLength={16} />
          <FieldError id="cardFilter-error" message={errors.cardFilter} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      <table className="data-table" data-testid="card-list">
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
          {items.map((card) => (
            <tr key={card.cardNum}>
              <td>{formatAccountId(card.acctId)}</td>
              <td>{card.cardNum}</td>
              <td>{card.activeStatus}</td>
              <td>{card.embossedName}</td>
              <td>
                <Link to={`/cards/view?cardNum=${card.cardNum}`} state={{ from: '/cards' }}>View</Link>{' '}
                <Link to={`/cards/update?cardNum=${card.cardNum}`} state={{ from: '/cards' }}>Update</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="form-actions">
        <button type="button" disabled={!hasPrevious} onClick={() => void load(page - 1)}>
          F7 = Prev Page
        </button>
        <button type="button" disabled={!hasNext} onClick={() => void load(page + 1)}>
          F8 = Next Page
        </button>
      </div>
      <BackLink to="/menu" />
    </div>
  )
}
