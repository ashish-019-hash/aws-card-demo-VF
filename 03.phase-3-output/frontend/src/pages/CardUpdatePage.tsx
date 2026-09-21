import { useState, type FormEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { CardDetail, CardFields } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar, type Message } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { alphaRequired, expiryMonth, expiryYear, fieldsEqual, focusFirstInvalidField, hasErrors, required, yesNo, type FieldErrors } from '../validation/rules'
import { formatAccountId } from '../format'

type Step = 'search' | 'edit' | 'confirm'

// Backend field names that have a rendered error slot on this screen. `expirationDate` is
// remapped onto the expiry-month control below; `cvvCd` has no input here (the legacy screen
// does not edit CVV) so a backend error on it falls through to the message-bar summary.
const KNOWN_CARD_FIELDS: readonly string[] = ['embossedName', 'activeStatus', 'expirationDate']
const VALIDATE_FIELD_ORDER = ['embossedName', 'activeStatus', 'expiryMonth', 'expiryYear']

function splitExpiry(expirationDate: string | null): { month: string; year: string; day: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expirationDate ?? '')
  if (!m) return { month: '', year: '', day: '01' }
  return { year: m[1], month: m[2], day: m[3] }
}

function combineExpiry(month: string, year: string, day: string): string {
  const mm = month.padStart(2, '0')
  return `${year}-${mm}-${day}`
}

function validateCardFields(embossedName: string, status: string, month: string, year: string): FieldErrors {
  return {
    embossedName:
      required(embossedName, 'Card name not provided') ??
      alphaRequired(embossedName, 'Card name can only contain alphabets and spaces'),
    activeStatus: yesNo(status, 'Card Active Status must be Y or N'),
    expiryMonth:
      required(month, 'Card expiry month must be between 1 and 12') ??
      expiryMonth(Number(month), 'Card expiry month must be between 1 and 12'),
    expiryYear:
      required(year, 'Invalid card expiry year') ?? expiryYear(Number(year), 'Invalid card expiry year'),
  }
}

export function CardUpdatePage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/menu'
  const [step, setStep] = useState<Step>('search')
  const [cardNum, setCardNum] = useState(searchParams.get('cardNum') ?? '')
  const [searchError, setSearchError] = useState<string | undefined>()
  const [card, setCard] = useState<CardDetail | null>(null)
  const [expected, setExpected] = useState<CardFields | null>(null)
  const [embossedName, setEmbossedName] = useState('')
  const [status, setStatus] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [day, setDay] = useState('01')
  const [cvv, setCvv] = useState<number | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<Message | null>(null)

  async function lookup(num: string) {
    try {
      const detail = await endpoints.getCard(num)
      setCard(detail)
      setExpected(detail.fields)
      setEmbossedName(detail.fields.embossedName ?? '')
      setStatus(detail.fields.activeStatus ?? '')
      setCvv(detail.fields.cvvCd)
      const { month: m, year: y, day: d } = splitExpiry(detail.fields.expirationDate)
      setMonth(m)
      setYear(y)
      setDay(d)
      setStep('edit')
      setMessage(null)
      setErrors({})
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Unable to look up card.' })
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const err = required(cardNum, 'Card number not provided')
    setSearchError(err)
    if (err) return
    void lookup(cardNum.trim())
  }

  function buildDraft(): CardFields {
    return {
      cvvCd: cvv,
      embossedName,
      activeStatus: status,
      expirationDate: combineExpiry(month, year, day),
    }
  }

  function handleValidate(e: FormEvent) {
    e.preventDefault()
    if (!expected) return
    const fieldErrors = validateCardFields(embossedName, status, month, year)
    setErrors(fieldErrors)
    if (hasErrors(fieldErrors)) {
      setMessage(null)
      focusFirstInvalidField(fieldErrors, VALIDATE_FIELD_ORDER)
      return
    }
    const draft = buildDraft()
    if (fieldsEqual(draft, expected)) {
      setMessage({ kind: 'info', text: 'No change detected with respect to values fetched.' })
      return
    }
    setMessage({ kind: 'info', text: 'Changes validated.Press F5 to save' })
    setStep('confirm')
  }

  async function handleSave() {
    if (!expected || !card) return
    try {
      const response = await endpoints.updateCard(card.cardNum, { expected, updated: buildDraft() })
      if (response.changed) {
        setMessage({ kind: 'success', text: 'Changes committed to database' })
      } else {
        setMessage({ kind: 'info', text: 'No change detected with respect to values fetched.' })
      }
      setCard(response.card)
      setExpected(response.card.fields)
      setStep('edit')
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setMessage({ kind: 'error', text: e.message })
        try {
          const fresh = await endpoints.getCard(card.cardNum)
          setCard(fresh)
          setExpected(fresh.fields)
          setEmbossedName(fresh.fields.embossedName ?? '')
          setStatus(fresh.fields.activeStatus ?? '')
          setCvv(fresh.fields.cvvCd)
          const { month: m, year: y, day: d } = splitExpiry(fresh.fields.expirationDate)
          setMonth(m)
          setYear(y)
          setDay(d)
        } catch {
          /* keep showing the conflict message even if refresh fails */
        }
      } else if (e instanceof ApiError && e.status === 400) {
        const { fieldErrors, unmapped } = e.fieldErrors(KNOWN_CARD_FIELDS)
        if (fieldErrors.expirationDate) {
          fieldErrors.expiryMonth = fieldErrors.expirationDate
          delete fieldErrors.expirationDate
        }
        setErrors(fieldErrors)
        setMessage({ kind: 'error', text: unmapped.length ? `${e.message} ${unmapped.join(' ')}` : e.message })
      } else {
        setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Unable to save card.' })
      }
      setStep('edit')
    }
  }

  function handleCancel() {
    if (!expected) return
    setEmbossedName(expected.embossedName ?? '')
    setStatus(expected.activeStatus ?? '')
    const { month: m, year: y, day: d } = splitExpiry(expected.expirationDate)
    setMonth(m)
    setYear(y)
    setDay(d)
    setErrors({})
    setMessage(null)
    setStep('edit')
  }

  if (step === 'search') {
    return (
      <div className="screen">
        <ScreenHeader screenId="COCRDUPC" title="Update Card" />
        <MessageBar kind="error" message={message?.text} />
        <form onSubmit={handleSearch} className="form">
          <div className="form-row">
            <label htmlFor="cardNum">Card Number</label>
            <input id="cardNum" aria-invalid={Boolean(searchError)} aria-describedby={searchError ? 'cardNum-error' : undefined} value={cardNum} onChange={(e) => setCardNum(e.target.value)} maxLength={16} autoFocus />
            <FieldError id="cardNum-error" message={searchError} />
          </div>
          <div className="form-actions">
            <button type="submit">Enter</button>
          </div>
        </form>
        <BackLink to={backTo} />
      </div>
    )
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="COCRDUPC" title="Update Card" />
      <MessageBar kind={message?.kind ?? 'info'} message={message?.text} />
      <form onSubmit={handleValidate} className="form">
        <div className="form-row">
          <label>Account ID</label>
          <span>{formatAccountId(card?.acctId)}</span>
        </div>
        <div className="form-row">
          <label>Card Number</label>
          <span>{card?.cardNum}</span>
        </div>
        <div className="form-row">
          <label htmlFor="embossedName">Cardholder Name on Card</label>
          <input
            id="embossedName"
            aria-invalid={Boolean(errors.embossedName)}
            aria-describedby={errors.embossedName ? 'embossedName-error' : undefined}
            value={embossedName}
            disabled={step === 'confirm'}
            onChange={(e) => setEmbossedName(e.target.value)}
          />
          <FieldError id="embossedName-error" message={errors.embossedName} />
        </div>
        <div className="form-row">
          <label htmlFor="activeStatus">Card Active Status (Y/N)</label>
          <input
            id="activeStatus"
            aria-invalid={Boolean(errors.activeStatus)}
            aria-describedby={errors.activeStatus ? 'activeStatus-error' : undefined}
            value={status}
            maxLength={1}
            disabled={step === 'confirm'}
            onChange={(e) => setStatus(e.target.value)}
          />
          <FieldError id="activeStatus-error" message={errors.activeStatus} />
        </div>
        <div className="form-row">
          <label htmlFor="expiryMonth">Expiry Month (1-12)</label>
          <input
            id="expiryMonth"
            aria-invalid={Boolean(errors.expiryMonth)}
            aria-describedby={errors.expiryMonth ? 'expiryMonth-error' : undefined}
            value={month}
            disabled={step === 'confirm'}
            onChange={(e) => setMonth(e.target.value)}
          />
          <FieldError id="expiryMonth-error" message={errors.expiryMonth} />
        </div>
        <div className="form-row">
          <label htmlFor="expiryYear">Expiry Year (1950-2099)</label>
          <input
            id="expiryYear"
            aria-invalid={Boolean(errors.expiryYear)}
            aria-describedby={errors.expiryYear ? 'expiryYear-error' : undefined}
            value={year}
            disabled={step === 'confirm'}
            onChange={(e) => setYear(e.target.value)}
          />
          <FieldError id="expiryYear-error" message={errors.expiryYear} />
        </div>

        {step === 'edit' && (
          <div className="form-actions">
            <button type="submit">Enter (validate)</button>
          </div>
        )}
      </form>

      {step === 'confirm' && (
        <div className="form-actions" data-testid="confirm-actions">
          <button type="button" onClick={() => void handleSave()}>
            F5 = Save
          </button>
          <button type="button" onClick={handleCancel}>
            F12 = Cancel
          </button>
        </div>
      )}
      <BackLink to={backTo} />
    </div>
  )
}
