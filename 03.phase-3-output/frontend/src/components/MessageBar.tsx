export type Message = { kind: 'error' | 'success' | 'info'; text: string }

export function MessageBar({ kind, message }: { kind: 'error' | 'success' | 'info'; message: string | null | undefined }) {
  if (!message) return null
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`message-bar message-bar--${kind}`}>
      {message}
    </div>
  )
}
