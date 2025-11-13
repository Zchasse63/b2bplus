import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VisualSearch } from './VisualSearch'

// Mock B2B components
jest.mock('@/components/b2b/Button', () => ({
  Button: ({ children, onClick, disabled, icon, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {icon}
      {children}
    </button>
  ),
}))

jest.mock('@/components/b2b/Card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="card" {...props}>
      {children}
    </div>
  ),
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  onload: null as any,
  result: 'data:image/png;base64,mockImageData',
}

global.FileReader = jest.fn(() => mockFileReader) as any

describe('VisualSearch', () => {
  const mockOnSearch = jest.fn()

  // Helper function to get file input
  const getFileInput = (container: HTMLElement) => {
    return container.querySelector('input[type="file"]') as HTMLInputElement
  }

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    global.alert = jest.fn()
  })

  describe('Initial Rendering', () => {
    it('renders visual search component', () => {
      const { container } = render(<VisualSearch />)

      expect(screen.getByText('Visual Search')).toBeInTheDocument()
      expect(screen.getByText('Upload an image to find similar products')).toBeInTheDocument()
    })

    it('renders upload area when no image is selected', () => {
      const { container } = render(<VisualSearch />)

      expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument()
      expect(screen.getByText('PNG, JPG, GIF up to 5MB')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<VisualSearch className="custom-class" />)

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('Image Upload', () => {
    it('allows selecting an image file', async () => {
      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByAltText('Search image')).toBeInTheDocument()
      })
    })

    it('validates file type and rejects non-image files', () => {
      const { container } = render(<VisualSearch />)

      const file = new File(['document'], 'test.pdf', { type: 'application/pdf' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      expect(global.alert).toHaveBeenCalledWith('Please select an image file')
    })

    it('validates file size and rejects files over 5MB', () => {
      const { container } = render(<VisualSearch />)

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' })
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })

      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [largeFile] } })

      expect(global.alert).toHaveBeenCalledWith('Image size must be less than 5MB')
    })

    it('shows image preview after upload', async () => {
      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        const image = screen.getByAltText('Search image')
        expect(image).toHaveAttribute('src', 'data:image/png;base64,mockImageData')
      })
    })

    it('shows search button after image upload', async () => {
      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })
    })
  })

  describe('Image Clearing', () => {
    it('allows clearing selected image', async () => {
      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByAltText('Search image')).toBeInTheDocument()
      })

      // Click clear button
      const clearButtons = screen.getAllByRole('button')
      const clearButton = clearButtons.find((btn) => btn.querySelector('.text-b2b-gray-600'))
      fireEvent.click(clearButton!)

      await waitFor(() => {
        expect(screen.queryByAltText('Search image')).not.toBeInTheDocument()
        expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument()
      })
    })

    it('clears results when clearing image', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { id: '1', name: 'Product 1', price: 10.0, image_url: 'image1.jpg' },
          ],
        }),
      })

      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })

      // Search
      const searchButton = screen.getByText('Find Similar Products')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Similar Products')).toBeInTheDocument()
      })

      // Clear image
      const clearButtons = screen.getAllByRole('button')
      const clearButton = clearButtons.find((btn) => btn.querySelector('.text-b2b-gray-600'))
      fireEvent.click(clearButton!)

      await waitFor(() => {
        expect(screen.queryByText('Similar Products')).not.toBeInTheDocument()
      })
    })
  })

  describe('Visual Search', () => {
    it('performs visual search when button is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { id: '1', name: 'Product 1', price: 10.0, image_url: 'image1.jpg', similarity_score: 0.95 },
          ],
        }),
      })

      const { container } = render(<VisualSearch onSearch={mockOnSearch} />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })

      const searchButton = screen.getByText('Find Similar Products')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/search/visual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: 'data:image/png;base64,mockImageData',
          }),
        })
      })
    })

    it('shows loading state during search', async () => {
      let resolveSearch: any
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve
      })

      ;(global.fetch as jest.Mock).mockReturnValue(searchPromise)

      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })

      const searchButton = screen.getByText('Find Similar Products')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument()
      })

      // Resolve search
      resolveSearch({
        ok: true,
        json: async () => ({ results: [] }),
      })
    })

    it('displays search results', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { id: '1', name: 'Product 1', price: 10.0, image_url: 'image1.jpg', similarity_score: 0.95 },
            { id: '2', name: 'Product 2', price: 20.0, image_url: 'image2.jpg', similarity_score: 0.85 },
          ],
        }),
      })

      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })

      const searchButton = screen.getByText('Find Similar Products')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Similar Products')).toBeInTheDocument()
        expect(screen.getByText('Product 1')).toBeInTheDocument()
        expect(screen.getByText('Product 2')).toBeInTheDocument()
        expect(screen.getByText('$10.00')).toBeInTheDocument()
        expect(screen.getByText('$20.00')).toBeInTheDocument()
        expect(screen.getByText('95% match')).toBeInTheDocument()
        expect(screen.getByText('85% match')).toBeInTheDocument()
      })
    })

    it('calls onSearch callback with results', async () => {
      const mockResults = [
        { id: '1', name: 'Product 1', price: 10.0, image_url: 'image1.jpg' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: mockResults }),
      })

      const { container } = render(<VisualSearch onSearch={mockOnSearch} />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })

      const searchButton = screen.getByText('Find Similar Products')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('data:image/png;base64,mockImageData', mockResults)
      })
    })

    it('handles search errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })

      const searchButton = screen.getByText('Find Similar Products')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to search. Please try again.')
      })
    })

    it('handles API error responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })

      const searchButton = screen.getByText('Find Similar Products')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to search. Please try again.')
      })
    })

    it('renders product links correctly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { id: 'prod-123', name: 'Product 1', price: 10.0, image_url: 'image1.jpg' },
          ],
        }),
      })

      const { container } = render(<VisualSearch />)

      const file = new File(['image'], 'test.png', { type: 'image/png' })
      const input = getFileInput(container)

      fireEvent.change(input, { target: { files: [file] } })

      // Trigger FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'data:image/png;base64,mockImageData' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Find Similar Products')).toBeInTheDocument()
      })

      const searchButton = screen.getByText('Find Similar Products')
      fireEvent.click(searchButton)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Product 1/ })
        expect(link).toHaveAttribute('href', '/products/prod-123')
      })
    })
  })
})


