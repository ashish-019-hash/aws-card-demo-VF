import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui'
import { TextField } from '../../components/ui'
import { userSearchSchema, type UserSearchFormValues } from '../../validation/userSearch'
import styles from './users.module.css'

export interface UserSearchFormProps {
  /** Pre-filled user ID when the page was opened from the User List. */
  initialUserId?: string
  /** Lookup in flight: the fetch button shows its loading state. */
  loading?: boolean
  /**
   * Disables the whole lookup step. Set while a save or delete is in flight
   * so a new lookup or clear cannot race the pending mutation.
   */
  disabled?: boolean
  onSearch: (userId: string) => void
  /** Clears the whole screen (legacy F4). */
  onClear: () => void
}

/**
 * User ID lookup step shared by User Update and User Delete
 * (SCREEN-16/17 COUSR02/COUSR03). The resolver enforces RULE-VAL-077/080:
 * a blank User ID shows the legacy field message instead of searching.
 */
export function UserSearchForm({ initialUserId, loading = false, disabled = false, onSearch, onClear }: UserSearchFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserSearchFormValues>({
    resolver: zodResolver(userSearchSchema),
    mode: 'onBlur',
    defaultValues: { userId: initialUserId ?? '' },
  })

  return (
    <form
      className={styles.searchBar}
      noValidate
      onSubmit={handleSubmit((values) => onSearch(values.userId))}
    >
      <TextField
        label="User ID"
        requiredIndicator
        mono
        maxLength={8}
        autoComplete="off"
        placeholder="8-character user ID"
        error={errors.userId?.message}
        fieldClassName={styles.searchField}
        disabled={disabled}
        {...register('userId')}
      />
      <div className={styles.searchActions}>
        <Button type="submit" loading={loading} disabled={disabled}>
          Fetch user
        </Button>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            reset({ userId: '' })
            onClear()
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
