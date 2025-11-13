import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import FilterPanel, { FilterState } from './FilterPanel'

describe('FilterPanel', () => {
  const defaultFilters: FilterState = {
    dateRange: {
      preset: 'all',
      startDate: '',
      endDate: '',
    },
    statuses: [],
    amountRange: {
      min: '',
      max: '',
    },
  }

  const mockOnFiltersChange = jest.fn()
  const mockOnClearFilters = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders filter panel with toggle button', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    expect(screen.getByText(/filters/i)).toBeInTheDocument()
  })

  it('shows active filter count badge', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={3}
      />
    )

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('expands and collapses filter panel', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Initially collapsed - date presets should not be visible
    expect(screen.queryByText('All Time')).not.toBeInTheDocument()

    // Find the expand/collapse button (the one with arrow icon)
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1] // Last button is the toggle
    fireEvent.click(toggleButton)

    // Should be expanded - date presets should be visible
    expect(screen.getByText('All Time')).toBeInTheDocument()
  })

  it('renders all date preset options', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    expect(screen.getByText('All Time')).toBeInTheDocument()
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument()
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument()
    expect(screen.getByText('Last 90 Days')).toBeInTheDocument()
    expect(screen.getByText('This Year')).toBeInTheDocument()
    expect(screen.getByText('Custom Range')).toBeInTheDocument()
  })

  it('renders all status options', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('Processing')).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('calls onFiltersChange when date preset is selected', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    // Click "Last 7 Days"
    const sevenDaysButton = screen.getByText('Last 7 Days')
    fireEvent.click(sevenDaysButton)

    expect(mockOnFiltersChange).toHaveBeenCalled()
    const call = mockOnFiltersChange.mock.calls[0][0]
    expect(call.dateRange.preset).toBe('7days')
    expect(call.dateRange.startDate).toBeTruthy()
    expect(call.dateRange.endDate).toBeTruthy()
  })

  it('toggles status filter on click', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    // Click "Submitted" status
    const submittedButton = screen.getByText('Submitted')
    fireEvent.click(submittedButton)

    expect(mockOnFiltersChange).toHaveBeenCalled()
    const call = mockOnFiltersChange.mock.calls[0][0]
    expect(call.statuses).toContain('submitted')
  })

  it('removes status when clicked again', () => {
    const filtersWithStatus: FilterState = {
      ...defaultFilters,
      statuses: ['submitted'],
    }

    render(
      <FilterPanel
        filters={filtersWithStatus}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={1}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    // Click "Submitted" to remove it
    const submittedButton = screen.getByText('Submitted')
    fireEvent.click(submittedButton)

    expect(mockOnFiltersChange).toHaveBeenCalled()
    const call = mockOnFiltersChange.mock.calls[0][0]
    expect(call.statuses).not.toContain('submitted')
  })

  it('calls onClearFilters when clear button is clicked', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={3}
      />
    )

    // Find and click clear button (no need to expand)
    const clearButton = screen.getByText(/clear/i)
    fireEvent.click(clearButton)

    expect(mockOnClearFilters).toHaveBeenCalled()
  })

  it('updates amount range min value', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    // Find min amount input
    const minInput = screen.getByLabelText(/min amount/i)
    fireEvent.change(minInput, { target: { value: '100' } })

    expect(mockOnFiltersChange).toHaveBeenCalled()
    const call = mockOnFiltersChange.mock.calls[0][0]
    expect(call.amountRange.min).toBe('100')
  })

  it('updates amount range max value', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    // Find max amount input
    const maxInput = screen.getByLabelText(/max amount/i)
    fireEvent.change(maxInput, { target: { value: '500' } })

    expect(mockOnFiltersChange).toHaveBeenCalled()
    const call = mockOnFiltersChange.mock.calls[0][0]
    expect(call.amountRange.max).toBe('500')
  })

  it('handles custom date range selection', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    // Click "Custom Range"
    const customButton = screen.getByText('Custom Range')
    fireEvent.click(customButton)

    expect(mockOnFiltersChange).toHaveBeenCalled()
    const call = mockOnFiltersChange.mock.calls[0][0]
    expect(call.dateRange.preset).toBe('custom')
    expect(call.dateRange.startDate).toBe('')
    expect(call.dateRange.endDate).toBe('')
  })

  it('calculates correct date range for "This Year"', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    // Click "This Year"
    const yearButton = screen.getByText('This Year')
    fireEvent.click(yearButton)

    expect(mockOnFiltersChange).toHaveBeenCalled()
    const call = mockOnFiltersChange.mock.calls[0][0]
    expect(call.dateRange.preset).toBe('year')

    // Should start from January 1st of current year
    const currentYear = new Date().getFullYear()
    expect(call.dateRange.startDate).toContain(`${currentYear}-01-01`)
  })

  it('allows multiple status selections', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        activeFilterCount={0}
      />
    )

    // Expand panel
    const buttons = screen.getAllByRole('button')
    const toggleButton = buttons[buttons.length - 1]
    fireEvent.click(toggleButton)

    // Click multiple statuses
    fireEvent.click(screen.getByText('Submitted'))
    fireEvent.click(screen.getByText('Processing'))

    expect(mockOnFiltersChange).toHaveBeenCalledTimes(2)
  })
})

