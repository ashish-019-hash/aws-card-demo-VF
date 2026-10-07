import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, LoadingState, MessageBar } from '../components/ui'
import { PageHeader } from '../components/ui'
import { AccountProfileView } from '../features/accounts/AccountProfileView'
import { AccountSearchForm } from '../features/accounts/AccountSearchForm'
import { fetchAccountProfile } from '../features/accounts/service'
import type { AccountProfile } from '../features/accounts/service'
import formStyles from '../features/accounts/forms.module.css'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import type { AsyncState } from '../types/async'

/** SCREEN-04 COACTVW — account lookup with full account + customer detail (STORY-006). */
export function AccountViewPage() {
  useDocumentTitle('Account View')
  const { accountId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [lookup, setLookup] = useState<AsyncState<AccountProfile>>({ status: 'idle' })
  const [refocusToken, setRefocusToken] = useState(0)
  const requestSeqRef = useRef(0)

  const runLookup = (id: string) => {
    const seq = ++requestSeqRef.current
    setLookup({ status: 'loading' })
    void fetchAccountProfile(id).then((result) => {
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

  // Arriving from another screen with an account selected starts the lookup.
  useEffect(() => {
    if (accountId) {
      runLookup(accountId)
    }
    return () => {
      requestSeqRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  return (
    <AppShell>
      <PageHeader
        screen="COACTVW"
        eyebrow="Accounts"
        title="Account View"
        description="Look up an account to see its status, limits, balances and customer details."
        actions={
          <Button variant="secondary" onClick={() => navigate(from ?? '/menu')}>
            Back
          </Button>
        }
      />
      <div className={formStyles.stack}>
        {lookup.status === 'error' ? <MessageBar tone="error">{lookup.message}</MessageBar> : null}
        <AccountSearchForm
          onSearch={runLookup}
          busy={lookup.status === 'loading'}
          initialAccountId={accountId ?? ''}
          refocusToken={refocusToken}
        />
        {lookup.status === 'loading' ? <LoadingState label="Looking up account…" /> : null}
        {lookup.status === 'success' ? <AccountProfileView profile={lookup.data} /> : null}
      </div>
    </AppShell>
  )
}

export default AccountViewPage
