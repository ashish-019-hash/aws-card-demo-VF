import type { ComponentPropsWithRef, ReactNode } from 'react'
import controls from '../controls.module.css'
import { cx } from '../cx'
import { FormField } from '../FormField'

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: ReactNode
  hint?: ReactNode
  error?: string
  /** Monospace value styling for account, card and transaction numbers. */
  mono?: boolean
  /** Shows the decorative required marker without enabling native validation. */
  requiredIndicator?: boolean
  /** Trailing adornment inside the input (for example a show/hide password toggle). */
  trailing?: ReactNode
  id?: string
  fieldClassName?: string
}

export function TextField({
  label,
  hint,
  error,
  mono = false,
  requiredIndicator = false,
  trailing,
  id,
  fieldClassName,
  className,
  type = 'text',
  ...rest
}: TextFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} required={requiredIndicator} id={id} className={fieldClassName}>
      {(controlProps) => (
        <div className={controls.wrap}>
          <input
            type={type}
            className={cx(controls.input, mono && controls.mono, Boolean(trailing) && controls.hasTrailing, className)}
            {...controlProps}
            {...rest}
          />
          {trailing ? <div className={controls.trailing}>{trailing}</div> : null}
        </div>
      )}
    </FormField>
  )
}
