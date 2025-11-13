import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SemanticSearch } from './SemanticSearch'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))
jest.mock('@/components/b2b', () => ({
  Input: ({ ...props }: any) => <input {...props} />,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}))

describe('SemanticSearch', () => {
  let mockRouter: any

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
    }
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)

    // Mock timers for debounce
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders search input with placeholder', () => {
    render(<SemanticSearch />)

    expect(screen.getByPlaceholderText(/search products naturally/i)).toBeInTheDocument()
  })

  it('renders custom placeholder when provided', () => {
    render(<SemanticSearch placeholder="Custom search placeholder" />)

    expect(screen.getByPlaceholderText('Custom search placeholder')).toBeInTheDocument()
  })

  it('updates query when user types', () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'test query' } })

    expect(input).toHaveValue('test query')
  })

  it('disables search button when query is empty', () => {
    render(<SemanticSearch />)

    const searchButton = screen.getByRole('button', { name: /search/i })
    expect(searchButton).toBeDisabled()
  })

  it('enables search button when query has text', () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'test' } })

    const searchButton = screen.getByRole('button', { name: /search/i })
    expect(searchButton).not.toBeDisabled()
  })

  it('shows AI sparkles icon in semantic mode', () => {
    render(<SemanticSearch />)

    // Sparkles icon should be present (semantic mode is default)
    const sparklesIcon = document.querySelector('.lucide-sparkles')
    expect(sparklesIcon).toBeInTheDocument()
  })

  it('shows suggested filters for cup query', async () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'cup' } })

    // Fast-forward debounce timer
    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('AI-suggested filters:')).toBeInTheDocument()
      expect(screen.getByText('Hot Cups')).toBeInTheDocument()
      expect(screen.getByText('Cold Cups')).toBeInTheDocument()
      expect(screen.getByText('Disposable')).toBeInTheDocument()
    })
  })

  it('shows suggested filters for plate query', async () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'plate' } })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Paper Plates')).toBeInTheDocument()
      expect(screen.getByText('Foam Plates')).toBeInTheDocument()
      expect(screen.getByText('9 inch')).toBeInTheDocument()
    })
  })

  it('shows suggested filters for container query', async () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'container' } })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Food Containers')).toBeInTheDocument()
      expect(screen.getByText('Takeout')).toBeInTheDocument()
      expect(screen.getByText('Microwavable')).toBeInTheDocument()
    })
  })

  it('toggles filter selection when clicked', async () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'cup' } })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Hot Cups')).toBeInTheDocument()
    })

    const hotCupsFilter = screen.getByText('Hot Cups')
    fireEvent.click(hotCupsFilter)

    await waitFor(() => {
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
    })
  })

  it('removes filter when clicked again', async () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'cup' } })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Hot Cups')).toBeInTheDocument()
    })

    const hotCupsFilter = screen.getByText('Hot Cups')
    
    // Click to select
    fireEvent.click(hotCupsFilter)
    await waitFor(() => {
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
    })

    // Click again to deselect
    fireEvent.click(hotCupsFilter)
    await waitFor(() => {
      expect(screen.queryByText('Active filters:')).not.toBeInTheDocument()
    })
  })

  it('clears all filters when clear all clicked', async () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'cup' } })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Hot Cups')).toBeInTheDocument()
    })

    // Select multiple filters
    fireEvent.click(screen.getByText('Hot Cups'))
    fireEvent.click(screen.getByText('Cold Cups'))

    await waitFor(() => {
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
    })

    // Clear all
    const clearButton = screen.getByText('Clear all')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(screen.queryByText('Active filters:')).not.toBeInTheDocument()
    })
  })

  it('navigates to search results on submit', () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'test query' } })

    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('/products?q=test+query&mode=semantic')
    )
  })

  it('includes filters in navigation URL', async () => {
    render(<SemanticSearch />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'cup' } })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Hot Cups')).toBeInTheDocument()
    })

    // Select a filter
    fireEvent.click(screen.getByText('Hot Cups'))

    await waitFor(() => {
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
    })

    // Submit search
    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('filters=category%3Ahot-cups')
    )
  })

  it('calls onSearch callback when provided', async () => {
    const mockOnSearch = jest.fn()
    render(<SemanticSearch onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'test query' } })

    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith('test query', [])
  })

  it('calls onSearch with filters when provided', async () => {
    const mockOnSearch = jest.fn()
    render(<SemanticSearch onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'cup' } })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Hot Cups')).toBeInTheDocument()
    })

    // Select a filter
    fireEvent.click(screen.getByText('Hot Cups'))

    await waitFor(() => {
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
    })

    // Submit search
    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith('cup', ['category:hot-cups'])
  })

  it('does not show suggestions when showSuggestions is false', async () => {
    render(<SemanticSearch showSuggestions={false} />)

    const input = screen.getByPlaceholderText(/search products naturally/i)
    fireEvent.change(input, { target: { value: 'cup' } })

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.queryByText('AI-suggested filters:')).not.toBeInTheDocument()
    })
  })

  it('does not submit when query is empty', () => {
    render(<SemanticSearch />)

    const form = screen.getByRole('button', { name: /search/i }).closest('form')
    fireEvent.submit(form!)

    expect(mockRouter.push).not.toHaveBeenCalled()
  })
})

