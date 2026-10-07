import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Card } from '../../components/ui'
import { TextField } from '../../components/ui'
import { accountSearchSchema } from '../../validation/accountSearch'
import type { AccountSearchFormValues } from '../../validation/accountSearch'
import styles from './forms.module.css'

export interface AccountSearchFormProps {
  onSearch: (accountId: string) => void
  /** Disables the submit button while a lookup runs. */
  busy?: boolean
  initialAccountId?: string
  /**
   * Increment to move focus back to the account field after a failed lookup
   * (the legacy "cursor on the field to fix" behavior).
   */
  refocusToken?: number
}

/** Account number lookup used by Account View and Account Update. */
export function AccountSearchForm({
  onSearch,
  busy = false,
  initialAccountId = '',
  refocusToken = 0,
}: AccountSearchFormProps) {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<AccountSearchFormValues>({
    resolver: zodResolver(accountSearchSchema),
    mode: 'onBlur',
    defaultValues: { accountId: initialAccountId },
  })

  useEffect(() => {
    if (refocusToken > 0) {
      setFocus('accountId')
    }
  }, [refocusToken, setFocus])

  return (
    <Card title="Find an account">
      <form
        noValidate
        onSubmit={handleSubmit(
          (values) => onSearch(values.accountId.trim()),
          () => setFocus('accountId'),
        )}
      >
        <div className={styles.searchBar}>
          <TextField
            label="Account number"
            hint="11 digits, numeric, not all zeroes."
            error={errors.accountId?.message}
            requiredIndicator
            mono
            inputMode="numeric"
            maxLength={11}
            placeholder="Enter 11-digit account number"
            autoComplete="off"
            fieldClassName={styles.searchField}
            {...register('accountId')}
          />
          <Button type="submit" loading={busy} className={styles.searchButton}>
            Look up
          </Button>
        </div>
      </form>
    </Card>
  )
}
