// Step 3 — user administration data access through the real backend API.
import { api } from '../../services/api'
import { fetchPositionedPage } from '../../services/positionedList'
import type { AppUser } from '../../types/user'

/** Rows per User List page (SCREEN-14 shows ten users per page). */
export const USERS_PAGE_SIZE = 10

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
 * Without a key the backend page is used directly; with a key, the start
 * offset in the id-ascending list is located with a bounded binary search
 * because the backend has no start-user parameter — honest for any list
 * size, unlike a fixed scanned window.
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

  const positioned = await fetchPositionedPage(
    (pageNumber, size) => api.users.list(pageNumber, size),
    (user) => user.id,
    key,
    page - 1,
    USERS_PAGE_SIZE,
  )
  return {
    rows: positioned.items,
    page,
    hasPrevious: page > 1,
    hasNext: positioned.hasNext,
  }
}
