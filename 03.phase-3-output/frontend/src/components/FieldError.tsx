export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null
  return <span className="field-error">{message}</span>
}
