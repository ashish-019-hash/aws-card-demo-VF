import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, ConfirmPanel, MessageBar, PageHeader, TextField, type MessageTone } from '../../components/ui'
import { api, type TransactionRequest } from '../../services/api'
import { transactionAddSchema, type TransactionAddFormValues } from '../../validation/transactionAdd'
import { fetchLastTransaction, nextTransactionId, toErrorMessage, toSignedAmount } from './service'
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

type Phase = 'editing' | 'confirming' | 'saving'

/** SCREEN-11 COTRN02 — record a new transaction (STORY-015/016). */
export function TransactionAddScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/menu'

  const [phase, setPhase] = useState<Phase>('editing')
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

  function reviewAndAdd() {
    setMessage(null)
    setPhase('confirming')
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
    setValue('confirmation', value)
    if (value === 'N') {
      setPhase('editing')
      return
    }
    const seq = ++requestSeqRef.current
    setPhase('saving')
    try {
      // The record is written under the next ID after the last one on file (legacy COTRN02).
      const last = await fetchLastTransaction()
      const created = await api.transactions.create(toRequest(getValues(), nextTransactionId(last?.id ?? null)))
      if (seq !== requestSeqRef.current) return
      setMessage({ tone: 'success', text: `Transaction added successfully. Your Tran ID is ${created.id}.` })
      reset(emptyValues)
      setPhase('editing')
      setFocus('accountId')
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      setMessage({ tone: 'error', text: toErrorMessage(error, 'Unable to Add transaction.') })
      setPhase('editing')
    }
  }

  // Legacy F4: clear the form.
  function clearForm() {
    requestSeqRef.current += 1
    reset(emptyValues)
    setMessage(null)
    setPhase('editing')
    setFocus('accountId')
  }

  // Legacy F5: copy the most recent transaction on file into the form.
  async function copyLastTransaction() {
    const seq = ++requestSeqRef.current
    setCopying(true)
    try {
      const last = await fetchLastTransaction()
      if (seq !== requestSeqRef.current) return
      if (!last) {
        setMessage({ tone: 'info', text: 'There are no transactions on file to copy.' })
        return
      }
      reset({
        ...emptyValues,
        cardNumber: last.cardNumber,
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
      setPhase('editing')
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
            <Button variant="secondary" loading={copying} onClick={() => void copyLastTransaction()}>
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
        <form onSubmit={handleSubmit(reviewAndAdd)} noValidate>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Account or card</legend>
            <p className={styles.fieldsetHint}>Enter the account or the card; the other is filled in automatically.</p>
            <div className={styles.formGrid}>
              <TextField label="Account number" mono inputMode="numeric" maxLength={11} error={errors.accountId?.message} {...register('accountId')} />
              <TextField label="Card number" mono inputMode="numeric" maxLength={16} error={errors.cardNumber?.message} {...register('cardNumber')} />
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
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

          <fieldset className={styles.fieldset}>
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
              <Button variant="secondary" onClick={clearForm} disabled={phase === 'saving'}>
                Clear form
              </Button>
              <Button type="submit" disabled={phase === 'saving'}>
                Review and add
              </Button>
            </div>
          </div>
        </form>

        {phase === 'confirming' || phase === 'saving' ? (
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
            busy={phase === 'saving'}
            onResult={(value) => void handleConfirm(value)}
          />
        ) : null}
      </Card>
    </>
  )
}
