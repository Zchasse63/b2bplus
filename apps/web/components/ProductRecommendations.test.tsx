import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProductRecommendations } from './ProductRecommendations'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/hooks/use-toast')
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: any) => <a href={href}>{children}</a>
  MockLink.displayName = 'MockLink'
  return MockLink
})
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}))
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}))

const mockRecommendations = [
  {
    product: {
      id: 'prod-1',
      sku: 'SKU-001',
      name: 'Test Product 1',
      price: 99.99,
      image_url: 'https://example.com/image1.jpg',
      category: 'Category 1',
    },
    score: 0.9,
    reason: 'Frequently bought together',
  },
  {
    product: {
      id: 'prod-2',
      sku: 'SKU-002',
      name: 'Test Product 2',
      price: 149.99,
      category: 'Category 2',
    },
    score: 0.75,
    reason: 'Similar to your recent purchases',
  },
]

describe('ProductRecommendations', () => {
  let mockToast: jest.Mock

  beforeEach(() => {
    mockToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<ProductRecommendations type="also_bought" />)

    expect(screen.getByText('Loading recommendations...')).toBeInTheDocument()
  })

  it('fetches and displays recommendations', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })
  })

  it('displays default title for also_bought type', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(screen.getByText('Customers Also Bought')).toBeInTheDocument()
    })
  })

  it('displays default title for similar type', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="similar" />)

    await waitFor(() => {
      expect(screen.getByText('Similar Products')).toBeInTheDocument()
    })
  })

  it('displays default title for personalized type', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="personalized" />)

    await waitFor(() => {
      expect(screen.getByText('Recommended For You')).toBeInTheDocument()
    })
  })

  it('displays custom title when provided', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="also_bought" title="Custom Title" />)

    await waitFor(() => {
      expect(screen.getByText('Custom Title')).toBeInTheDocument()
    })
  })

  it('displays product prices correctly', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(screen.getByText('$99.99')).toBeInTheDocument()
      expect(screen.getByText('$149.99')).toBeInTheDocument()
    })
  })

  it('displays Top Pick badge for high score products', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(screen.getByText('Top Pick')).toBeInTheDocument()
    })
  })

  it('displays product SKUs', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument()
      expect(screen.getByText('SKU-002')).toBeInTheDocument()
    })
  })

  it('displays recommendation reasons', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(screen.getByText('Frequently bought together')).toBeInTheDocument()
      expect(screen.getByText('Similar to your recent purchases')).toBeInTheDocument()
    })
  })

  it('adds product to cart successfully', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recommendations: mockRecommendations }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

    render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    const addToCartButtons = screen.getAllByRole('button')
    fireEvent.click(addToCartButtons[0])

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Added to cart',
        description: 'Product added to your cart successfully',
      })
    })
  })

  it('shows error toast when add to cart fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recommendations: mockRecommendations }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed' }),
      })

    render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    const addToCartButtons = screen.getAllByRole('button')
    fireEvent.click(addToCartButtons[0])

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to add product to cart',
        variant: 'destructive',
      })
    })
  })

  it('includes productId in API request when provided', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="similar" productId="prod-123" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('product_id=prod-123')
      )
    })
  })

  it('respects limit parameter', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    })

    render(<ProductRecommendations type="also_bought" limit={2} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=2')
      )
    })
  })

  it('renders nothing when no recommendations', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    })

    const { container } = render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('handles fetch error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { container } = render(<ProductRecommendations type="also_bought" />)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })

    consoleError.mockRestore()
  })
})

