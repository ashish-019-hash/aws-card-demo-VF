import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Icon } from '../../icons'
import controls from '../controls.module.css'
import { cx } from '../cx'
import { FormField } from '../FormField'

export interface SelectFieldProps extends Omit<ComponentPropsWithRef<'select'>, 'id'> {
  label: ReactNode
  hint?: ReactNode
  error?: string
  requiredIndicator?: boolean
  id?: string
  fieldClassName?: string
}

export function SelectField({
  label,
  hint,
  error,
  requiredIndicator = false,
  id,
  fieldClassName,
  className,
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} required={requiredIndicator} id={id} className={fieldClassName}>
      {(controlProps) => (
        <div className={controls.wrap}>
          <select className={cx(controls.input, controls.select, className)} {...controlProps} {...rest}>
            {children}
          </select>
          <Icon name="chevronRight" size={16} className={controls.chevron} />
        </div>
      )}
    </FormField>
  )
}
