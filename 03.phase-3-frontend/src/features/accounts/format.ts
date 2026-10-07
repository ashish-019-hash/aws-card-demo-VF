/** Display helpers for account and customer values (view screens only). */

/** "1284.50" → "$1,284.50"; falls back to the raw string for odd input. */
export function formatMoney(value: string): string {
  const amount = Number(value)
  if (Number.isNaN(amount)) {
    return value
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

/** 9-digit SSN → masked "***-**-6789" (only the last four shown). */
export function maskSsn(ssn: string): string {
  return `***-**-${ssn.slice(-4)}`
}

/** 10-digit phone "5125550147" → "(512) 555-0147"; other input unchanged. */
export function formatPhone(phone: string): string {
  if (!/^\d{10}$/.test(phone)) {
    return phone
  }
  return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
}
