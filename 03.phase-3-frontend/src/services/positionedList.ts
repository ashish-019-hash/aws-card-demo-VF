// Shared resolution of "positioned" list pages (legacy START BROWSE at a key).
// The backend list endpoints have no start-key parameter, so the starting
// offset inside the id-ascending list is located with a bounded binary search
// instead of scanning a fixed window — a fixed window silently reported
// end-of-file for anything past it.
import type { PageResponse } from './api'

export interface PositionedPage<T> {
  items: T[]
  /** Honest next-page indicator derived from the backend total, never from a scanned window. */
  hasNext: boolean
}

type FetchPage<T> = (page: number, size: number) => Promise<PageResponse<T>>

/**
 * Resolves one display page of an id-ascending list positioned at the first
 * record whose id is >= `key` (legacy "start from" behavior).
 *
 * Because the list is sorted by id, the records at or after the key form a
 * suffix. A lower-bound binary search with single-row probes finds the first
 * matching index in O(log n) requests, then the display rows are read with at
 * most two page-sized requests. `hasNext` comes from the backend's total
 * element count, so it stays truthful for any list size.
 */
export async function fetchPositionedPage<T>(
  fetchPage: FetchPage<T>,
  idOf: (item: T) => string,
  key: string,
  page: number,
  pageSize: number,
): Promise<PositionedPage<T>> {
  const probe = await fetchPage(0, 1)
  const total = probe.page.totalElements
  if (total <= 0) return { items: [], hasNext: false }

  // Lower bound of `key` over record indices. With size 1, server page n is
  // exactly the record at index n.
  let low = 0
  let high = total
  const firstItem = probe.content[0]
  if (firstItem !== undefined && idOf(firstItem) >= key) {
    high = 0
  }
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const midPage = await fetchPage(mid, 1)
    const item = midPage.content[0]
    if (item === undefined || idOf(item) >= key) {
      high = mid
    } else {
      low = mid + 1
    }
  }
  const firstIndex = low

  const start = firstIndex + page * pageSize
  if (start >= total) return { items: [], hasNext: false }

  // The display page spans at most two backend pages of the same size.
  const serverPage = Math.floor(start / pageSize)
  const offset = start - serverPage * pageSize
  const first = await fetchPage(serverPage, pageSize)
  let items = first.content.slice(offset)
  if (items.length < pageSize && start + items.length < total) {
    const second = await fetchPage(serverPage + 1, pageSize)
    items = items.concat(second.content.slice(0, pageSize - items.length))
  }
  return {
    items: items.slice(0, pageSize),
    hasNext: start + pageSize < total,
  }
}
