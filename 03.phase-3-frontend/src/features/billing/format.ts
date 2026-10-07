const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** Formats a decimal string as USD ("1284.5" -> "$1,284.50"). */
export function formatCurrency(value: string): string {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? value : currencyFormatter.format(parsed)
}
