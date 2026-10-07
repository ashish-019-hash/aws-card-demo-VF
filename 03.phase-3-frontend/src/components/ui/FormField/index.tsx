import { cloneElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { cx } from '../cx'
import styles from './FormField.module.css'

export interface FormFieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export interface FormFieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  /** Shows a decorative required marker next to the label. */
  required?: boolean
  id?: string
  className?: string
  /**
   * A single form control, or a render function when the control needs extra
   * wrapper markup (for example a password visibility toggle).
   */
  children: ReactElement<FormFieldControlProps> | ((controlProps: FormFieldControlProps) => ReactNode)
}

/**
 * Wraps a control with a visible label, optional hint and an always-reserved
 * error line. Wires id, aria-describedby and aria-invalid onto the control.
 */
export function FormField({ label, hint, error, required = false, id, className, children }: FormFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  const controlProps: FormFieldControlProps = {
    id: fieldId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  }

  const control = typeof children === 'function' ? children(controlProps) : cloneElement(children, controlProps)

  return (
    <div className={cx(styles.root, className)}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {control}
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
