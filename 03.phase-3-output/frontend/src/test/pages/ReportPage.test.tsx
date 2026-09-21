import { HttpResponse, http } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../server'
import { ReportPage } from '../../pages/ReportPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportPage />
    </MemoryRouter>,
  )
}

describe('ReportPage (CORPT00C)', () => {
  it('renders the screen header, report-type radios, confirm field, and validate action initially', () => {
    renderPage()
    expect(screen.getByText('CORPT00C')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Transaction Report' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Yearly' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Custom' })).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm (Y/N)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter (validate)' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Start Date (YYYY-MM-DD)')).not.toBeInTheDocument()
  })

  it('blocks validate with "Select a report type..." when no report type is chosen (VR-098)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Select a report type to print report...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter (validate)' })).toBeInTheDocument()
  })

  it('reveals date fields only for Custom and requires them (VR-099/111/112)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Custom' }))
    expect(screen.getByLabelText('Start Date (YYYY-MM-DD)')).toBeInTheDocument()
    expect(screen.getByLabelText('End Date (YYYY-MM-DD)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Start Date can NOT be empty...')).toBeInTheDocument()
    expect(screen.getByText('End Date can NOT be empty...')).toBeInTheDocument()
  })

  it('blocks with format/date-validity messages for a malformed custom date range', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Custom' }))
    await user.type(screen.getByLabelText('Start Date (YYYY-MM-DD)'), '2024/01/01')
    await user.type(screen.getByLabelText('End Date (YYYY-MM-DD)'), '2024-02-30')
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(await screen.findByText('Start Date should be in format YYYY-MM-DD')).toBeInTheDocument()
    expect(screen.getByText('End Date - Not a valid date...')).toBeInTheDocument()
  })

  it('validates Monthly (no date fields required) and toggles the button to confirm', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    expect(
      await screen.findByText('Report request validated. Set Confirm to Y and press Enter to submit.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter (confirm)' })).toBeInTheDocument()
  })

  it('re-validating after changing a field resets the button back to validate mode', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await screen.findByRole('button', { name: 'Enter (confirm)' })
    await user.click(screen.getByRole('radio', { name: 'Yearly' }))
    expect(screen.getByRole('button', { name: 'Enter (validate)' })).toBeInTheDocument()
  })

  it('blocks confirm with "Please confirm to print the <reportType> report..." when confirm is blank (VR-113)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await user.click(await screen.findByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Please confirm to print the MONTHLY report...')).toBeInTheDocument()
  })

  it('blocks confirm with the interpolated invalid-value message for a non Y/N confirm (VR-114)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'X')
    await user.click(await screen.findByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('"X" is not a valid value to confirm...')).toBeInTheDocument()
  })

  it('clears the whole form and shows no message when confirm is N (CORPT00C INITIALIZE-ALL-FIELDS)', async () => {
    let submitted = false
    server.use(
      http.post('/api/reports', () => {
        submitted = true
        return HttpResponse.json({ periodStart: '2024-01-01', periodEnd: '2024-01-31' })
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'N')
    await user.click(await screen.findByRole('button', { name: 'Enter (confirm)' }))
    expect(submitted).toBe(false)
    expect(screen.queryByRole('button', { name: 'Enter (confirm)' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Monthly' })).not.toBeChecked()
    expect(screen.queryByText(/Please confirm to print/)).not.toBeInTheDocument()
  })

  it('submits the report and shows the success message when confirm is Y', async () => {
    server.use(
      http.post('/api/reports', () =>
        HttpResponse.json({ message: 'Report job submitted.', periodStart: '2024-01-01', periodEnd: '2024-01-31' }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'Y')
    await user.click(await screen.findByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Report job submitted.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter (validate)' })).toBeInTheDocument()
  })

  it('clears a stale "Please confirm..." field error once the report submits successfully', async () => {
    server.use(
      http.post('/api/reports', () =>
        HttpResponse.json({ message: 'Report job submitted.', periodStart: '2024-01-01', periodEnd: '2024-01-31' }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    // Trigger the blank-confirm field error first (VR-113), leaving errors.confirm set...
    await user.click(await screen.findByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Please confirm to print the MONTHLY report...')).toBeInTheDocument()
    // ...then fill Confirm=Y and submit successfully; the stale error must not linger
    // alongside the success message.
    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'Y')
    await user.click(screen.getByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Report job submitted.')).toBeInTheDocument()
    expect(screen.queryByText('Please confirm to print the MONTHLY report...')).not.toBeInTheDocument()
  })

  it('shows backend 400 field errors mapped onto the form when the submit fails', async () => {
    server.use(
      http.post('/api/reports', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed.',
            errors: [{ field: 'confirm', message: 'Invalid value. Valid values are (Y/N)...' }],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: 'Monthly' }))
    await user.click(screen.getByRole('button', { name: 'Enter (validate)' }))
    await user.type(screen.getByLabelText('Confirm (Y/N)'), 'Y')
    await user.click(await screen.findByRole('button', { name: 'Enter (confirm)' }))
    expect(await screen.findByText('Validation failed.')).toBeInTheDocument()
  })

  it('has a Back link to the main menu', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'F3 = Exit/Back' })).toHaveAttribute('href', '/menu')
  })
})
