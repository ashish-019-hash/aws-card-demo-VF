import { z } from 'zod'
import { isRealIsoDate } from './transactionAdd'

/**
 * Documented report-request messages (SCREEN-12 CORPT00). Wording follows
 * the legacy ERRMSG texts in CORPT00C.cbl `PROCESS-ENTER-KEY`; trailing "..."
 * is normalized to "." as elsewhere in the app. The legacy screen captured
 * each date as three separate month/day/year fields; the modern screen uses
 * one YYYY-MM-DD input per date and still reports the component-specific
 * message (approved decision 2).
 */
export const reportMessages = {
  /** RULE-VAL-069 — CORPT00C.cbl:437-442. */
  reportTypeRequired: 'Select a report type to print report.',
  /** RULE-VAL-070 — CORPT00C.cbl:258-303, per-component empty messages. */
  monthEmpty: (label: 'Start Date' | 'End Date') => `${label} - Month can NOT be empty.`,
  dayEmpty: (label: 'Start Date' | 'End Date') => `${label} - Day can NOT be empty.`,
  yearEmpty: (label: 'Start Date' | 'End Date') => `${label} - Year can NOT be empty.`,
  /** RULE-VAL-071 — CORPT00C.cbl:329-379, numeric/range edits. */
  invalidMonth: (label: 'Start Date' | 'End Date') => `${label} - Not a valid Month.`,
  invalidDay: (label: 'Start Date' | 'End Date') => `${label} - Not a valid Day.`,
  invalidYear: (label: 'Start Date' | 'End Date') => `${label} - Not a valid Year.`,
  /** RULE-VAL-072 — CORPT00C.cbl:388-426, CSUTLDTC calendar check. */
  invalidDate: (label: 'Start Date' | 'End Date') => `${label} - Not a valid date.`,
} as const

const DIGITS = /^\d+$/

/**
 * Validates one custom-report date (YYYY-MM-DD) in the legacy component
 * order — month, day, year presence (RULE-VAL-070); month ≤ 12, day ≤ 31,
 * year numeric (RULE-VAL-071); real calendar date (RULE-VAL-072) — and
 * returns the first failing message, mirroring the one-message-at-a-time
 * ERRMSG behavior.
 */
export function validateCustomDate(value: string, label: 'Start Date' | 'End Date'): string | null {
  const [year = '', month = '', day = ''] = value.trim().split('-')
  if (!month) return reportMessages.monthEmpty(label)
  if (!day) return reportMessages.dayEmpty(label)
  if (!year) return reportMessages.yearEmpty(label)
  if (!DIGITS.test(month) || Number(month) > 12) return reportMessages.invalidMonth(label)
  if (!DIGITS.test(day) || Number(day) > 31) return reportMessages.invalidDay(label)
  if (!DIGITS.test(year) || year.length !== 4) return reportMessages.invalidYear(label)
  if (!isRealIsoDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)) {
    return reportMessages.invalidDate(label)
  }
  return null
}

/**
 * Transaction report request (SCREEN-12 CORPT00). A report type is required
 * (RULE-VAL-069); a Custom report also needs valid start and end dates
 * (RULE-VAL-070/071/072). Phase 1 documents no start-before-end client rule,
 * so none is applied here. The confirmation (RULE-VAL-073) is supplied by
 * the ConfirmPanel so invalid typed values are unreachable.
 */
export const reportSchema = z
  .object({
    reportType: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    // 'Y' / 'N' set by the ConfirmPanel, mirroring the legacy CONFIRM field.
    confirmation: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.reportType) {
      ctx.addIssue({ code: 'custom', path: ['reportType'], message: reportMessages.reportTypeRequired })
      return
    }
    if (values.reportType !== 'CUSTOM') return
    const startMessage = validateCustomDate(values.startDate ?? '', 'Start Date')
    if (startMessage) ctx.addIssue({ code: 'custom', path: ['startDate'], message: startMessage })
    const endMessage = validateCustomDate(values.endDate ?? '', 'End Date')
    if (endMessage) ctx.addIssue({ code: 'custom', path: ['endDate'], message: endMessage })
  })

export type ReportFormValues = z.infer<typeof reportSchema>
