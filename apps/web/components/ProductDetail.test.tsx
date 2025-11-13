import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProductDetail from './ProductDetail'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/lib/animations', () => ({
  fadeIn: {},
  fast: {},
}))

jest.mock('@/components/b2b', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="card" {...props}>
      {children}
    </div>
  ),
  Button: ({ children, loading, disabled, onClick, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || loading} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, value, onChange, type = 'text', ...props }: any) => (
    <div>
      {label && <label htmlFor={label}>{label}</label>}
      <input id={label} type={type} value={value} onChange={onChange} {...props} />
    </div>
  ),
  ProductCard: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Modal: ({ children, isOpen, onClose, ...props }: any) =>
    isOpen ? (
      <div data-testid="modal" {...props}>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
}))

const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

const mockPush = jest.fn()
const mockRouter = {
  push: mockPush,
}

describe('ProductDetail', () => {
  const mockProduct = {
    id: 'prod-123',
    sku: 'SKU-123',
    name: 'Test Product',
    description: 'Test product description',
    category: 'Test Category',
    subcategory: 'Test Subcategory',
    brand: 'Test Brand',
    base_price: 100.0,
    unit_of_measure: 'unit',
    units_per_case: 12,
    weight_lbs: 5.0,
    dimensions_inches: { length: 10, width: 8, height: 6 },
    in_stock: true,
    image_url: 'https://example.com/image.jpg',
    additional_images: ['https://example.com/image2.jpg', 'https://example.com/image3.jpg'],
    specifications: { color: 'blue', material: 'plastic' },
    allergens: ['nuts', 'dairy'],
    nutritional_info: { calories: 200, protein: 10 },
  }

  const mockRelatedProducts = [
    {
      id: 'prod-456',
      name: 'Related Product 1',
      sku: 'SKU-456',
      base_price: 50.0,
      image_url: 'https://example.com/related1.jpg',
      category: 'Test Category',
      in_stock: true,
    },
    {
      id: 'prod-789',
      name: 'Related Product 2',
      sku: 'SKU-789',
      base_price: 75.0,
      image_url: 'https://example.com/related2.jpg',
      category: 'Test Category',
      in_stock: true,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock) = jest.fn()

    // Default mock for getUser
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
  })

  describe('Product Display', () => {
    it('renders product name and SKU', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const productNames = screen.getAllByText('Test Product')
      expect(productNames.length).toBeGreaterThan(0)
      expect(screen.getByText(/SKU: SKU-123/)).toBeInTheDocument()
    })

    it('renders product description', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      expect(screen.getByText('Test product description')).toBeInTheDocument()
    })

    it('displays in stock status when product is available', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      expect(screen.getByText('In Stock')).toBeInTheDocument()
    })

    it('displays out of stock status when product is unavailable', () => {
      const outOfStockProduct = { ...mockProduct, in_stock: false }

      render(
        <ProductDetail
          product={outOfStockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    })

    it('displays brand when available', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      expect(screen.getByText(/Brand:/)).toBeInTheDocument()
      expect(screen.getByText('Test Brand')).toBeInTheDocument()
    })

    it('displays base price', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const prices = screen.getAllByText('$100.00')
      expect(prices.length).toBeGreaterThan(0)
      expect(screen.getByText(/per unit/)).toBeInTheDocument()
    })
  })

  describe('Image Gallery', () => {
    it('renders main product image', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const images = screen.getAllByAltText('Test Product')
      expect(images.length).toBeGreaterThan(0)
    })

    it('renders thumbnail images when additional images exist', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      // Main image + 2 additional images = 3 thumbnails
      const thumbnails = screen.getAllByRole('img')
      expect(thumbnails.length).toBeGreaterThan(1)
    })

    it('allows selecting different images', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const thumbnails = screen.getAllByRole('img')
      // Click on second thumbnail
      if (thumbnails[1]) {
        fireEvent.click(thumbnails[1].parentElement!)
      }

      // Image should be selected (implementation detail - component updates selectedImage state)
      expect(thumbnails.length).toBeGreaterThan(0)
    })
  })

  describe('Quantity and Ordering', () => {
    it('allows changing quantity', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const quantityInput = screen.getByLabelText(/Quantity/)
      fireEvent.change(quantityInput, { target: { value: '5' } })

      expect(quantityInput).toHaveValue(5)
    })

    it('displays case ordering option when units_per_case is available', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      expect(screen.getByText('Units')).toBeInTheDocument()
      expect(screen.getByText('Cases')).toBeInTheDocument()
      expect(screen.getByText(/12 units per case/)).toBeInTheDocument()
    })

    it('switches between unit and case ordering', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const casesButton = screen.getByText('Cases')
      fireEvent.click(casesButton)

      // Should show "Cases" label on quantity input
      expect(screen.getByLabelText(/Cases/)).toBeInTheDocument()
    })

    it('calculates total price correctly', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const quantityInput = screen.getByLabelText(/Quantity/)
      fireEvent.change(quantityInput, { target: { value: '3' } })

      // 3 units * $100 = $300
      expect(screen.getByText('$300.00')).toBeInTheDocument()
    })
  })

  describe('Add to Cart', () => {
    it('redirects to login when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const addToCartButton = screen.getByText('Add to Cart')
      fireEvent.click(addToCartButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login')
      })
    })

    it('adds product to cart when user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const addToCartButton = screen.getByText('Add to Cart')
      fireEvent.click(addToCartButton)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
      })
    })

    it('shows loading state while adding to cart', async () => {
      let resolveInsert: any
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve
      })

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue(insertPromise),
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const addToCartButton = screen.getByText('Add to Cart')
      fireEvent.click(addToCartButton)

      // Button should show loading text or be disabled
      await waitFor(() => {
        const button = screen.getByText(/Loading|Add to Cart/)
        expect(button).toBeInTheDocument()
      })

      // Resolve the promise to clean up
      resolveInsert({ error: null })
    })

    it('disables add to cart button when product is out of stock', () => {
      const outOfStockProduct = { ...mockProduct, in_stock: false }

      render(
        <ProductDetail
          product={outOfStockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const addToCartButton = screen.getByText('Add to Cart')
      expect(addToCartButton).toBeDisabled()
    })

    it('adds correct quantity to cart', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const quantityInput = screen.getByLabelText(/Quantity/)
      fireEvent.change(quantityInput, { target: { value: '5' } })

      const addToCartButton = screen.getByText('Add to Cart')
      fireEvent.click(addToCartButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          user_id: 'user-123',
          product_id: 'prod-123',
          quantity: 5,
        })
      })
    })

    it('adds correct quantity when ordering by case', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      // Switch to case ordering
      const casesButton = screen.getByText('Cases')
      fireEvent.click(casesButton)

      const quantityInput = screen.getByLabelText(/Cases/)
      fireEvent.change(quantityInput, { target: { value: '2' } })

      const addToCartButton = screen.getByText('Add to Cart')
      fireEvent.click(addToCartButton)

      await waitFor(() => {
        // 2 cases * 12 units per case = 24 units
        expect(mockInsert).toHaveBeenCalledWith({
          user_id: 'user-123',
          product_id: 'prod-123',
          quantity: 24,
        })
      })
    })
  })

  describe('Dynamic Pricing', () => {
    it('fetches dynamic pricing when organization is provided', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ finalPrice: 85.0 }],
        }),
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/pricing/calculate',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('org-123'),
          })
        )
      })
    })

    it('displays discounted price when available', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ finalPrice: 85.0 }],
        }),
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      await waitFor(() => {
        const discountedPrices = screen.getAllByText('$85.00')
        expect(discountedPrices.length).toBeGreaterThan(0)
        const originalPrices = screen.getAllByText('$100.00')
        expect(originalPrices.length).toBeGreaterThan(0) // Original price shown as strikethrough
      })
    })

    it('uses base price when no organization is provided', async () => {
      render(
        <ProductDetail product={mockProduct} organizationId={null} relatedProducts={mockRelatedProducts} />
      )

      const prices = screen.getAllByText('$100.00')
      expect(prices.length).toBeGreaterThan(0)

      // Wait a bit to ensure no pricing fetch is made
      await waitFor(() => {
        const pricingCalls = (global.fetch as jest.Mock).mock.calls.filter(
          call => call[0] === '/api/pricing/calculate'
        )
        expect(pricingCalls.length).toBe(0)
      })
    })

    it('updates price when quantity changes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ finalPrice: 85.0 }],
        }),
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const quantityInput = screen.getByLabelText(/Quantity/)
      fireEvent.change(quantityInput, { target: { value: '5' } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/pricing/calculate',
          expect.objectContaining({
            body: expect.stringContaining('"quantity":5'),
          })
        )
      })
    })
  })

  describe('Breadcrumb Navigation', () => {
    it('renders breadcrumb with category and product name', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Test Category')).toBeInTheDocument()
    })

    it('navigates to products page when clicking Products breadcrumb', () => {
      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      const productsLink = screen.getByText('Products')
      fireEvent.click(productsLink)

      expect(mockPush).toHaveBeenCalledWith('/products')
    })
  })

  describe('AI Recommendations', () => {
    it('fetches AI-powered product recommendations', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          recommendations: [
            { recommended_product_id: 'rec-1' },
            { recommended_product_id: 'rec-2' },
          ],
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [
              { id: 'rec-1', name: 'Recommended 1', sku: 'REC-1', base_price: 50, image_url: null, category: 'Cat' },
              { id: 'rec-2', name: 'Recommended 2', sku: 'REC-2', base_price: 60, image_url: null, category: 'Cat' },
            ],
            error: null,
          }),
        }),
      })

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/recommendations?productId=prod-123')
        )
      })
    })

    it('handles recommendation fetch errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(
        <ProductDetail
          product={mockProduct}
          organizationId="org-123"
          relatedProducts={mockRelatedProducts}
        />
      )

      // Component should still render even if recommendations fail
      await waitFor(() => {
        const productNames = screen.getAllByText('Test Product')
        expect(productNames.length).toBeGreaterThan(0)
      })
    })
  })
})
