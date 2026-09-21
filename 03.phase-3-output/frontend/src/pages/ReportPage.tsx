import { useState, type FormEvent } from 'react'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { ReportRequest } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar, type Message } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { dateFormat, focusFirstInvalidField, hasErrors, isBlank, required, validCalendarDate, type FieldErrors } from '../validation/rules'

type ReportType = 'MONTHLY' | 'YEARLY' | 'CUSTOM'

const KNOWN_REPORT_FIELDS: readonly string[] = ['reportType', 'startDate', 'endDate', 'confirm']
const VALIDATE_FIELD_ORDER = ['startDate', 'endDate']

export function ReportPage() {
  const [reportType, setReportType] = useState<ReportType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<Message | null>(null)
  const [validated, setValidated] = useState(false)

  function handleValidate(e: FormEvent) {
    e.preventDefault()
    const nextErrors: FieldErrors = {}
    // VR-098
    nextErrors.reportType = required(reportType, 'Select a report type to print report...')
    if (reportType === 'CUSTOM') {
      // VR-099/VR-111 (start), VR-111/112 mirrored for end date
      nextErrors.startDate =
        (isBlank(startDate) ? 'Start Date can NOT be empty...' : undefined) ??
        dateFormat(startDate, 'Start Date should be in format YYYY-MM-DD') ??
        validCalendarDate(startDate, 'Start Date - Not a valid date...')
      nextErrors.endDate =
        (isBlank(endDate) ? 'End Date can NOT be empty...' : undefined) ??
        dateFormat(endDate, 'End Date should be in format YYYY-MM-DD') ??
        validCalendarDate(endDate, 'End Date - Not a valid date...')
    }
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      setValidated(false)
      focusFirstInvalidField(nextErrors, VALIDATE_FIELD_ORDER)
      return
    }
    setMessage({ kind: 'info', text: 'Report request validated. Set Confirm to Y and press Enter to submit.' })
    setValidated(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validated) {
      handleValidate(e)
      return
    }
    // VR-113/VR-114 (CORPT00C SUBMIT-JOB-TO-INTRDR): the confirm-gate messages interpolate
    // the selected report type / the entered value, and an explicit "N" clears the whole
    // screen (INITIALIZE-ALL-FIELDS) rather than showing any message.
    if (isBlank(confirm)) {
      setErrors((prev) => ({ ...prev, confirm: `Please confirm to print the ${reportType} report...` }))
      document.getElementById('confirm')?.focus()
      return
    }
    if (/^n$/i.test(confirm.trim())) {
      setReportType('')
      setStartDate('')
      setEndDate('')
      setConfirm('')
      setErrors({})
      setMessage(null)
      setValidated(false)
      return
    }
    if (!/^[Yy]$/.test(confirm.trim())) {
      setErrors((prev) => ({ ...prev, confirm: `"${confirm.trim()}" is not a valid value to confirm...` }))
      document.getElementById('confirm')?.focus()
      return
    }
    const payload: ReportRequest = {
      reportType: reportType as ReportType,
      startDate: reportType === 'CUSTOM' ? startDate.trim() : undefined,
      endDate: reportType === 'CUSTOM' ? endDate.trim() : undefined,
      confirm: confirm.trim(),
    }
    try {
      const response = await endpoints.submitReport(payload)
      setMessage({
        kind: 'success',
        text: response.message ?? `Report job submitted for ${response.periodStart} - ${response.periodEnd}.`,
      })
      setValidated(false)
      setConfirm('')
      setErrors({})
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 400) {
        const { fieldErrors, unmapped } = e2.fieldErrors(KNOWN_REPORT_FIELDS)
        setErrors(fieldErrors)
        setMessage({ kind: 'error', text: unmapped.length ? `${e2.message} ${unmapped.join(' ')}` : e2.message })
      } else {
        setMessage({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Unable to submit report.' })
      }
      setValidated(false)
    }
  }

  return (
    <div className="screen">
      <ScreenHeader screenId="CORPT00C" title="Transaction Report" />
      <MessageBar kind={message?.kind ?? 'info'} message={message?.text} />
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Report Type</label>
          <label>
            <input
              type="radio"
              name="reportType"
              checked={reportType === 'MONTHLY'}
              aria-invalid={Boolean(errors.reportType)}
              aria-describedby={errors.reportType ? 'reportType-error' : undefined}
              onChange={() => {
                setReportType('MONTHLY')
                setValidated(false)
              }}
            />
            Monthly
          </label>
          <label>
            <input
              type="radio"
              name="reportType"
              checked={reportType === 'YEARLY'}
              aria-invalid={Boolean(errors.reportType)}
              aria-describedby={errors.reportType ? 'reportType-error' : undefined}
              onChange={() => {
                setReportType('YEARLY')
                setValidated(false)
              }}
            />
            Yearly
          </label>
          <label>
            <input
              type="radio"
              name="reportType"
              checked={reportType === 'CUSTOM'}
              aria-invalid={Boolean(errors.reportType)}
              aria-describedby={errors.reportType ? 'reportType-error' : undefined}
              onChange={() => {
                setReportType('CUSTOM')
                setValidated(false)
              }}
            />
            Custom
          </label>
          <FieldError id="reportType-error" message={errors.reportType} />
        </div>
        {reportType === 'CUSTOM' && (
          <>
            <div className="form-row">
              <label htmlFor="startDate">Start Date (YYYY-MM-DD)</label>
              <input
                id="startDate"
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={errors.startDate ? 'startDate-error' : undefined}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setValidated(false)
                }}
              />
              <FieldError id="startDate-error" message={errors.startDate} />
            </div>
            <div className="form-row">
              <label htmlFor="endDate">End Date (YYYY-MM-DD)</label>
              <input
                id="endDate"
                aria-invalid={Boolean(errors.endDate)}
                aria-describedby={errors.endDate ? 'endDate-error' : undefined}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setValidated(false)
                }}
              />
              <FieldError id="endDate-error" message={errors.endDate} />
            </div>
          </>
        )}
        <div className="form-row">
          <label htmlFor="confirm">Confirm (Y/N)</label>
          <input
            id="confirm"
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? 'confirm-error' : undefined}
            value={confirm}
            maxLength={1}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <FieldError id="confirm-error" message={errors.confirm} />
        </div>
        <div className="form-actions">
          <button type="submit">{validated ? 'Enter (confirm)' : 'Enter (validate)'}</button>
        </div>
      </form>
      <BackLink to="/menu" />
    </div>
  )
}
