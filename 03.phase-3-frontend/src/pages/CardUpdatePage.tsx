import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, LoadingState, MessageBar, PageHeader } from '../components/ui'
import type { MessageTone } from '../components/ui'
import { CardArt } from '../features/cards/CardArt'
import { CardSearchForm } from '../features/cards/CardSearchForm'
import { CardUpdateForm } from '../features/cards/CardUpdateForm'
import { cardToFormValues } from '../features/cards/formValues'
import type { CardUpdatePhase } from '../features/cards/formValues'
import formStyles from '../features/cards/forms.module.css'
import { cardMessages } from '../features/cards/messages'
import { fetchCard, saveCard } from '../features/cards/service'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import type { AsyncState } from '../types/async'
import type { CreditCard } from '../types/card'
import type { CardUpdateFormValues } from '../validation/cardUpdate'

interface PageMessage {
  tone: MessageTone
  text: string
}

/** How long the "returning to the card list" message stays visible. */
const RETURN_DELAY_MS = 1200

/** SCREEN-08 COCRDUP — edit a card's name, status and expiry with save confirmation (STORY-011). */
export function CardUpdatePage() {
  useDocumentTitle('Card Update')
  const { accountId, cardNumber } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [lookup, setLookup] = useState<AsyncState<CreditCard>>({ status: 'idle' })
  const [baseline, setBaseline] = useState<CardUpdateFormValues | null>(null)
  const [phase, setPhase] = useState<CardUpdatePhase>('editing')
  const [message, setMessage] = useState<PageMessage | null>(null)
  const [refocusToken, setRefocusToken] = useState(0)
  const pendingRef = useRef<CardUpdateFormValues | null>(null)
  const requestSeqRef = useRef(0)
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runLookup = (keys: { accountId: string; cardNumber: string }) => {
    const seq = ++requestSeqRef.current
    setMessage(null)
    setPhase('editing')
    setLookup({ status: 'loading' })
    void fetchCard(keys.accountId, keys.cardNumber).then((result) => {
      if (seq !== requestSeqRef.current) {
        return // A newer lookup superseded this one.
      }
      if (result.ok) {
        setBaseline(cardToFormValues(result.data))
        setLookup({ status: 'success', data: result.data })
      } else {
        setBaseline(null)
        setLookup({ status: 'error', message: result.message })
        setRefocusToken((token) => token + 1)
      }
    })
  }

  useEffect(() => {
    if (accountId && cardNumber) {
      runLookup({ accountId, cardNumber })
    }
    return () => {
      requestSeqRef.current += 1
      if (returnTimerRef.current) {
        clearTimeout(returnTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, cardNumber])

  const handleValidated = (values: CardUpdateFormValues, changed: boolean) => {
    if (!changed) {
      setPhase('editing')
      setMessage({ tone: 'warning', text: cardMessages.noChange })
      return
    }
    pendingRef.current = values
    setPhase('validated')
    setMessage({ tone: 'info', text: cardMessages.changesValidated })
  }

  const handleSave = () => {
    const pending = pendingRef.current
    if (!pending || lookup.status !== 'success') {
      return
    }
    const seq = requestSeqRef.current
    setPhase('saving')
    void saveCard(lookup.data, pending).then((result) => {
      if (seq !== requestSeqRef.current) {
        return // A newer lookup superseded this save.
      }
      if (result.ok) {
        // The response carries the bumped optimistic version.
        setLookup({ status: 'success', data: result.data })
        setBaseline(cardToFormValues(result.data))
        setPhase('saved')
        if (from === '/cards') {
          // Save completed after arriving from the list → back to the list.
          setMessage({ tone: 'success', text: cardMessages.changesSavedReturning })
          returnTimerRef.current = setTimeout(() => navigate('/cards'), RETURN_DELAY_MS)
        } else {
          setMessage({ tone: 'success', text: cardMessages.changesSaved })
        }
      } else {
        pendingRef.current = null
        setPhase('editing')
        setMessage({ tone: 'error', text: result.message })
      }
    })
  }

  const handleDiscard = () => {
    pendingRef.current = null
    setPhase('editing')
    setMessage(null)
  }

  const handleEdited = () => {
    pendingRef.current = null
    setPhase('editing')
    setMessage(null)
  }

  return (
    <AppShell>
      <PageHeader
        screen="COCRDUP"
        eyebrow="Cards"
        title="Card Update"
        description="Fetch a card, change its name, status or expiry, then save."
        actions={
          <Button variant="secondary" onClick={() => navigate(from ?? '/menu')}>
            {from === '/cards' ? 'Back to card list' : 'Back'}
          </Button>
        }
      />
      <div className={formStyles.stack}>
        {message ? (
          <MessageBar tone={message.tone} onDismiss={() => setMessage(null)}>
            {message.text}
          </MessageBar>
        ) : null}
        {lookup.status === 'error' ? <MessageBar tone="error">{lookup.message}</MessageBar> : null}
        <CardSearchForm
          onSearch={runLookup}
          busy={lookup.status === 'loading'}
          initialAccountId={accountId ?? ''}
          initialCardNumber={cardNumber ?? ''}
          refocusToken={refocusToken}
        />
        {lookup.status === 'loading' ? <LoadingState label="Fetching card details…" /> : null}
        {lookup.status === 'success' && baseline ? (
          <div className={formStyles.detailGrid}>
            <CardUpdateForm
              accountId={lookup.data.accountId}
              cardNumber={lookup.data.cardNumber}
              baseline={baseline}
              phase={phase}
              onValidated={handleValidated}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onEdited={handleEdited}
            />
            <CardArt
              cardNumber={lookup.data.cardNumber}
              embossedName={baseline.embossedName}
              expiryMonth={baseline.expiryMonth}
              expiryYear={baseline.expiryYear}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}

export default CardUpdatePage
