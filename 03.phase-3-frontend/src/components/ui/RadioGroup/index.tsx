import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx } from '../cx'
import styles from './RadioGroup.module.css'

export interface RadioOption {
  value: string
  label: ReactNode
}

export interface RadioGroupProps
  extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'type' | 'children' | 'value' | 'defaultValue'> {
  label: ReactNode
  options: RadioOption[]
  hint?: ReactNode
  error?: string
  requiredIndicator?: boolean
  className?: string
}

/**
 * Fieldset of native radio inputs. Spread the result of react-hook-form's
 * register(name) directly onto the group: the shared name/onChange/onBlur/ref
 * are applied to every radio input.
 */
export function RadioGroup({
  label,
  options,
  hint,
  error,
  requiredIndicator = false,
  className,
  ...inputProps
}: RadioGroupProps) {
  const groupId = useId()
  const hintId = `${groupId}-hint`
  const errorId = `${groupId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <fieldset className={cx(styles.root, className)} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className={styles.legend}>
        {label}
        {requiredIndicator ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input type="radio" className={styles.input} value={option.value} {...inputProps} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      <span id={errorId} className={styles.error}>
        {error ?? ''}
      </span>
    </fieldset>
  )
}
