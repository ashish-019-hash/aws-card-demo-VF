import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  ConfirmPanel,
  DescriptionList,
  MessageBar,
  PageHeader,
  RadioGroup,
  TextField,
} from '../../components/ui'
import { ApiError, api, type ReportRequest } from '../../services/api'
import type { ReportOutcome, ReportType } from '../../types/report'
import { reportSchema, type ReportFormValues } from '../../validation/report'
import styles from './reports.module.css'

/** Display labels for the report types (used in confirm and success text). */
const reportTypeLabels: Record<ReportType, string> = {
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Phase =
  | { kind: 'editing' }
  | { kind: 'confirming'; values: ReportFormValues }
  | { kind: 'submitting'; values: ReportFormValues }

const emptyValues: ReportFormValues = { reportType: '', startDate: '', endDate: '', confirmation: '' }

// Current month/year ranges for the option hints, computed once at load time.
function computeRanges() {
  const today = new Date()
  return {
    monthStart: new Date(today.getFullYear(), today.getMonth(), 1),
    monthEnd: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    yearStart: new Date(today.getFullYear(), 0, 1),
    yearEnd: new Date(today.getFullYear(), 11, 31),
  }
}

const ranges = computeRanges()

/** SCREEN-12 CORPT00 — request a monthly, yearly or custom transaction report (STORY-018). */
export function ReportRequestScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/menu'

  const [phase, setPhase] = useState<Phase>({ kind: 'editing' })
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [outcome, setOutcome] = useState<ReportOutcome | null>(null)
  // Increments per request so stale (superseded or unmounted) responses are ignored.
  const requestSeqRef = useRef(0)

  const { register, handleSubmit, reset, setValue, control, formState } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    mode: 'onBlur',
    defaultValues: emptyValues,
  })
  const { errors } = formState
  const reportType = useWatch({ control, name: 'reportType' })

  useEffect(
    () => () => {
      requestSeqRef.current += 1
    },
    [],
  )

  const { monthStart, monthEnd, yearStart, yearEnd } = ranges

  // RULE-VAL-069 (type required) and RULE-VAL-070/071/072 (custom dates) are
  // enforced by the schema before this runs, so the ConfirmPanel is only
  // reachable with a valid request (RULE-VAL-073 Y/N comes from its buttons).
  function requestReport(values: ReportFormValues) {
    setMessage(null)
    setOutcome(null)
    setPhase({ kind: 'confirming', values })
  }

  // Legacy CONFIRM Y/N field: Yes queues the batch job, No resets the form.
  async function handleConfirm(value: 'Y' | 'N') {
    if (phase.kind !== 'confirming') return
    setValue('confirmation', value)
    if (value === 'N') {
      reset(emptyValues)
      setPhase({ kind: 'editing' })
      return
    }
    const values = phase.values
    const type = values.reportType as ReportType
    const seq = ++requestSeqRef.current
    setPhase({ kind: 'submitting', values })
    try {
      const request: ReportRequest = {
        type,
        confirmation: 'Y',
        ...(type === 'CUSTOM' ? { startDate: values.startDate?.trim(), endDate: values.endDate?.trim() } : {}),
      }
      const response = await api.reports.create(request)
      if (seq !== requestSeqRef.current) return
      setMessage({ tone: 'success', text: `${reportTypeLabels[type]} report submitted for printing` })
      setOutcome({
        reportType: type,
        startDate: response.startDate,
        endDate: response.endDate,
        transactionCount: response.transactions.length,
        formatterStatus: response.formatterStatus,
      })
      reset(emptyValues)
      setPhase({ kind: 'editing' })
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      const text = error instanceof ApiError ? error.message : 'Unable to request the report.'
      setMessage({ tone: 'error', text })
      // Keep the entered values on screen so the request can be corrected.
      setPhase({ kind: 'editing' })
    }
  }

  const confirmValues = phase.kind === 'confirming' || phase.kind === 'submitting' ? phase.values : null
  const confirmLabel = confirmValues ? reportTypeLabels[confirmValues.reportType as ReportType] : ''

  return (
    <>
      <PageHeader
        screen="CORPT00"
        eyebrow="Transactions"
        title="Transaction Reports"
        description="Request a printed transaction report. It is produced by a background job and selected by processing date."
        actions={
          <Button variant="secondary" onClick={() => navigate(backTo)}>
            Back to menu
          </Button>
        }
      />

      {message ? (
        <MessageBar tone={message.tone} onDismiss={() => setMessage(null)} className={styles.messageSlot}>
          {message.text}
        </MessageBar>
      ) : null}

      <Card title="Report type">
        <form onSubmit={handleSubmit(requestReport)} noValidate>
          <RadioGroup
            label="Report type"
            options={[
              {
                value: 'MONTHLY',
                label: (
                  <span className={styles.optionLabel}>
                    Monthly
                    <span className={styles.optionHint}>
                      {formatDay(monthStart)} to {formatDay(monthEnd)} (current month)
                    </span>
                  </span>
                ),
              },
              {
                value: 'YEARLY',
                label: (
                  <span className={styles.optionLabel}>
                    Yearly
                    <span className={styles.optionHint}>
                      {formatDay(yearStart)} to {formatDay(yearEnd)} (current year)
                    </span>
                  </span>
                ),
              },
              {
                value: 'CUSTOM',
                label: (
                  <span className={styles.optionLabel}>
                    Custom
                    <span className={styles.optionHint}>Choose a start and end date</span>
                  </span>
                ),
              },
            ]}
            aria-controls="report-custom-dates"
            error={errors.reportType?.message}
            {...register('reportType')}
          />

          {reportType === 'CUSTOM' ? (
            <div id="report-custom-dates" className={styles.customDates}>
              <TextField
                label="Start date"
                requiredIndicator
                hint="YYYY-MM-DD"
                mono
                inputMode="numeric"
                maxLength={10}
                error={errors.startDate?.message}
                {...register('startDate')}
              />
              <TextField
                label="End date"
                requiredIndicator
                hint="YYYY-MM-DD"
                mono
                inputMode="numeric"
                maxLength={10}
                error={errors.endDate?.message}
                {...register('endDate')}
              />
            </div>
          ) : null}

          <p className={styles.note}>Transactions are selected by processing date and listed by card number.</p>

          <div className={styles.actions}>
            <Button type="submit" disabled={phase.kind === 'submitting'}>
              Request report
            </Button>
          </div>
        </form>

        {confirmValues ? (
          <ConfirmPanel
            className={styles.confirmSlot}
            message={
              confirmValues.reportType === 'CUSTOM'
                ? `Please confirm to print the ${confirmLabel} report for ${confirmValues.startDate} to ${confirmValues.endDate}.`
                : `Please confirm to print the ${confirmLabel} report.`
            }
            confirmLabel="Yes, print report"
            cancelLabel="No, go back"
            busy={phase.kind === 'submitting'}
            onResult={(value) => void handleConfirm(value)}
          />
        ) : null}
      </Card>

      {outcome ? (
        <Card title="Report result" subtitle={`${reportTypeLabels[outcome.reportType]} report`} className={styles.resultCard}>
          <DescriptionList
            items={[
              { label: 'Period', value: `${outcome.startDate} to ${outcome.endDate}`, mono: true },
              { label: 'Transactions selected', value: String(outcome.transactionCount), mono: true },
              { label: 'Formatter status', value: outcome.formatterStatus },
            ]}
          />
        </Card>
      ) : null}
    </>
  )
}
