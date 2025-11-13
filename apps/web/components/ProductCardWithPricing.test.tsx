import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProductCardWithPricing from './ProductCardWithPricing'
import { createClient } from '@/lib/supabase/client'
import { usePricing } from '@/hooks/usePricing'

// Mock dependencies
jest.mock('@/lib/supabase/client')
jest.mock('@/hooks/usePricing')
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill, priority, quality, sizes, ...imgProps } = props
    return <img {...imgProps} />
  },
}))
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('ProductCardWithPricing', () => {
  let mockSupabase: any

  const mockProduct = {
    id: 'prod-1',
    name: 'Test Product',
    description: 'Test product description',
    category: 'Electronics',
    base_price: 100,
    unit_of_measure: 'unit',
    image_url: 'https://example.com/image.jpg',
    sku: 'TEST-001',
  }

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(),
      update: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(usePricing as jest.Mock).mockReturnValue({
      pricing: null,
      loading: false,
      error: null,
    })
  })

  it('renders product information correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('Test product description')).toBeInTheDocument()
      expect(screen.getByText('Electronics')).toBeInTheDocument()
    })
  })

  it('shows sign-in prompt for unauthenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('Sign in to see pricing')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  it('shows base price for authenticated users without pricing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('$100.00')).toBeInTheDocument()
      expect(screen.getByText('/ unit')).toBeInTheDocument()
    })
  })

  it('shows dynamic pricing when available', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    ;(usePricing as jest.Mock).mockReturnValue({
      pricing: {
        unit_price: 85,
        discount_amount: 15,
        discount_percentage: 15,
        pricing_source: 'volume',
      },
      loading: false,
      error: null,
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('$85.00')).toBeInTheDocument()
      expect(screen.getByText('Save 15%')).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching pricing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    ;(usePricing as jest.Mock).mockReturnValue({
      pricing: null,
      loading: true,
      error: null,
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('Loading price...')).toBeInTheDocument()
    })
  })

  it('shows error state when pricing fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    ;(usePricing as jest.Mock).mockReturnValue({
      pricing: null,
      loading: false,
      error: new Error('Pricing failed'),
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('Price unavailable')).toBeInTheDocument()
    })
  })

  it('updates quantity when input changes', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('$100.00')).toBeInTheDocument()
    })

    const quantityInput = screen.getByRole('spinbutton')
    fireEvent.change(quantityInput, { target: { value: '5' } })

    expect(quantityInput).toHaveValue(5)
  })

  it('adds item to cart successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('$100.00')).toBeInTheDocument()
    })

    // Set up mock chain for the add to cart operation
    // First call: get profile
    // Second call: check existing cart item
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { current_organization_id: 'org-123' },
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    }).mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })

    const addButton = screen.getByText('Add to Cart')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Added to cart!')).toBeInTheDocument()
    })
  })

  it('updates existing cart item quantity', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('$100.00')).toBeInTheDocument()
    })

    // Set up mock chain for the add to cart operation
    // First call: get profile
    // Second call: check existing cart item (found)
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { current_organization_id: 'org-123' },
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'cart-item-1', quantity: 2 },
              error: null,
            }),
          }),
        }),
      }),
    }).mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })

    const addButton = screen.getByText('Add to Cart')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Added to cart!')).toBeInTheDocument()
    })
  })

  it('shows sign in to order button for unauthenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('Sign in to see pricing')).toBeInTheDocument()
      expect(screen.getByText('Sign in to order')).toBeInTheDocument()
    })
  })

  it('shows error when organization not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      expect(screen.getByText('$100.00')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add to Cart')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('No organization found')).toBeInTheDocument()
    })
  })

  it('renders product image when available', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    render(<ProductCardWithPricing product={mockProduct} />)

    await waitFor(() => {
      const image = screen.getByAltText('Test Product')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
    })
  })

  it('shows placeholder when no image available', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    const productWithoutImage = { ...mockProduct, image_url: null }
    render(<ProductCardWithPricing product={productWithoutImage} />)

    await waitFor(() => {
      expect(screen.getByText('No image')).toBeInTheDocument()
    })
  })
})

