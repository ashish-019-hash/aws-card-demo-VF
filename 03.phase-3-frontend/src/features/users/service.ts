// Step 3 — user administration data access through the real backend API.
import { api } from '../../services/api'
import type { AppUser } from '../../types/user'

/** Rows per User List page (SCREEN-14 shows ten users per page). */
export const USERS_PAGE_SIZE = 10

/**
 * Page size used when the start-user filter is applied. The backend list has
 * no server-side start-user filter, so filtered views fetch bounded id-sorted
 * pages and apply the documented `id >= key` positioning client-side.
 */
const FILTER_FETCH_SIZE = 100

/** Upper bound on records scanned while resolving a filtered view. */
const FILTER_FETCH_LIMIT = 1_000

export interface UserListResult {
  rows: AppUser[]
  /** 1-based page number. */
  page: number
  hasPrevious: boolean
  hasNext: boolean
}

/**
 * Resolve one page of the user list (SCREEN-14 COUSR00). An optional start
 * key positions the list at that user ID onwards (legacy USRIDIN behavior).
 * Without a key the backend page is used directly; with a key, bounded
 * id-sorted pages are fetched and filtered locally because the backend has no
 * start-user parameter.
 */
export async function fetchUserPage(startUserId: string, page: number): Promise<UserListResult> {
  const key = startUserId.trim().toUpperCase()

  if (!key) {
    const result = await api.users.list(page - 1, USERS_PAGE_SIZE)
    return {
      rows: result.content,
      page,
      hasPrevious: page > 1,
      hasNext: page < result.page.totalPages,
    }
  }

  // One row past the requested page tells us whether a next page exists.
  const needed = page * USERS_PAGE_SIZE + 1
  const matching: AppUser[] = []
  let fetched = 0

  for (let pageIndex = 0; ; pageIndex += 1) {
    const result = await api.users.list(pageIndex, FILTER_FETCH_SIZE)
    for (const user of result.content) {
      if (user.id >= key) matching.push(user)
    }
    fetched += result.content.length
    const isLastServerPage =
      result.content.length === 0 || pageIndex + 1 >= result.page.totalPages
    if (isLastServerPage || matching.length >= needed || fetched >= FILTER_FETCH_LIMIT) break
  }

  const start = (page - 1) * USERS_PAGE_SIZE
  return {
    rows: matching.slice(start, start + USERS_PAGE_SIZE),
    page,
    hasPrevious: page > 1,
    hasNext: matching.length > start + USERS_PAGE_SIZE,
  }
}
