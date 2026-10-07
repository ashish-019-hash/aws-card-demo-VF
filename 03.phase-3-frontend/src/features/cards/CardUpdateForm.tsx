import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Card, RadioGroup, TextField } from '../../components/ui'
import { cardUpdateSchema } from '../../validation/cardUpdate'
import type { CardUpdateFormValues } from '../../validation/cardUpdate'
import { formatCardNumber } from './format'
import { cardValuesDiffer } from './formValues'
import type { CardUpdatePhase } from './formValues'
import styles from './forms.module.css'

export interface CardUpdateFormProps {
  accountId: string
  cardNumber: string
  /** Fetched (or last saved) values; Discard resets to these. */
  baseline: CardUpdateFormValues
  phase: CardUpdatePhase
  /** Submit handler ("Validate changes" / Enter). */
  onValidated: (values: CardUpdateFormValues, changed: boolean) => void
  /** "Save" (legacy F5) — enabled only in the validated phase. */
  onSave: () => void
  /** "Discard changes" (legacy F12) — the form resets itself first. */
  onDiscard: () => void
  /** Any edit after validate/save drops the page back to editing. */
  onEdited: () => void
}

/**
 * Editable name / status / expiry of SCREEN-08 COCRDUP with the
 * validate → save phase flow.
 */
export function CardUpdateForm({
  accountId,
  cardNumber,
  baseline,
  phase,
  onValidated,
  onSave,
  onDiscard,
  onEdited,
}: CardUpdateFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<CardUpdateFormValues>({
    resolver: zodResolver(cardUpdateSchema),
    mode: 'onBlur',
    defaultValues: baseline,
  })

  // A fresh lookup or a completed save establishes a new baseline.
  useEffect(() => {
    reset(baseline)
  }, [baseline, reset])

  const busy = phase === 'saving'

  return (
    <Card
      title="Card details"
      subtitle={`Card ${formatCardNumber(cardNumber)} · Account ${accountId}`}
    >
      <form
        noValidate
        onSubmit={handleSubmit(
          (values) => onValidated(values, cardValuesDiffer(values, baseline)),
          (formErrors) => {
            const first = Object.keys(formErrors)[0] as keyof CardUpdateFormValues | undefined
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
        <div className={styles.grid}>
          <TextField
            label="Embossed name"
            hint="Letters and spaces only"
            requiredIndicator
            maxLength={50}
            disabled={busy}
            error={errors.embossedName?.message}
            {...register('embossedName')}
          />
          <RadioGroup
            label="Card status"
            options={[
              { value: 'Y', label: 'Active (Y)' },
              { value: 'N', label: 'Inactive (N)' },
            ]}
            hint="Y or N"
            requiredIndicator
            disabled={busy}
            error={errors.activeStatus?.message}
            {...register('activeStatus')}
          />
          <TextField
            label="Expiry month"
            hint="1 to 12"
            requiredIndicator
            mono
            inputMode="numeric"
            maxLength={2}
            disabled={busy}
            error={errors.expiryMonth?.message}
            {...register('expiryMonth')}
          />
          <TextField
            label="Expiry year"
            hint="4 digits, 1950 to 2099"
            requiredIndicator
            mono
            inputMode="numeric"
            maxLength={4}
            disabled={busy}
            error={errors.expiryYear?.message}
            {...register('expiryYear')}
          />
        </div>
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
    </Card>
  )
}
