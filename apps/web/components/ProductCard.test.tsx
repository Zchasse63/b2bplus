import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProductCard from './ProductCard'
import { createClient } from '@/lib/supabase/client'

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

const mockProduct = {
  id: '123',
  organization_id: 'org-123',
  sku: 'TEST-SKU',
  name: 'Test Product',
  description: 'Test description',
  category: 'Test Category',
  subcategory: 'Test Subcategory',
  brand: 'Test Brand',
  base_price: 99.99,
  unit_of_measure: 'case',
  units_per_case: 100,
  weight_lbs: 10,
  dimensions_inches: { length: 10, width: 10, height: 10 },
  in_stock: true,
  image_url: 'https://example.com/image.jpg',
  additional_images: null,
  specifications: null,
  allergens: null,
  nutritional_info: null,
  search_vector: null,
  embedding: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('ProductCard', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Test Category')).toBeInTheDocument()
    expect(screen.getByText('$99.99')).toBeInTheDocument()
    expect(screen.getByText('/ case')).toBeInTheDocument()
    expect(screen.getByText('100 units')).toBeInTheDocument()
    expect(screen.getByText(/SKU: TEST-SKU/)).toBeInTheDocument()
    expect(screen.getByText(/Test Brand/)).toBeInTheDocument()
  })

  it('displays product image when available', () => {
    render(<ProductCard product={mockProduct} />)
    const image = screen.getByAltText('Test Product')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('displays "No image" when image_url is null', () => {
    const productWithoutImage = { ...mockProduct, image_url: null }
    render(<ProductCard product={productWithoutImage} />)
    expect(screen.getByText('No image')).toBeInTheDocument()
  })

  it('allows quantity input change', () => {
    render(<ProductCard product={mockProduct} />)
    const quantityInput = screen.getByRole('spinbutton') as HTMLInputElement

    fireEvent.change(quantityInput, { target: { value: '5' } })
    expect(quantityInput.value).toBe('5')
  })

  it('prevents quantity less than 1', () => {
    render(<ProductCard product={mockProduct} />)
    const quantityInput = screen.getByRole('spinbutton') as HTMLInputElement

    fireEvent.change(quantityInput, { target: { value: '0' } })
    expect(quantityInput.value).toBe('1')
  })

  it('adds product to cart successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_organization_id: 'org-123' },
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: null, // No existing cart item
    })
    mockSupabase.insert.mockResolvedValue({ error: null })

    render(<ProductCard product={mockProduct} />)
    const addButton = screen.getByText('Add to Cart')

    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Added to cart!')).toBeInTheDocument()
    })

    expect(mockSupabase.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      organization_id: 'org-123',
      product_id: '123',
      quantity: 1,
    })
  })

  it('updates existing cart item quantity', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_organization_id: 'org-123' },
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'cart-item-123', quantity: 2 }, // Existing cart item
    })
    mockSupabase.update.mockResolvedValue({ error: null })

    render(<ProductCard product={mockProduct} />)
    const addButton = screen.getByText('Add to Cart')

    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 3 })
    })
  })

  it('shows error message when add to cart fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_organization_id: 'org-123' },
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
    })
    mockSupabase.insert.mockResolvedValue({ error: { message: 'Database error' } })

    render(<ProductCard product={mockProduct} />)
    const addButton = screen.getByText('Add to Cart')

    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to add to cart')).toBeInTheDocument()
    })
  })

  it('disables button while adding to cart', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })
    mockSupabase.insert.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<ProductCard product={mockProduct} />)
    const addButton = screen.getByText('Add to Cart')

    fireEvent.click(addButton)

    expect(screen.getByText('Adding...')).toBeInTheDocument()
    expect(addButton).toBeDisabled()
  })
})

