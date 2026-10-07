import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button, Card, TextField } from '../../components/ui'
import { cardListFilterSchema } from '../../validation/cardListFilter'
import type { CardListFilterFormValues } from '../../validation/cardListFilter'
import styles from './forms.module.css'

export interface CardListFilterFormProps {
  onApply: (filters: CardListFilterFormValues) => void
  busy?: boolean
}

/** Optional account/card filters above the Credit Card List (SCREEN-06). */
export function CardListFilterForm({ onApply, busy = false }: CardListFilterFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CardListFilterFormValues>({
    resolver: zodResolver(cardListFilterSchema),
    mode: 'onBlur',
    defaultValues: { accountId: '', cardNumber: '' },
  })

  return (
    <Card title="Filters">
      <form noValidate onSubmit={handleSubmit((values) => onApply(values))}>
        <div className={styles.searchBar}>
          <TextField
            label="Account number"
            hint="Optional · 11 digits"
            error={errors.accountId?.message}
            mono
            inputMode="numeric"
            maxLength={11}
            autoComplete="off"
            fieldClassName={styles.searchField}
            {...register('accountId')}
          />
          <TextField
            label="Card number"
            hint="Optional · 16 digits"
            error={errors.cardNumber?.message}
            mono
            inputMode="numeric"
            maxLength={16}
            autoComplete="off"
            fieldClassName={styles.searchField}
            {...register('cardNumber')}
          />
          <Button type="submit" loading={busy} className={styles.searchButton}>
            Apply
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            className={styles.searchButton}
            onClick={() => {
              reset({ accountId: '', cardNumber: '' })
              onApply({ accountId: '', cardNumber: '' })
            }}
          >
            Clear filters
          </Button>
        </div>
      </form>
    </Card>
  )
}
