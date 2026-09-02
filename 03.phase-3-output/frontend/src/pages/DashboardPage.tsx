import { Link } from 'react-router-dom'
import type { Session } from '../api/types'
import { PageHeader } from '../components/ui'
const userTasks = [
  ['Look up an account', '/accounts'],
  ['Browse cards', '/cards'],
  ['Browse transactions', '/transactions'],
  ['Make a bill payment', '/payments'],
  ['Request a report', '/reports'],
]
const adminTasks = [
  ['Browse users', '/users'],
  ['Add a user', '/users/new'],
  ['Update a user', '/users/update'],
  ['Delete a user', '/users/delete'],
]
export function DashboardPage({ session }: { session: Session }) {
  const tasks = session.role === 'ADMINISTRATOR' ? adminTasks : userTasks
  return (
    <>
      <PageHeader
        title="Workspace"
        description={
          session.role === 'ADMINISTRATOR'
            ? 'Manage application access and security users.'
            : 'Select a task to manage card services.'
        }
      />
      <div className="task-grid">
        {tasks.map(([name, link]) => (
          <Link key={link} className="task-card" to={link}>
            <h2>{name}</h2>
            <span>Open workflow →</span>
          </Link>
        ))}
      </div>
    </>
  )
}
