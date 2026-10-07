// Mirrors the backend ReportRequest.type enum.
export type ReportType = 'MONTHLY' | 'YEARLY' | 'CUSTOM'

/** Screen-level view of the backend ReportResponse. */
export interface ReportOutcome {
  reportType: ReportType
  startDate: string
  endDate: string
  transactionCount: number
  formatterStatus: string
}
