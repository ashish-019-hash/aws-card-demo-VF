import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button, TextField } from '../../components/ui'
import { userListFilterSchema, type UserListFilterFormValues } from '../../validation/userListFilter'
import styles from './users.module.css'

export interface UserListFilterFormProps {
  /** List fetch in flight: the submit button shows its loading state. */
  loading?: boolean
  onApply: (userId: string) => void
}

/**
 * Optional user-ID filter that positions the User List at that key
 * (SCREEN-14 COUSR00 USRIDIN).
 */
export function UserListFilterForm({ loading = false, onApply }: UserListFilterFormProps) {
  const { register, handleSubmit } = useForm<UserListFilterFormValues>({
    resolver: zodResolver(userListFilterSchema),
    mode: 'onBlur',
    defaultValues: { userId: '' },
  })

  return (
    <form
      className={styles.searchBar}
      noValidate
      onSubmit={handleSubmit((values) => onApply(values.userId ?? ''))}
    >
      <TextField
        label="Start from user ID"
        mono
        maxLength={8}
        autoComplete="off"
        placeholder="Optional · 8-character user ID"
        fieldClassName={styles.searchField}
        {...register('userId')}
      />
      <div className={styles.searchActions}>
        <Button type="submit" loading={loading}>
          Go
        </Button>
      </div>
    </form>
  )
}
