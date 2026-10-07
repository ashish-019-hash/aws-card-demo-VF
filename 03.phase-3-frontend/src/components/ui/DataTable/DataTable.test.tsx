import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DataTable } from '.'
import type { DataTableColumn } from '.'

afterEach(cleanup)

interface Row {
  id: string
  name: string
}

const columns: Array<DataTableColumn<Row>> = [
  { key: 'id', header: 'ID', cell: (row) => row.id, mono: true },
  { key: 'name', header: 'Name', cell: (row) => row.name },
]

const baseProps = {
  caption: 'Cards',
  columns,
  rowKey: (row: Row) => row.id,
}

describe('DataTable', () => {
  it('renders a semantic table with rows', () => {
    render(<DataTable {...baseProps} rows={[{ id: '1', name: 'Alpha' }]} />)
    expect(screen.getByRole('table', { name: 'Cards' })).toBeInTheDocument()
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0)
  })

  it('renders a loading state', () => {
    render(<DataTable {...baseProps} rows={[]} loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders an error state', () => {
    render(<DataTable {...baseProps} rows={[]} error="Unable to load cards" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load cards')
  })

  it('renders an empty state', () => {
    render(<DataTable {...baseProps} rows={[]} empty={{ title: 'No cards match these filters' }} />)
    expect(screen.getByText('No cards match these filters')).toBeInTheDocument()
  })
})
