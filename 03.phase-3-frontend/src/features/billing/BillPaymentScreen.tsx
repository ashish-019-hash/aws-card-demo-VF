import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, ConfirmPanel, DescriptionList, MessageBar, PageHeader, TextField } from '../../components/ui'
import { ApiError, api } from '../../services/api'
import type { BillPaymentReceipt, BillPaymentSummary } from '../../types/billPayment'
import { billPaymentSchema, type BillPaymentFormValues } from '../../validation/billPayment'
import styles from './billing.module.css'
import { formatCurrency } from './format'

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'nothing-to-pay'; summary: BillPaymentSummary }
  | { kind: 'ready'; summary: BillPaymentSummary }
  | { kind: 'paying'; summary: BillPaymentSummary }
  | { kind: 'paid'; summary: BillPaymentSummary; receipt: BillPaymentReceipt }

/** SCREEN-13 COBIL00 — pay off an account's full current balance (STORY-017). */
export function BillPaymentScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/menu'

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  // Increments per request so stale (superseded or unmounted) responses are ignored.
  const requestSeqRef = useRef(0)

  const { register, handleSubmit, reset, setFocus, formState } = useForm<BillPaymentFormValues>({
    resolver: zodResolver(billPaymentSchema),
    mode: 'onBlur',
    defaultValues: { accountId: '', confirmation: '' },
  })

  useEffect(
    () => () => {
      requestSeqRef.current += 1
    },
    [],
  )

  // The balance comes from the account record (legacy COBIL00 ACCTDAT read).
  // RULE-VAL-064 (Acct ID required) is enforced by the schema before this
  // runs; existence (RULE-VAL-065) and the positive-balance rule
  // (RULE-VAL-066) stay server-backed against the looked-up account.
  async function lookUpBalance(values: BillPaymentFormValues) {
    const accountId = values.accountId.trim()
    const seq = ++requestSeqRef.current
    setPhase({ kind: 'loading' })
    try {
      const account = await api.accounts.get(accountId)
      if (seq !== requestSeqRef.current) return
      const summary: BillPaymentSummary = { accountId, currentBalance: account.currentBalance.toFixed(2) }
      if (account.currentBalance <= 0) {
        setPhase({ kind: 'nothing-to-pay', summary })
      } else {
        setPhase({ kind: 'ready', summary })
      }
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      const message =
        error instanceof ApiError && error.status === 404
          ? 'Account ID NOT found.'
          : error instanceof ApiError
            ? error.message
            : 'Unable to lookup the account.'
      setPhase({ kind: 'error', message })
      setFocus('accountId')
    }
  }

  // Legacy CONFIRM Y/N field: Yes pays the full balance, No clears the screen.
  async function handleConfirm(value: 'Y' | 'N') {
    if (phase.kind !== 'ready') return
    if (value === 'N') {
      clear()
      return
    }
    const summary = phase.summary
    const seq = ++requestSeqRef.current
    setPhase({ kind: 'paying', summary })
    try {
      const response = await api.billing.pay(summary.accountId, 'Y')
      if (seq !== requestSeqRef.current) return
      setPhase({
        kind: 'paid',
        summary,
        receipt: {
          transactionId: response.transactionId,
          amountPaid: response.amount.toFixed(2),
          newBalance: response.resultingBalance.toFixed(2),
        },
      })
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      const message = error instanceof ApiError ? error.message : 'Unable to process the bill payment.'
      setPhase({ kind: 'error', message })
      setFocus('accountId')
    }
  }

  // Legacy F4: clear the screen.
  function clear() {
    requestSeqRef.current += 1
    reset({ accountId: '', confirmation: '' })
    setPhase({ kind: 'idle' })
    setFocus('accountId')
  }

  return (
    <>
      <PageHeader
        screen="COBIL00"
        eyebrow="Transactions"
        title="Bill Payment"
        description="Pay off an account's full current balance. The payment is recorded as a transaction."
        actions={
          <Button variant="secondary" onClick={() => navigate(backTo)}>
            Back to menu
          </Button>
        }
      />

      {phase.kind === 'error' ? (
        <MessageBar tone="error" className={styles.messageSlot}>
          {phase.message}
        </MessageBar>
      ) : null}
      {phase.kind === 'nothing-to-pay' ? (
        <MessageBar tone="warning" className={styles.messageSlot}>
          You have nothing to pay. This account&apos;s current balance is{' '}
          {formatCurrency(phase.summary.currentBalance)}.
        </MessageBar>
      ) : null}
      {phase.kind === 'paid' ? (
        <MessageBar tone="success" className={styles.messageSlot}>
          Payment successful. Your Transaction ID is {phase.receipt.transactionId}.
        </MessageBar>
      ) : null}

      <Card title="Account">
        <form className={styles.lookupForm} onSubmit={handleSubmit((values) => void lookUpBalance(values))} noValidate>
          <TextField
            label="Account ID"
            requiredIndicator
            mono
            inputMode="numeric"
            maxLength={11}
            error={formState.errors.accountId?.message}
            fieldClassName={styles.lookupField}
            {...register('accountId')}
          />
          <div className={styles.lookupActions}>
            <Button type="submit" loading={phase.kind === 'loading'}>
              Look up balance
            </Button>
            <Button variant="secondary" onClick={clear}>
              Clear
            </Button>
          </div>
        </form>
      </Card>

      {phase.kind === 'nothing-to-pay' ? (
        <Card title="Balance" className={styles.resultCard}>
          <DescriptionList
            items={[
              { label: 'Account', value: phase.summary.accountId, mono: true },
              { label: 'Current balance', value: formatCurrency(phase.summary.currentBalance), mono: true },
            ]}
          />
        </Card>
      ) : null}

      {phase.kind === 'ready' || phase.kind === 'paying' ? (
        <Card title="Confirm payment" className={styles.resultCard}>
          <DescriptionList columns={1} items={[{ label: 'Account', value: phase.summary.accountId, mono: true }]} />
          <p className={styles.balanceLabel}>Current balance due</p>
          <p className={styles.balanceValue}>{formatCurrency(phase.summary.currentBalance)}</p>
          <ConfirmPanel
            className={styles.confirmSlot}
            message="Confirm to make a bill payment."
            confirmLabel="Yes, pay full balance"
            cancelLabel="No"
            busy={phase.kind === 'paying'}
            onResult={(value) => void handleConfirm(value)}
          />
          <p className={styles.explanation}>
            This pays the entire current balance; partial payments are not available. It will be recorded as BILL
            PAYMENT - ONLINE and the account balance will be set to $0.00.
          </p>
        </Card>
      ) : null}

      {phase.kind === 'paid' ? (
        <Card
          title="Payment recorded"
          className={styles.resultCard}
          footer={
            <div className={styles.footerActions}>
              <Button variant="secondary" onClick={clear}>
                Make another payment
              </Button>
              <Button variant="ghost" onClick={() => navigate(backTo)}>
                Back to menu
              </Button>
            </div>
          }
        >
          <DescriptionList
            items={[
              { label: 'Account', value: phase.summary.accountId, mono: true },
              { label: 'Amount paid', value: formatCurrency(phase.receipt.amountPaid), mono: true },
              { label: 'New balance', value: formatCurrency(phase.receipt.newBalance), mono: true },
              { label: 'Recorded as', value: 'BILL PAYMENT - ONLINE' },
            ]}
          />
        </Card>
      ) : null}
    </>
  )
}
