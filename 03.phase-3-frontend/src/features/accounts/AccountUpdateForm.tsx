import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button, RadioGroup, TextField } from '../../components/ui'
import { accountUpdateSchema } from '../../validation/accountUpdate'
import type { AccountUpdateFormValues } from '../../validation/accountUpdate'
import { valuesDiffer } from './formValues'
import type { UpdatePhase } from './formValues'
import styles from './forms.module.css'

const YN_OPTIONS = [
  { value: 'Y', label: 'Yes (Y)' },
  { value: 'N', label: 'No (N)' },
]

export interface AccountUpdateFormProps {
  accountId: string
  customerId: string
  /** Fetched (or last saved) values; Discard resets to these. */
  baseline: AccountUpdateFormValues
  phase: UpdatePhase
  /** Submit handler ("Validate changes" / Enter). */
  onValidated: (values: AccountUpdateFormValues, changed: boolean) => void
  /** "Save" (legacy F5) — enabled only in the validated phase. */
  onSave: () => void
  /** "Discard changes" (legacy F12) — the form resets itself first. */
  onDiscard: () => void
  /** Any edit after validate/save drops the page back to editing. */
  onEdited: () => void
}

/**
 * Editable account + customer field set of SCREEN-05 COACTUP, grouped into
 * "Account" and "Customer" fieldsets with the validate → save phase flow.
 */
export function AccountUpdateForm({
  accountId,
  customerId,
  baseline,
  phase,
  onValidated,
  onSave,
  onDiscard,
  onEdited,
}: AccountUpdateFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<AccountUpdateFormValues>({
    resolver: zodResolver(accountUpdateSchema),
    mode: 'onBlur',
    defaultValues: baseline,
  })

  // A fresh lookup or a completed save establishes a new baseline.
  useEffect(() => {
    reset(baseline)
  }, [baseline, reset])

  const busy = phase === 'saving'

  return (
    <form
      noValidate
      onSubmit={handleSubmit(
        (values) => onValidated(values, valuesDiffer(values, baseline)),
        (formErrors) => {
          const first = Object.keys(formErrors)[0] as keyof AccountUpdateFormValues | undefined
          if (first) {
            setFocus(first)
          }
        },
      )}
      onChange={() => {
        if (phase === 'validated' || phase === 'saved') {
          onEdited()
        }
      }}
    >
      <fieldset className={styles.fieldset} disabled={busy}>
        <legend className={styles.legend}>Account</legend>
        <p className={styles.legendMeta}>Account {accountId}</p>
        <div className={styles.grid}>
          <RadioGroup
            label="Active status"
            options={YN_OPTIONS}
            hint="Y or N"
            requiredIndicator
            error={errors.activeStatus?.message}
            {...register('activeStatus')}
          />
          <TextField
            label="Account group"
            mono
            maxLength={10}
            error={errors.groupId?.message}
            {...register('groupId')}
          />
          <TextField
            label="Open date"
            hint="YYYY-MM-DD"
            mono
            inputMode="numeric"
            maxLength={10}
            requiredIndicator
            error={errors.openDate?.message}
            {...register('openDate')}
          />
          <TextField
            label="Expiry date"
            hint="YYYY-MM-DD"
            mono
            inputMode="numeric"
            maxLength={10}
            requiredIndicator
            error={errors.expirationDate?.message}
            {...register('expirationDate')}
          />
          <TextField
            label="Reissue date"
            hint="YYYY-MM-DD"
            mono
            inputMode="numeric"
            maxLength={10}
            requiredIndicator
            error={errors.reissueDate?.message}
            {...register('reissueDate')}
          />
          <TextField
            label="Credit limit"
            mono
            inputMode="decimal"
            requiredIndicator
            error={errors.creditLimit?.message}
            {...register('creditLimit')}
          />
          <TextField
            label="Cash credit limit"
            mono
            inputMode="decimal"
            requiredIndicator
            error={errors.cashCreditLimit?.message}
            {...register('cashCreditLimit')}
          />
          <TextField
            label="Current balance"
            mono
            inputMode="decimal"
            requiredIndicator
            error={errors.currentBalance?.message}
            {...register('currentBalance')}
          />
          <TextField
            label="Cycle credit"
            mono
            inputMode="decimal"
            requiredIndicator
            error={errors.currentCycleCredit?.message}
            {...register('currentCycleCredit')}
          />
          <TextField
            label="Cycle debit"
            mono
            inputMode="decimal"
            requiredIndicator
            error={errors.currentCycleDebit?.message}
            {...register('currentCycleDebit')}
          />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset} disabled={busy}>
        <legend className={styles.legend}>Customer</legend>
        <p className={styles.legendMeta}>Customer {customerId}</p>
        <div className={styles.grid}>
          <TextField
            label="First name"
            maxLength={25}
            requiredIndicator
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <TextField
            label="Middle name"
            maxLength={25}
            error={errors.middleName?.message}
            {...register('middleName')}
          />
          <TextField
            label="Last name"
            maxLength={25}
            requiredIndicator
            error={errors.lastName?.message}
            {...register('lastName')}
          />
          <TextField
            label="SSN"
            hint="9 digits: NNNNNNNNN"
            mono
            inputMode="numeric"
            maxLength={9}
            requiredIndicator
            error={errors.ssn?.message}
            {...register('ssn')}
          />
          <TextField
            label="Date of birth"
            hint="YYYY-MM-DD, not in the future"
            mono
            inputMode="numeric"
            maxLength={10}
            requiredIndicator
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />
          <TextField
            label="FICO score"
            hint="300 to 850"
            mono
            inputMode="numeric"
            maxLength={3}
            requiredIndicator
            error={errors.ficoCreditScore?.message}
            {...register('ficoCreditScore')}
          />
          <TextField
            label="Government ID"
            mono
            maxLength={20}
            error={errors.governmentIssuedId?.message}
            {...register('governmentIssuedId')}
          />
          <RadioGroup
            label="Primary card holder"
            options={YN_OPTIONS}
            hint="Y or N"
            requiredIndicator
            error={errors.primaryCardholderIndicator?.message}
            {...register('primaryCardholderIndicator')}
          />
          <TextField
            label="Address line 1"
            maxLength={50}
            requiredIndicator
            error={errors.addressLine1?.message}
            {...register('addressLine1')}
          />
          <TextField
            label="Address line 2"
            maxLength={50}
            error={errors.addressLine2?.message}
            {...register('addressLine2')}
          />
          <TextField
            label="City"
            maxLength={50}
            requiredIndicator
            error={errors.addressLine3?.message}
            {...register('addressLine3')}
          />
          <TextField
            label="State"
            hint="2-letter US state code"
            maxLength={2}
            requiredIndicator
            error={errors.addressStateCode?.message}
            {...register('addressStateCode')}
          />
          <TextField
            label="ZIP code"
            hint="5 digits"
            mono
            inputMode="numeric"
            maxLength={5}
            requiredIndicator
            error={errors.addressZip?.message}
            {...register('addressZip')}
          />
          <TextField
            label="Country"
            hint="3-letter code"
            maxLength={3}
            requiredIndicator
            error={errors.addressCountryCode?.message}
            {...register('addressCountryCode')}
          />
          <TextField
            label="Phone 1"
            hint="(NNN)NNN-NNNN — digits only"
            mono
            inputMode="numeric"
            maxLength={10}
            error={errors.phoneNumber1?.message}
            {...register('phoneNumber1')}
          />
          <TextField
            label="Phone 2"
            hint="(NNN)NNN-NNNN — digits only"
            mono
            inputMode="numeric"
            maxLength={10}
            error={errors.phoneNumber2?.message}
            {...register('phoneNumber2')}
          />
          <TextField
            label="EFT account ID"
            hint="10 digits"
            mono
            inputMode="numeric"
            maxLength={10}
            requiredIndicator
            error={errors.eftAccountId?.message}
            {...register('eftAccountId')}
          />
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="secondary" disabled={busy}>
          Validate changes
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={phase !== 'validated' && phase !== 'saving'}
          loading={phase === 'saving'}
          onClick={onSave}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            reset(baseline)
            onDiscard()
          }}
        >
          Discard changes
        </Button>
      </div>
    </form>
  )
}
