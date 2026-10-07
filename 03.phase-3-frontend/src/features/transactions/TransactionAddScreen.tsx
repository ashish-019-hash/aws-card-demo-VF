import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, ConfirmPanel, MessageBar, PageHeader, TextField, type MessageTone } from '../../components/ui'
import { api, type TransactionRequest } from '../../services/api'
import { transactionAddSchema, validateTransactionKeys, type TransactionAddFormValues } from '../../validation/transactionAdd'
import { fetchLastTransaction, nextTransactionId, resolveTransactionKeys, toErrorMessage, toSignedAmount } from './service'
import styles from './transactions.module.css'

const emptyValues: TransactionAddFormValues = {
  accountId: '',
  cardNumber: '',
  transactionTypeCode: '',
  transactionCategoryCode: '',
  source: '',
  description: '',
  amount: '',
  originationTimestamp: '',
  processingTimestamp: '',
  merchantId: '',
  merchantName: '',
  merchantCity: '',
  merchantZip: '',
  confirmation: '',
}

/**
 * 'confirming' and 'saving' carry a snapshot of the validated form values so
 * the record written on Yes is exactly the one that was reviewed; the form
 * controls are disabled while the snapshot is live.
 */
type Phase =
  | { kind: 'editing' }
  | { kind: 'confirming'; values: TransactionAddFormValues }
  | { kind: 'saving'; values: TransactionAddFormValues }

/** SCREEN-11 COTRN02 — record a new transaction (STORY-015/016). */
export function TransactionAddScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/menu'

  const [phase, setPhase] = useState<Phase>({ kind: 'editing' })
  const [message, setMessage] = useState<{ tone: MessageTone; text: string } | null>(null)
  const [copying, setCopying] = useState(false)
  // Increments per request so stale (superseded or unmounted) responses are ignored.
  const requestSeqRef = useRef(0)

  const { register, handleSubmit, reset, setValue, setFocus, getValues, formState } = useForm<TransactionAddFormValues>({
    resolver: zodResolver(transactionAddSchema),
    mode: 'onBlur',
    defaultValues: emptyValues,
  })
  const { errors } = formState

  useEffect(
    () => () => {
      requestSeqRef.current += 1
    },
    [],
  )

  function reviewAndAdd(values: TransactionAddFormValues) {
    // Entering review supersedes any in-flight copy: a late copy response
    // must never change the fields after the user has reviewed them.
    requestSeqRef.current += 1
    setCopying(false)
    setMessage(null)
    // Snapshot the values the resolver just validated: these exact values are
    // shown for review and written on Yes, regardless of later input events.
    setPhase({ kind: 'confirming', values })
  }

  /** Maps the confirmed form values to the backend TransactionRequest DTO. */
  function toRequest(values: TransactionAddFormValues, id: string): TransactionRequest {
    const accountId = values.accountId?.trim() ?? ''
    const cardNumber = values.cardNumber?.trim() ?? ''
    // A blank card number is omitted so the backend derives the card from the
    // account (and vice versa) via the cross-reference, as the legacy screen did.
    return {
      id,
      ...(accountId ? { accountId: Number(accountId) } : {}),
      ...(cardNumber ? { cardNumber } : {}),
      transactionTypeCode: values.transactionTypeCode.trim(),
      transactionCategoryCode: Number(values.transactionCategoryCode.trim()),
      source: values.source.trim(),
      description: values.description.trim(),
      amount: toSignedAmount(values.amount),
      merchantId: values.merchantId.trim(),
      merchantName: values.merchantName.trim(),
      merchantCity: values.merchantCity.trim(),
      merchantZip: values.merchantZip.trim(),
      originationTimestamp: values.originationTimestamp.trim(),
      processingTimestamp: values.processingTimestamp.trim(),
      confirmation: 'Y',
    } as TransactionRequest
  }

  // Legacy CONFIRM Y/N field: Yes writes the record, No keeps the data on screen.
  async function handleConfirm(value: 'Y' | 'N') {
    if (phase.kind !== 'confirming') return
    setValue('confirmation', value)
    if (value === 'N') {
      setPhase({ kind: 'editing' })
      return
    }
    // The snapshot taken at review time is what gets written, so the record
    // can never drift from what the user confirmed.
    const values = phase.values
    const seq = ++requestSeqRef.current
    setPhase({ kind: 'saving', values })
    try {
      // The record is written under the next ID after the last one on file (legacy COTRN02).
      const last = await fetchLastTransaction()
      const created = await api.transactions.create(toRequest(values, nextTransactionId(last?.id ?? null)))
      if (seq !== requestSeqRef.current) return
      setMessage({ tone: 'success', text: `Transaction added successfully. Your Tran ID is ${created.id}.` })
      reset(emptyValues)
      setPhase({ kind: 'editing' })
      setFocus('accountId')
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      setMessage({ tone: 'error', text: toErrorMessage(error, 'Unable to Add transaction.') })
      setPhase({ kind: 'editing' })
    }
  }

  // Legacy F4: clear the form.
  function clearForm() {
    requestSeqRef.current += 1
    // An in-flight copy was just superseded; its own finally is seq-guarded,
    // so its loading flag must be released here.
    setCopying(false)
    reset(emptyValues)
    setMessage(null)
    setPhase({ kind: 'editing' })
    setFocus('accountId')
  }

  // Legacy F5: copy the most recent transaction on file into the form.
  // Only the documented transaction and merchant fields are copied
  // (COTRN02C.cbl COPY-LAST-TRAN-DATA). Like the legacy paragraph, the copy
  // first runs key checks and resolves the keys through the cross-reference.
  // An entered account takes precedence and replaces the card with its linked
  // card; a blank, malformed, or nonexistent target never copies anything.
  async function copyLastTransaction() {
    const accountId = getValues('accountId') ?? ''
    const cardNumber = getValues('cardNumber') ?? ''
    const keyError = validateTransactionKeys(accountId, cardNumber)
    if (keyError) {
      setMessage({ tone: 'error', text: keyError.message })
      setFocus(keyError.field)
      return
    }
    const seq = ++requestSeqRef.current
    setCopying(true)
    try {
      const keys = await resolveTransactionKeys(accountId, cardNumber)
      if (seq !== requestSeqRef.current) return
      if (!keys.ok) {
        setMessage({ tone: 'error', text: keys.message })
        setFocus(keys.field)
        return
      }
      const last = await fetchLastTransaction()
      if (seq !== requestSeqRef.current) return
      if (!last) {
        setMessage({ tone: 'info', text: 'There are no transactions on file to copy.' })
        return
      }
      reset({
        ...emptyValues,
        accountId: keys.accountId,
        cardNumber: keys.cardNumber,
        transactionTypeCode: last.transactionTypeCode,
        transactionCategoryCode: last.transactionCategoryCode,
        source: last.source,
        description: last.description,
        // The form field requires the exact signed format (RULE-VAL-059).
        amount: toSignedAmount(last.amount),
        originationTimestamp: last.originationTimestamp.slice(0, 10),
        processingTimestamp: last.processingTimestamp.slice(0, 10),
        merchantId: last.merchantId,
        merchantName: last.merchantName,
        merchantCity: last.merchantCity,
        merchantZip: last.merchantZip,
      })
      setMessage(null)
      setFocus('accountId')
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      setMessage({ tone: 'error', text: toErrorMessage(error, 'Unable to copy the last transaction.') })
    } finally {
      if (seq === requestSeqRef.current) setCopying(false)
    }
  }

  return (
    <>
      <PageHeader
        screen="COTRN02"
        eyebrow="Transactions"
        title="Transaction Add"
        description="Record a new transaction for an account or card. You will be asked to confirm before it is written."
        actions={
          <>
            <Button
              variant="secondary"
              loading={copying}
              disabled={phase.kind !== 'editing'}
              onClick={() => void copyLastTransaction()}
            >
              Copy last transaction
            </Button>
            <Button variant="secondary" onClick={() => navigate(backTo)}>
              Back to menu
            </Button>
          </>
        }
      />

      {message ? (
        <MessageBar tone={message.tone} onDismiss={() => setMessage(null)} className={styles.messageSlot}>
          {message.text}
        </MessageBar>
      ) : null}

      <Card>
        {/* handleSubmit is invoked inside the event handler (not during
            render) because reviewAndAdd supersedes the in-flight copy via a
            ref, which must only happen on an actual submit event. */}
        <form onSubmit={(event) => void handleSubmit(reviewAndAdd)(event)} noValidate>
          {/* Every fieldset also locks while a copy-last request is in flight
              so its delayed response can never overwrite newer edits. */}
          <fieldset className={styles.fieldset} disabled={phase.kind !== 'editing' || copying}>
            <legend className={styles.legend}>Account or card</legend>
            <p className={styles.fieldsetHint}>Enter the account or the card; the other is filled in automatically.</p>
            <div className={styles.formGrid}>
              <TextField label="Account number" mono inputMode="numeric" maxLength={11} error={errors.accountId?.message} {...register('accountId')} />
              <TextField label="Card number" mono inputMode="numeric" maxLength={16} error={errors.cardNumber?.message} {...register('cardNumber')} />
            </div>
          </fieldset>

          <fieldset className={styles.fieldset} disabled={phase.kind !== 'editing' || copying}>
            <legend className={styles.legend}>Transaction details</legend>
            <div className={styles.formGrid}>
              <TextField
                label="Type code"
                requiredIndicator
                hint="Numeric"
                mono
                inputMode="numeric"
                maxLength={2}
                error={errors.transactionTypeCode?.message} {...register('transactionTypeCode')}
              />
              <TextField
                label="Category code"
                requiredIndicator
                hint="Numeric"
                mono
                inputMode="numeric"
                maxLength={4}
                error={errors.transactionCategoryCode?.message} {...register('transactionCategoryCode')}
              />
              <TextField label="Source" requiredIndicator maxLength={10} error={errors.source?.message} {...register('source')} />
              <TextField
                label="Amount"
                requiredIndicator
                hint="Format -99999999.99"
                mono
                inputMode="decimal"
                maxLength={12}
                error={errors.amount?.message} {...register('amount')}
              />
              <TextField label="Description" requiredIndicator maxLength={100} error={errors.description?.message} {...register('description')} />
              <TextField
                label="Original date"
                requiredIndicator
                hint="YYYY-MM-DD"
                mono
                inputMode="numeric"
                maxLength={10}
                error={errors.originationTimestamp?.message} {...register('originationTimestamp')}
              />
              <TextField
                label="Processing date"
                requiredIndicator
                hint="YYYY-MM-DD"
                mono
                inputMode="numeric"
                maxLength={10}
                error={errors.processingTimestamp?.message} {...register('processingTimestamp')}
              />
            </div>
          </fieldset>

          <fieldset className={styles.fieldset} disabled={phase.kind !== 'editing' || copying}>
            <legend className={styles.legend}>Merchant</legend>
            <div className={styles.formGrid}>
              <TextField
                label="Merchant ID"
                requiredIndicator
                hint="Numeric"
                mono
                inputMode="numeric"
                maxLength={9}
                error={errors.merchantId?.message} {...register('merchantId')}
              />
              <TextField label="Merchant name" requiredIndicator maxLength={50} error={errors.merchantName?.message} {...register('merchantName')} />
              <TextField label="Merchant city" requiredIndicator maxLength={50} error={errors.merchantCity?.message} {...register('merchantCity')} />
              <TextField label="Merchant ZIP" requiredIndicator maxLength={10} error={errors.merchantZip?.message} {...register('merchantZip')} />
            </div>
          </fieldset>

          <div className={styles.formFooter}>
            <span className={styles.footerNote}>All fields are required.</span>
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={clearForm} disabled={phase.kind !== 'editing'}>
                Clear form
              </Button>
              {/* Review stays unavailable while a copy is in flight so a late copy
                  response can never alter what was reviewed. */}
              <Button type="submit" disabled={phase.kind !== 'editing' || copying}>
                Review and add
              </Button>
            </div>
          </div>
        </form>

        {phase.kind === 'confirming' || phase.kind === 'saving' ? (
          <ConfirmPanel
            className={styles.confirmSlot}
            message={
              <>
                Confirm to add this transaction.
                <span className={styles.confirmNote}>A new transaction ID will be assigned when it is written.</span>
              </>
            }
            confirmLabel="Yes, add"
            cancelLabel="No"
            busy={phase.kind === 'saving'}
            onResult={(value) => void handleConfirm(value)}
          />
        ) : null}
      </Card>
    </>
  )
}
