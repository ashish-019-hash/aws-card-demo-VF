/** Display helpers for card values. */

/** "4000123456789010" → "4000 1234 5678 9010". */
export function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/(.{4})(?=.)/g, '$1 ')
}

/** "2027-03" → { expiryYear: "2027", expiryMonth: "03" }. */
export function splitExpiry(expirationDate: string): {
  expiryYear: string
  expiryMonth: string
} {
  const [expiryYear = '', expiryMonth = ''] = expirationDate.split('-')
  return { expiryYear, expiryMonth }
}
