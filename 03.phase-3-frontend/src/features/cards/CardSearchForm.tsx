import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Card, TextField } from '../../components/ui'
import { cardSearchSchema } from '../../validation/cardSearch'
import type { CardSearchFormValues } from '../../validation/cardSearch'
import styles from './forms.module.css'

export interface CardSearchFormProps {
  onSearch: (values: CardSearchFormValues) => void
  busy?: boolean
  initialAccountId?: string
  initialCardNumber?: string
  /** Increment to move focus back to the account field after a failed lookup. */
  refocusToken?: number
}

/** Account + card number lookup used by Card Detail and Card Update (SCREEN-07/08). */
export function CardSearchForm({
  onSearch,
  busy = false,
  initialAccountId = '',
  initialCardNumber = '',
  refocusToken = 0,
}: CardSearchFormProps) {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<CardSearchFormValues>({
    resolver: zodResolver(cardSearchSchema),
    mode: 'onBlur',
    defaultValues: { accountId: initialAccountId, cardNumber: initialCardNumber },
  })

  useEffect(() => {
    if (refocusToken > 0) {
      setFocus('accountId')
    }
  }, [refocusToken, setFocus])

  return (
    <Card title="Find a card">
      <form
        noValidate
        onSubmit={handleSubmit(
          (values) =>
            onSearch({
              accountId: values.accountId.trim(),
              cardNumber: values.cardNumber.trim(),
            }),
          (formErrors) => setFocus(formErrors.accountId ? 'accountId' : 'cardNumber'),
        )}
      >
        <div className={styles.searchBar}>
          <TextField
            label="Account number"
            hint="11 digits"
            error={errors.accountId?.message}
            requiredIndicator
            mono
            inputMode="numeric"
            maxLength={11}
            autoComplete="off"
            fieldClassName={styles.searchField}
            {...register('accountId')}
          />
          <TextField
            label="Card number"
            hint="16 digits"
            error={errors.cardNumber?.message}
            requiredIndicator
            mono
            inputMode="numeric"
            maxLength={16}
            autoComplete="off"
            fieldClassName={styles.searchField}
            {...register('cardNumber')}
          />
          <Button type="submit" loading={busy} className={styles.searchButton}>
            Look up
          </Button>
        </div>
      </form>
    </Card>
  )
}
