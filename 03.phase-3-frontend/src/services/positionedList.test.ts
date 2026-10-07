import { describe, expect, it, vi } from 'vitest'
import type { PageResponse } from './api'
import { fetchPositionedPage } from './positionedList'

interface Row {
  id: string
}

/** Backend-style page source over an id-sorted in-memory list. */
function pageSource(ids: string[]) {
  return vi.fn(async (page: number, size: number): Promise<PageResponse<Row>> => {
    const start = page * size
    return {
      content: ids.slice(start, start + size).map((id) => ({ id })),
      page: {
        size,
        number: page,
        totalElements: ids.length,
        totalPages: Math.max(1, Math.ceil(ids.length / size)),
      },
    }
  })
}

const pad = (value: number) => String(value).padStart(16, '0')

describe('fetchPositionedPage', () => {
  it('positions at the first record >= key and pages from there', async () => {
    const ids = Array.from({ length: 35 }, (_, index) => pad(index + 1))
    const fetchPage = pageSource(ids)

    const first = await fetchPositionedPage(fetchPage, (row) => row.id, pad(12), 0, 10)
    expect(first.items.map((row) => row.id)).toEqual(ids.slice(11, 21))
    expect(first.hasNext).toBe(true)

    const second = await fetchPositionedPage(fetchPage, (row) => row.id, pad(12), 1, 10)
    expect(second.items.map((row) => row.id)).toEqual(ids.slice(21, 31))
    expect(second.hasNext).toBe(true)

    const last = await fetchPositionedPage(fetchPage, (row) => row.id, pad(12), 2, 10)
    expect(last.items.map((row) => row.id)).toEqual(ids.slice(31))
    expect(last.hasNext).toBe(false)
  })

  it('positions at a key that falls between stored ids', async () => {
    const ids = [pad(10), pad(20), pad(30)]
    const result = await fetchPositionedPage(pageSource(ids), (row) => row.id, pad(15), 0, 10)
    expect(result.items.map((row) => row.id)).toEqual([pad(20), pad(30)])
    expect(result.hasNext).toBe(false)
  })

  it('returns the whole list when the key precedes every record', async () => {
    const ids = [pad(10), pad(20), pad(30)]
    const result = await fetchPositionedPage(pageSource(ids), (row) => row.id, pad(1), 0, 10)
    expect(result.items.map((row) => row.id)).toEqual(ids)
    expect(result.hasNext).toBe(false)
  })

  it('returns an honest empty page when the key is past the last record', async () => {
    const ids = [pad(10), pad(20)]
    const result = await fetchPositionedPage(pageSource(ids), (row) => row.id, pad(99), 0, 10)
    expect(result.items).toEqual([])
    expect(result.hasNext).toBe(false)
  })

  it('handles an empty list', async () => {
    const result = await fetchPositionedPage(pageSource([]), (row) => row.id, pad(1), 0, 10)
    expect(result.items).toEqual([])
    expect(result.hasNext).toBe(false)
  })

  it('stays correct past the old 1,000-record window and never scans the whole file', async () => {
    // 2,500 records; the key sits at index 2,490 — far past the fixed
    // 1,000-record window that used to mis-report end-of-file.
    const ids = Array.from({ length: 2500 }, (_, index) => pad(index + 1))
    const fetchPage = pageSource(ids)

    const first = await fetchPositionedPage(fetchPage, (row) => row.id, pad(2491), 0, 10)
    expect(first.items.map((row) => row.id)).toEqual(ids.slice(2490, 2500))
    expect(first.hasNext).toBe(false)
    // Binary search plus at most two page reads — nowhere near a full scan.
    expect(fetchPage.mock.calls.length).toBeLessThan(20)

    const positionedEarly = await fetchPositionedPage(fetchPage, (row) => row.id, pad(1500), 0, 10)
    expect(positionedEarly.items[0]?.id).toBe(pad(1500))
    // More matching records exist past the first page: next must be honest.
    expect(positionedEarly.hasNext).toBe(true)
  })

  it('composes a display page that spans two backend pages', async () => {
    const ids = Array.from({ length: 30 }, (_, index) => pad(index + 1))
    // Key at index 14: rows 15..24 span backend pages 1 (indices 10-19) and 2 (20-29).
    const result = await fetchPositionedPage(pageSource(ids), (row) => row.id, pad(15), 0, 10)
    expect(result.items.map((row) => row.id)).toEqual(ids.slice(14, 24))
    expect(result.hasNext).toBe(true)
  })
})
