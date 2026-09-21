export function FieldError({ id, message }: { id?: string; message: string | undefined }) {
  if (!message) return null
  return (
    <span id={id} className="field-error">
      {message}
    </span>
  )
}
