import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx } from '../cx'
import styles from './CheckboxField.module.css'

export interface CheckboxFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'type'> {
  label: ReactNode
  hint?: ReactNode
  error?: string
  id?: string
  fieldClassName?: string
}

export function CheckboxField({ label, hint, error, id, fieldClassName, className, ...rest }: CheckboxFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx(styles.root, fieldClassName)}>
      <label className={styles.option} htmlFor={fieldId}>
        <input
          type="checkbox"
          id={fieldId}
          className={cx(styles.input, className)}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      <span id={errorId} className={styles.error}>
        {error ?? ''}
      </span>
    </div>
  )
}
