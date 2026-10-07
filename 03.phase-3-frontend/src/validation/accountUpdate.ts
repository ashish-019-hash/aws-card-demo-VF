import { z } from 'zod'
import {
  alphaOptionalEdit,
  alphaRequiredEdit,
  dateEdit,
  dateOfBirthEdit,
  editedOptionalString,
  editedString,
  ficoScoreEdit,
  mandatoryEdit,
  numericRequiredEdit,
  phoneEdit,
  signedMoneyEdit,
  ssnEdit,
  stateCodeEdit,
  stateZipComboMessage,
  yesNoEdit,
  zipCodeEdit,
} from './legacyEdits'

/**
 * Account Update form (SCREEN-05 COACTUP) — the full field-edit suite of
 * COACTUPC.cbl 1200-EDIT-MAP-INPUTS. Client-applicable parts of the Phase 1
 * catalog:
 * - RULE-VAL-014 — Account Status Y/N.
 * - RULE-VAL-015 — Open/Expiry/Reissue dates and DOB are real CCYYMMDD dates.
 * - RULE-VAL-016 — DOB not in the future.
 * - RULE-VAL-017 — money fields are signed amounts with up to 2 decimals.
 * - RULE-VAL-018/019/020 — SSN segment edits (single 9-digit input).
 * - RULE-VAL-021 — FICO 300-850.
 * - RULE-VAL-022/023 — first/last name required alpha, middle name optional alpha.
 * - RULE-VAL-024 — Address Line 1 required.
 * - RULE-VAL-025 — City required alpha.
 * - RULE-VAL-026 — State required, alpha, in the state-code lookup.
 * - RULE-VAL-027 — Zip required, numeric, non-zero.
 * - RULE-VAL-028 — Country required alpha.
 * - RULE-VAL-029 — state + first-2-zip-digit combination lookup (cross-field).
 * - RULE-VAL-030 — phones optional; if entered, NANP area code/prefix/line edits.
 * - RULE-VAL-031 — EFT Account ID 10-digit non-zero.
 * - RULE-VAL-032 — Primary Card Holder Y/N.
 * RULE-VAL-033 (no-change detection) stays page-level; RULE-VAL-034
 * (optimistic concurrency) stays server-backed.
 */
export const accountUpdateSchema = z
  .object({
    // Account fields
    activeStatus: editedString(yesNoEdit('Account Status')), // RULE-VAL-014
    openDate: editedString(dateEdit('Open Date')), // RULE-VAL-015
    expirationDate: editedString(dateEdit('Expiry Date')), // RULE-VAL-015
    reissueDate: editedString(dateEdit('Reissue Date')), // RULE-VAL-015
    creditLimit: editedString(signedMoneyEdit('Credit Limit')), // RULE-VAL-017
    cashCreditLimit: editedString(signedMoneyEdit('Cash Credit Limit')), // RULE-VAL-017
    currentBalance: editedString(signedMoneyEdit('Current Balance')), // RULE-VAL-017
    currentCycleCredit: editedString(signedMoneyEdit('Current Cycle Credit Limit')), // RULE-VAL-017
    currentCycleDebit: editedString(signedMoneyEdit('Current Cycle Debit Limit')), // RULE-VAL-017
    groupId: z.string().optional(),
    // Customer fields
    firstName: editedString(alphaRequiredEdit('First Name')), // RULE-VAL-022
    middleName: editedOptionalString(alphaOptionalEdit('Middle Name')), // RULE-VAL-023
    lastName: editedString(alphaRequiredEdit('Last Name')), // RULE-VAL-022
    ssn: editedString(ssnEdit()), // RULE-VAL-018/019/020
    dateOfBirth: editedString(dateOfBirthEdit('Date of Birth')), // RULE-VAL-015/016
    ficoCreditScore: editedString(ficoScoreEdit()), // RULE-VAL-021
    addressLine1: editedString(mandatoryEdit('Address Line 1')), // RULE-VAL-024
    addressLine2: z.string().optional(),
    addressLine3: editedString(alphaRequiredEdit('City')), // RULE-VAL-025
    addressStateCode: editedString(stateCodeEdit()), // RULE-VAL-026
    addressZip: editedString(zipCodeEdit()), // RULE-VAL-027
    addressCountryCode: editedString(alphaRequiredEdit('Country')), // RULE-VAL-028
    phoneNumber1: editedOptionalString(phoneEdit('Phone Number 1')), // RULE-VAL-030
    phoneNumber2: editedOptionalString(phoneEdit('Phone Number 2')), // RULE-VAL-030
    governmentIssuedId: z.string().optional(),
    eftAccountId: editedString(numericRequiredEdit('EFT Account Id', 10)), // RULE-VAL-031
    primaryCardholderIndicator: editedString(yesNoEdit('Primary Card Holder')), // RULE-VAL-032
  })
  .superRefine((values, ctx) => {
    // RULE-VAL-029 — runs only when state and zip passed their own edits.
    const message = stateZipComboMessage(values.addressStateCode, values.addressZip)
    if (message) {
      ctx.addIssue({ code: 'custom', path: ['addressStateCode'], message })
      ctx.addIssue({ code: 'custom', path: ['addressZip'], message })
    }
  })

export type AccountUpdateFormValues = z.infer<typeof accountUpdateSchema>
