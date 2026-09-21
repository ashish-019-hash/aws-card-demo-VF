import { useState, type FormEvent } from 'react'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { ReportRequest } from '../api/types'
import { ScreenHeader } from '../components/ScreenHeader'
import { MessageBar } from '../components/MessageBar'
import { FieldError } from '../components/FieldError'
import { BackLink } from '../components/BackLink'
import { dateFormat, isBlank, validCalendarDate, yesNoIfSupplied, type FieldErrors } from '../validation/rules'

type ReportType = 'MONTHLY' | 'YEARLY' | 'CUSTOM'

export function ReportPage() {
  const [reportType, setReportType] = useState<ReportType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null)
  const [validated, setValidated] = useState(false)

  function handleValidate(e: FormEvent) {
    e.preventDefault()
    const nextErrors: FieldErrors = {}
    // VR-098
    if (!reportType) {
      nextErrors.reportType = 'Select a report type to print report...'
    }
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
    if (Object.values(nextErrors).some(Boolean)) {
      setValidated(false)
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
    // VR-113/VR-114
    const confirmError = isBlank(confirm)
      ? 'Confirm to print the report...'
      : yesNoIfSupplied(confirm, 'Invalid value. Valid values are (Y/N)...')
    if (confirmError) {
      setErrors((prev) => ({ ...prev, confirm: confirmError }))
      return
    }
    if (/^n$/i.test(confirm.trim())) {
      setMessage({ kind: 'info', text: 'Confirm to print the report...' })
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
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 400) {
        const fieldErrors: FieldErrors = {}
        e2.errors.forEach((fe) => {
          fieldErrors[fe.field] = fe.message
        })
        setErrors(fieldErrors)
        setMessage({ kind: 'error', text: e2.message })
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
              onChange={() => {
                setReportType('CUSTOM')
                setValidated(false)
              }}
            />
            Custom
          </label>
          <FieldError message={errors.reportType} />
        </div>
        {reportType === 'CUSTOM' && (
          <>
            <div className="form-row">
              <label htmlFor="startDate">Start Date (YYYY-MM-DD)</label>
              <input
                id="startDate"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setValidated(false)
                }}
              />
              <FieldError message={errors.startDate} />
            </div>
            <div className="form-row">
              <label htmlFor="endDate">End Date (YYYY-MM-DD)</label>
              <input
                id="endDate"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setValidated(false)
                }}
              />
              <FieldError message={errors.endDate} />
            </div>
          </>
        )}
        <div className="form-row">
          <label htmlFor="confirm">Confirm (Y/N)</label>
          <input
            id="confirm"
            value={confirm}
            maxLength={1}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <FieldError message={errors.confirm} />
        </div>
        <div className="form-actions">
          <button type="submit">{validated ? 'Enter (confirm)' : 'Enter (validate)'}</button>
        </div>
      </form>
      <BackLink to="/menu" />
    </div>
  )
}
