import { setupServer } from 'msw/node'
import { handlers, resetAuthentication, setAuthenticated } from './handlers'
export const server = setupServer(...handlers)
export { resetAuthentication, setAuthenticated }
