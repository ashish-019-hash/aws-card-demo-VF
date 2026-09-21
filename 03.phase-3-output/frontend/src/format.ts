// Shared legacy display formatters (01.phase-1-output/business-entities.md). The backend
// stores/returns these as plain JSON numbers/strings; the legacy BMS screens always
// rendered them at a fixed width (zero-padded account id, zero-padded customer id, 2-decimal
// amounts). These helpers restore that fixed-width presentation in the UI without changing
// what is sent to the API.

/** Account ID: 11-digit zero-padded (legacy PIC 9(11), business-entities.md Account). */
export function formatAccountId(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value).padStart(11, '0')
}

/** Customer ID: 9-digit zero-padded (legacy PIC 9(09), business-entities.md Customer). */
export function formatCustomerId(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value).padStart(9, '0')
}

/** Signed amount with exactly 2 decimal places (legacy PIC S9(n)V99). */
export function formatAmount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toFixed(2)
}

/** Date-only display: legacy X(10) YYYY-MM-DD; trims any timestamp suffix if present. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}
