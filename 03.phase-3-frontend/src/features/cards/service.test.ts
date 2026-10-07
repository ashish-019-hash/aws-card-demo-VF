import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, type CreditCardDto } from '../../services/api'
import type { CreditCard } from '../../types/card'
import { buildExpirationDate, saveCard } from './service'

vi.mock('../../services/api', () => ({
  api: {
    cards: {
      update: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('buildExpirationDate', () => {
  it('keeps the stored day when it is valid in the selected month', () => {
    expect(buildExpirationDate('2027-05-15', '9', '2028')).toBe('2028-09-15')
  })

  it('clamps day 31 to 28 for February in a non-leap year', () => {
    expect(buildExpirationDate('2027-01-31', '2', '2027')).toBe('2027-02-28')
  })

  it('clamps day 31 to 29 for February in a leap year', () => {
    expect(buildExpirationDate('2027-01-31', '2', '2028')).toBe('2028-02-29')
  })

  it('clamps day 31 to 30 for a 30-day month', () => {
    expect(buildExpirationDate('2027-08-31', '4', '2027')).toBe('2027-04-30')
  })

  it('keeps day 29 in a leap-year February', () => {
    expect(buildExpirationDate('2028-02-29', '2', '2032')).toBe('2032-02-29')
  })

  it('falls back to day 1 when the stored date has no usable day', () => {
    expect(buildExpirationDate('', '7', '2027')).toBe('2027-07-01')
  })
})

describe('saveCard', () => {
  const card: CreditCard = {
    cardNumber: '4000123456789010',
    version: 3,
    accountId: '00000000001',
    cvvCode: 123,
    embossedName: 'JANE DOE',
    expirationDate: '2027-01-31',
    activeStatus: 'Y',
  }

  it('sends a normalized expiry date instead of an invalid carried-over day', async () => {
    const updated: CreditCardDto = {
      cardNumber: card.cardNumber,
      version: 4,
      accountId: 1,
      cvvCode: 123,
      embossedName: 'JANE DOE',
      expirationDate: '2027-02-28',
      activeStatus: 'Y',
    }
    vi.mocked(api.cards.update).mockResolvedValue(updated)

    const result = await saveCard(card, {
      embossedName: 'JANE DOE',
      activeStatus: 'Y',
      expiryMonth: '2',
      expiryYear: '2027',
    })

    expect(api.cards.update).toHaveBeenCalledWith(
      card.cardNumber,
      expect.objectContaining({ expirationDate: '2027-02-28', version: 3 }),
    )
    expect(result).toMatchObject({ ok: true })
  })

  it('preserves the stored day when the selected month allows it', async () => {
    vi.mocked(api.cards.update).mockResolvedValue({
      cardNumber: card.cardNumber,
      version: 4,
      accountId: 1,
      cvvCode: 123,
      embossedName: 'JANE DOE',
      expirationDate: '2028-03-31',
      activeStatus: 'Y',
    })

    await saveCard(card, {
      embossedName: 'JANE DOE',
      activeStatus: 'Y',
      expiryMonth: '3',
      expiryYear: '2028',
    })

    expect(api.cards.update).toHaveBeenCalledWith(
      card.cardNumber,
      expect.objectContaining({ expirationDate: '2028-03-31' }),
    )
  })
})
