import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ActiveStatusBadge,
  Button,
  Card,
  DescriptionList,
  LoadingState,
  MessageBar,
  PageHeader,
} from '../components/ui'
import { CardArt } from '../features/cards/CardArt'
import { CardSearchForm } from '../features/cards/CardSearchForm'
import { formatCardNumber, splitExpiry } from '../features/cards/format'
import formStyles from '../features/cards/forms.module.css'
import { fetchCard } from '../features/cards/service'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import type { AsyncState } from '../types/async'
import type { CreditCard } from '../types/card'

/** SCREEN-07 COCRDSL — one card's embossed name, status and expiry (STORY-010). */
export function CardDetailPage() {
  useDocumentTitle('Card View')
  const { accountId, cardNumber } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [lookup, setLookup] = useState<AsyncState<CreditCard>>({ status: 'idle' })
  const [refocusToken, setRefocusToken] = useState(0)
  const requestSeqRef = useRef(0)

  const runLookup = (keys: { accountId: string; cardNumber: string }) => {
    const seq = ++requestSeqRef.current
    setLookup({ status: 'loading' })
    void fetchCard(keys.accountId, keys.cardNumber).then((result) => {
      if (seq !== requestSeqRef.current) {
        return // A newer lookup superseded this one.
      }
      if (result.ok) {
        setLookup({ status: 'success', data: result.data })
      } else {
        setLookup({ status: 'error', message: result.message })
        setRefocusToken((token) => token + 1)
      }
    })
  }

  // Arriving from the card list with a card selected starts the lookup.
  useEffect(() => {
    if (accountId && cardNumber) {
      runLookup({ accountId, cardNumber })
    }
    return () => {
      requestSeqRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, cardNumber])

  const expiry = lookup.status === 'success' ? splitExpiry(lookup.data.expirationDate) : null

  return (
    <AppShell>
      <PageHeader
        screen="COCRDSL"
        eyebrow="Cards"
        title="Card View"
        description="See one credit card's embossed name, status and expiry."
        actions={
          <Button variant="secondary" onClick={() => navigate(from ?? '/menu')}>
            {from === '/cards' ? 'Back to card list' : 'Back'}
          </Button>
        }
      />
      <div className={formStyles.stack}>
        {lookup.status === 'error' ? <MessageBar tone="error">{lookup.message}</MessageBar> : null}
        <CardSearchForm
          onSearch={runLookup}
          busy={lookup.status === 'loading'}
          initialAccountId={accountId ?? ''}
          initialCardNumber={cardNumber ?? ''}
          refocusToken={refocusToken}
        />
        {lookup.status === 'loading' ? <LoadingState label="Looking up card…" /> : null}
        {lookup.status === 'success' && expiry ? (
          <div className={formStyles.detailGrid}>
            <Card
              title="Card details"
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/cards/update/${lookup.data.accountId}/${lookup.data.cardNumber}`, {
                      state: { from },
                    })
                  }
                >
                  Update this card
                </Button>
              }
            >
              <DescriptionList
                items={[
                  { label: 'Embossed name', value: lookup.data.embossedName },
                  { label: 'Card status', value: <ActiveStatusBadge status={lookup.data.activeStatus} /> },
                  { label: 'Expiry', value: `${expiry.expiryMonth} / ${expiry.expiryYear}`, mono: true },
                  { label: 'Account', value: lookup.data.accountId, mono: true },
                  { label: 'Card number', value: formatCardNumber(lookup.data.cardNumber), mono: true },
                ]}
              />
            </Card>
            <CardArt
              cardNumber={lookup.data.cardNumber}
              embossedName={lookup.data.embossedName}
              expiryMonth={expiry.expiryMonth}
              expiryYear={expiry.expiryYear}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}

export default CardDetailPage
