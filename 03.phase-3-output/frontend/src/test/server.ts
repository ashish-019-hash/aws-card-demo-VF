import { setupServer } from 'msw/node'

/** Shared MSW server; each test file registers its own handlers via server.use(...). */
export const server = setupServer()
