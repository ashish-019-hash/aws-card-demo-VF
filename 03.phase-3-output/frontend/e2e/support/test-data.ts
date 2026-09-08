import { randomBytes } from 'node:crypto'

export const seeded = {
  administrator: { userId: 'ADMIN001', password: 'ADMIN123' },
  standardUser: { userId: 'USER0001', password: 'USER123' },
  account: { id: '1', cardNumber: '9680294154603697' },
  card: { number: '0500024453765740' },
} as const

export const today = new Date().toISOString().slice(0, 10)
export const currentYear = new Date().getUTCFullYear()

const runToken = `${Date.now().toString(36).slice(-4)}${randomBytes(1).toString('hex')}`.toUpperCase()
let userSequence = 0

/** Eight characters at most: a process-unique token plus a per-run sequence. */
export function uniqueUserId() {
  userSequence += 1
  return `E${runToken}${userSequence.toString(36)}`.slice(0, 8)
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
