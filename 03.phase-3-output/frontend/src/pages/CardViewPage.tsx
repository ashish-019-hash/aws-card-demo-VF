import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { CardDetail } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { optionalNonZeroDigits, optionalNonZeroNumeric, isBlank } from '../validation/rules'

export function CardViewPage() {
  const [searchParams] = useSearchParams()
  const [acctFilter, setAcctFilter] = useState('')
  const [cardFilter, setCardFilter] = useState(searchParams.get('cardNum') ?? '')
  const [card, setCard] = useState<CardDetail | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ acctFilter?: string; cardFilter?: string; both?: string }>({})

  async function lookup(cardNum: string) {
    try {
      const detail = await endpoints.getCard(cardNum)
      setCard(detail)
      setMessage(null)
    } catch (e) {
      setCard(null)
      setMessage(e instanceof ApiError ? e.message : 'Unable to look up card.')
    }
  }

  useEffect(() => {
    const initial = searchParams.get('cardNum')
    if (initial) void lookup(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors: { acctFilter?: string; cardFilter?: string; both?: string } = {
      acctFilter: optionalNonZeroNumeric(acctFilter, 11, 'ACCOUNT FILTER,IF SUPPLIED MUST BE A 11 DIGIT NUMBER'),
      cardFilter: optionalNonZeroDigits(cardFilter, 16, 'CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER'),
    }
    if (isBlank(acctFilter) && isBlank(cardFilter)) {
      nextErrors.both = 'Account ID or Card Number must be entered...'
    }
    setErrors(nextErrors)
    if (nextErrors.acctFilter || nextErrors.cardFilter || nextErrors.both) return
    void lookup(cardFilter.trim())
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COCRDSLC" title="View Card Detail" />
      <MessageBar kind="error" message={message ?? errors.both} />
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label htmlFor="acctFilter">Account ID</label>
          <input id="acctFilter" value={acctFilter} onChange={(e) => setAcctFilter(e.target.value)} maxLength={11} />
          <FieldError message={errors.acctFilter} />
        </div>
        <div className="form-row">
          <label htmlFor="cardFilter">Card Number</label>
          <input id="cardFilter" value={cardFilter} onChange={(e) => setCardFilter(e.target.value)} maxLength={16} />
          <FieldError message={errors.cardFilter} />
        </div>
        <div className="form-actions">
          <button type="submit">Enter</button>
        </div>
      </form>

      {card && (
        <dl className="detail-grid" data-testid="card-detail">
          <dt>Account ID</dt>
          <dd>{card.acctId}</dd>
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
      <BackLink to="/menu" />
    </div>
  )
}
