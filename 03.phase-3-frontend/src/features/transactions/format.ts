const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** Formats a decimal string as USD ("1284.5" -> "$1,284.50", "-950" -> "-$950.00"). */
export function formatCurrency(value: string): string {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? value : currencyFormatter.format(parsed)
}

/** Formats a 16-digit card number in groups of four for display. */
export function formatCardNumber(value: string): string {
  return value.replace(/(.{4})/g, '$1 ').trim()
}
