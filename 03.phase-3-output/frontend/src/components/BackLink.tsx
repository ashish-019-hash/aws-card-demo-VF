import { Link } from 'react-router-dom'

/** F3 = Exit/Back, per screen-flow.md's global navigation rule. */
export function BackLink({ to, label = 'F3 = Exit/Back' }: { to: string; label?: string }) {
  return (
    <div className="back-link">
      <Link to={to}>{label}</Link>
    </div>
  )
}
