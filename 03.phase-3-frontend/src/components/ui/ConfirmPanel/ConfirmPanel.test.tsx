import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmPanel } from '.'

afterEach(cleanup)

describe('ConfirmPanel', () => {
  it("reports 'Y' for the affirmative button", async () => {
    const onResult = vi.fn()
    render(<ConfirmPanel message="Confirm to add this transaction" confirmLabel="Yes, add" onResult={onResult} />)
    await userEvent.click(screen.getByRole('button', { name: 'Yes, add' }))
    expect(onResult).toHaveBeenCalledWith('Y')
  })

  it("reports 'N' for the negative button", async () => {
    const onResult = vi.fn()
    render(<ConfirmPanel message="Confirm to add this transaction" confirmLabel="Yes, add" onResult={onResult} />)
    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onResult).toHaveBeenCalledWith('N')
  })
})
