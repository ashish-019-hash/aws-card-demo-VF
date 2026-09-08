export const seeded = {
  administrator: { userId: 'ADMIN001', password: 'ADMIN123' },
  standardUser: { userId: 'USER0001', password: 'USER123' },
  account: { id: '1', cardNumber: '9680294154603697' },
  card: { number: '0500024453765740' },
} as const

export const today = new Date().toISOString().slice(0, 10)
export const currentYear = new Date().getUTCFullYear()

export function uniqueUserId() {
  return `E2E${Date.now().toString().slice(-5)}`
}

export function transactionInput(overrides: Record<string, string> = {}) {
  return {
    accountId: seeded.account.id,
    cardNumber: '',
    transactionTypeCode: '01',
    transactionCategoryCode: '0001',
    source: 'E2E TEST',
    description: 'Browser test transaction',
    amount: '+12.50',
    originDate: today,
    processingDate: today,
    merchantId: '800000000',
    merchantName: 'E2E Merchant',
    merchantCity: 'Test City',
    merchantZip: '12345',
    confirmation: 'Y',
    ...overrides,
  }
}
