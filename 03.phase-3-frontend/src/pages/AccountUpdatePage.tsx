import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, LoadingState, MessageBar, PageHeader } from '../components/ui'
import type { MessageTone } from '../components/ui'
import { AccountSearchForm } from '../features/accounts/AccountSearchForm'
import { AccountUpdateForm } from '../features/accounts/AccountUpdateForm'
import { profileToFormValues } from '../features/accounts/formValues'
import type { UpdatePhase } from '../features/accounts/formValues'
import formStyles from '../features/accounts/forms.module.css'
import { accountMessages } from '../features/accounts/messages'
import {
  fetchAccountProfile,
  saveAccountProfile,
  serviceUnavailableMessage,
} from '../features/accounts/service'
import type { AccountProfile } from '../features/accounts/service'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AppShell } from '../layouts/AppShell'
import type { AsyncState } from '../types/async'
import type { AccountUpdateFormValues } from '../validation/accountUpdate'

interface PageMessage {
  tone: MessageTone
  text: string
}

/** SCREEN-05 COACTUP — fetch, edit, validate and save account + customer details (STORY-007). */
export function AccountUpdatePage() {
  useDocumentTitle('Account Update')
  const { accountId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [lookup, setLookup] = useState<AsyncState<AccountProfile>>({ status: 'idle' })
  const [baseline, setBaseline] = useState<AccountUpdateFormValues | null>(null)
  const [phase, setPhase] = useState<UpdatePhase>('editing')
  const [message, setMessage] = useState<PageMessage | null>(null)
  const [refocusToken, setRefocusToken] = useState(0)
  const pendingRef = useRef<AccountUpdateFormValues | null>(null)
  const requestSeqRef = useRef(0)

  const runLookup = (id: string) => {
    const seq = ++requestSeqRef.current
    setMessage(null)
    setPhase('editing')
    setLookup({ status: 'loading' })
    void fetchAccountProfile(id).then((result) => {
      if (seq !== requestSeqRef.current) {
        return // A newer lookup superseded this one.
      }
      if (result.ok) {
        setBaseline(profileToFormValues(result.data))
        setLookup({ status: 'success', data: result.data })
      } else {
        setBaseline(null)
        setLookup({ status: 'error', message: result.message })
        setRefocusToken((token) => token + 1)
      }
    })
  }

  useEffect(() => {
    if (accountId) {
      runLookup(accountId)
    }
    return () => {
      requestSeqRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  const handleValidated = (values: AccountUpdateFormValues, changed: boolean) => {
    if (!changed) {
      setPhase('editing')
      setMessage({ tone: 'warning', text: accountMessages.noChange })
      return
    }
    pendingRef.current = values
    setPhase('validated')
    setMessage({ tone: 'info', text: accountMessages.changesValidated })
  }

  const handleSave = () => {
    const pending = pendingRef.current
    if (!pending || lookup.status !== 'success') {
      return
    }
    const seq = requestSeqRef.current
    setPhase('saving')
    void saveAccountProfile(lookup.data, pending).then((result) => {
      if (seq !== requestSeqRef.current) {
        return // A newer lookup superseded this save.
      }
      // Account and customer carry separate optimistic versions; keep both in
      // sync with the server even when only one side was committed.
      setLookup({ status: 'success', data: result.profile })
      if (result.ok) {
        setBaseline(profileToFormValues(result.profile))
        setPhase('saved')
        setMessage({ tone: 'success', text: accountMessages.changesSaved })
      } else {
        pendingRef.current = null
        setPhase('editing')
        setMessage({ tone: 'error', text: result.message ?? serviceUnavailableMessage })
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
        screen="COACTUP"
        eyebrow="Accounts"
        title="Account Update"
        description="Fetch an account, change its details, then save. Nothing is written until you confirm."
        actions={
          <Button variant="secondary" onClick={() => navigate(from ?? '/menu')}>
            Back
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
        <AccountSearchForm
          onSearch={runLookup}
          busy={lookup.status === 'loading'}
          initialAccountId={accountId ?? ''}
          refocusToken={refocusToken}
        />
        {lookup.status === 'loading' ? <LoadingState label="Fetching account details…" /> : null}
        {lookup.status === 'success' && baseline ? (
          <AccountUpdateForm
            accountId={lookup.data.account.id}
            customerId={lookup.data.customer.id}
            baseline={baseline}
            phase={phase}
            onValidated={handleValidated}
            onSave={handleSave}
            onDiscard={handleDiscard}
            onEdited={handleEdited}
          />
        ) : null}
      </div>
    </AppShell>
  )
}

export default AccountUpdatePage
