import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SearchBar from './SearchBar'

// Mock the useDebounce hook
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string, delay: number) => value, // Return immediately for testing
}))

describe('SearchBar', () => {
  it('renders with default placeholder', () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...')
    expect(input).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} placeholder="Find items..." />)

    const input = screen.getByPlaceholderText('Find items...')
    expect(input).toBeInTheDocument()
  })

  it('calls onSearch when user types', async () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...')
    fireEvent.change(input, { target: { value: 'test query' } })

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test query')
    })
  })

  it('shows clear button when there is text', () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...')
    
    // Initially no clear button
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    // Type something
    fireEvent.change(input, { target: { value: 'test' } })

    // Clear button should appear
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('clears search when clear button is clicked', async () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...') as HTMLInputElement
    
    // Type something
    fireEvent.change(input, { target: { value: 'test query' } })
    expect(input.value).toBe('test query')

    // Click clear button
    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)

    // Input should be cleared
    expect(input.value).toBe('')

    // onSearch should be called with empty string
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('')
    })
  })

  it('hides clear button when search is cleared', () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...')
    
    // Type something
    fireEvent.change(input, { target: { value: 'test' } })
    expect(screen.getByRole('button')).toBeInTheDocument()

    // Clear it
    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)

    // Clear button should be hidden
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const mockOnSearch = jest.fn()
    const { container } = render(
      <SearchBar onSearch={mockOnSearch} className="custom-class" />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })

  it('renders search icon', () => {
    const mockOnSearch = jest.fn()
    const { container } = render(<SearchBar onSearch={mockOnSearch} />)

    // Check for search icon SVG
    const searchIcon = container.querySelector('svg')
    expect(searchIcon).toBeInTheDocument()
  })

  it('updates input value when user types', () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...') as HTMLInputElement
    
    fireEvent.change(input, { target: { value: 'new search' } })
    expect(input.value).toBe('new search')
  })

  it('calls onSearch on initial render with empty string', async () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('')
    })
  })

  it('handles multiple rapid changes', async () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...')
    
    // Type multiple times rapidly
    fireEvent.change(input, { target: { value: 't' } })
    fireEvent.change(input, { target: { value: 'te' } })
    fireEvent.change(input, { target: { value: 'tes' } })
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test')
    })
  })

  it('handles empty string search', async () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...')
    
    // Type and then clear
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.change(input, { target: { value: '' } })

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('')
    })
  })

  it('handles special characters in search', async () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...')
    
    fireEvent.change(input, { target: { value: 'test@#$%' } })

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test@#$%')
    })
  })

  it('handles very long search queries', async () => {
    const mockOnSearch = jest.fn()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText('Search products...')
    const longQuery = 'a'.repeat(1000)
    
    fireEvent.change(input, { target: { value: longQuery } })

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith(longQuery)
    })
  })
})

