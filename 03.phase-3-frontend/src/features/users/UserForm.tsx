import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Card, RadioGroup, TextField } from '../../components/ui'
import { userAddSchema, type UserAddFormValues } from '../../validation/userAdd'
import { userUpdateSchema } from '../../validation/userUpdate'
import styles from './users.module.css'

/** Field set shared by User Add and User Update (SCREEN-15/16). */
export type UserFormValues = UserAddFormValues

export interface UserFormProps {
  /** 'add' = empty form (SCREEN-15); 'update' = fetched user, ID read-only (SCREEN-16). */
  mode: 'add' | 'update'
  title: ReactNode
  subtitle?: ReactNode
  defaultValues: UserFormValues
  submitLabel: string
  /** Submit in flight: the primary button shows its loading state. */
  submitting?: boolean
  /** Muted text on the left of the card footer (documented prompt). */
  footerNote?: ReactNode
  /** Extra buttons rendered before the primary action (Cancel, Clear…). */
  secondaryActions?: ReactNode
  onSubmit: (values: UserFormValues) => void
  /** 'add' mode only: resets the fields to empty (legacy F4). */
  onClear?: () => void
}

const USER_TYPE_OPTIONS = [
  { value: 'U', label: 'U — Regular user' },
  { value: 'A', label: 'A — Administrator' },
]

/**
 * User maintenance form: first/last name, user ID, password and type
 * (ENTITY-011 field lengths). The resolver enforces the Step 4 rules:
 * RULE-VAL-075 (add) / RULE-VAL-077+078 (update) required fields with the
 * legacy messages, plus the backend 8-72 password length. Fields register in
 * the legacy check order, so react-hook-form focuses the first invalid field
 * on submit.
 */
export function UserForm({
  mode,
  title,
  subtitle,
  defaultValues,
  submitLabel,
  submitting = false,
  footerNote,
  secondaryActions,
  onSubmit,
  onClear,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(mode === 'add' ? userAddSchema : userUpdateSchema),
    mode: 'onBlur',
    defaultValues,
  })

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <Card
        title={title}
        subtitle={subtitle}
        footer={
          <>
            <span className={styles.footNote}>{footerNote}</span>
            <div className={styles.footActions}>
              {onClear ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    reset(defaultValues)
                    onClear()
                  }}
                >
                  Clear form
                </Button>
              ) : null}
              {secondaryActions}
              <Button type="submit" loading={submitting}>
                {submitLabel}
              </Button>
            </div>
          </>
        }
      >
        <div className={styles.formGrid}>
          <TextField
            label="First name"
            requiredIndicator
            maxLength={20}
            autoComplete="off"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <TextField
            label="Last name"
            requiredIndicator
            maxLength={20}
            autoComplete="off"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
          <TextField
            label="User ID"
            requiredIndicator
            mono
            maxLength={8}
            autoComplete="off"
            hint="8 characters, must be unique"
            readOnly={mode === 'update'}
            error={errors.userId?.message}
            {...register('userId')}
          />
          <TextField
            label="Password"
            requiredIndicator
            type="password"
            maxLength={72}
            autoComplete="new-password"
            hint={
              mode === 'update'
                ? 'Stored passwords are never shown. Enter the current password or a replacement (8 to 72 characters) to save.'
                : '8 to 72 characters'
            }
            error={errors.password?.message}
            {...register('password')}
          />
          <RadioGroup
            label="User type"
            requiredIndicator
            options={USER_TYPE_OPTIONS}
            hint="Administrators see the Admin Menu; regular users see the Main Menu."
            error={errors.userType?.message}
            {...register('userType')}
          />
        </div>
      </Card>
    </form>
  )
}
