import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CartView from './CartView'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>
})

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

const mockCartItems = [
  {
    id: 'cart-1',
    organization_id: 'org-123',
    user_id: 'user-123',
    product_id: 'prod-1',
    quantity: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    products: {
      id: 'prod-1',
      organization_id: 'org-123',
      sku: 'SKU-001',
      name: 'Test Product 1',
      description: 'Description 1',
      category: 'Category 1',
      subcategory: null,
      brand: 'Brand 1',
      base_price: 50.0,
      unit_of_measure: 'case',
      units_per_case: 100,
      weight_lbs: 10,
      dimensions_inches: null,
      in_stock: true,
      image_url: 'https://example.com/image1.jpg',
      additional_images: null,
      specifications: null,
      allergens: null,
      nutritional_info: null,
      search_vector: null,
      embedding: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'cart-2',
    organization_id: 'org-123',
    user_id: 'user-123',
    product_id: 'prod-2',
    quantity: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    products: {
      id: 'prod-2',
      organization_id: 'org-123',
      sku: 'SKU-002',
      name: 'Test Product 2',
      description: 'Description 2',
      category: 'Category 2',
      subcategory: null,
      brand: 'Brand 2',
      base_price: 75.0,
      unit_of_measure: 'case',
      units_per_case: 50,
      weight_lbs: 15,
      dimensions_inches: null,
      in_stock: true,
      image_url: null,
      additional_images: null,
      specifications: null,
      allergens: null,
      nutritional_info: null,
      search_vector: null,
      embedding: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
]

describe('CartView', () => {
  let mockSupabase: any
  let mockRouter: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    mockRouter = {
      push: jest.fn(),
    }
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty cart message when no items', () => {
    render(<CartView initialCartItems={[]} />)

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByText('Add some products to get started')).toBeInTheDocument()
    expect(screen.getByText('Browse Products')).toBeInTheDocument()
  })

  it('renders cart items correctly', () => {
    render(<CartView initialCartItems={mockCartItems} />)

    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    expect(screen.getByText(/SKU: SKU-001/)).toBeInTheDocument()
    expect(screen.getByText(/SKU: SKU-002/)).toBeInTheDocument()
  })

  it('calculates total correctly', () => {
    render(<CartView initialCartItems={mockCartItems} />)

    // Product 1: $50 x 2 = $100
    // Product 2: $75 x 1 = $75
    // Total: $175
    expect(screen.getByText('$175.00')).toBeInTheDocument()
  })

  it('displays individual line totals correctly', () => {
    render(<CartView initialCartItems={mockCartItems} />)

    expect(screen.getByText('$100.00')).toBeInTheDocument() // Product 1: $50 x 2
    expect(screen.getByText('$75.00')).toBeInTheDocument() // Product 2: $75 x 1
  })

  it('increases quantity when + button clicked', async () => {
    mockSupabase.update.mockResolvedValue({ error: null })

    render(<CartView initialCartItems={mockCartItems} />)
    const increaseButtons = screen.getAllByText('+')

    fireEvent.click(increaseButtons[0])

    await waitFor(() => {
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 3 })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cart-1')
    })
  })

  it('decreases quantity when - button clicked', async () => {
    mockSupabase.update.mockResolvedValue({ error: null })

    render(<CartView initialCartItems={mockCartItems} />)
    const decreaseButtons = screen.getAllByText('−')

    fireEvent.click(decreaseButtons[0])

    await waitFor(() => {
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 1 })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cart-1')
    })
  })

  it('does not decrease quantity below 1', async () => {
    render(<CartView initialCartItems={mockCartItems} />)
    const decreaseButtons = screen.getAllByText('−')

    // Try to decrease Product 2 (quantity = 1)
    fireEvent.click(decreaseButtons[1])

    await waitFor(() => {
      expect(mockSupabase.update).not.toHaveBeenCalled()
    })
  })

  it('removes item when Remove button clicked', async () => {
    mockSupabase.delete.mockResolvedValue({ error: null })

    render(<CartView initialCartItems={mockCartItems} />)
    const removeButtons = screen.getAllByText('Remove')

    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cart-1')
    })

    // Item should be removed from UI
    await waitFor(() => {
      expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument()
    })
  })

  it('shows alert on update error', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    mockSupabase.update.mockResolvedValue({ error: { message: 'Update failed' } })

    render(<CartView initialCartItems={mockCartItems} />)
    const increaseButtons = screen.getAllByText('+')

    fireEvent.click(increaseButtons[0])

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to update quantity')
    })

    alertSpy.mockRestore()
  })

  it('shows alert on remove error', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    mockSupabase.delete.mockResolvedValue({ error: { message: 'Delete failed' } })

    render(<CartView initialCartItems={mockCartItems} />)
    const removeButtons = screen.getAllByText('Remove')

    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to remove item')
    })

    alertSpy.mockRestore()
  })

  it('navigates to checkout when Proceed to Checkout clicked', () => {
    render(<CartView initialCartItems={mockCartItems} />)
    const checkoutButton = screen.getByText('Proceed to Checkout')

    fireEvent.click(checkoutButton)

    expect(mockRouter.push).toHaveBeenCalledWith('/checkout')
  })

  it('disables buttons while loading', async () => {
    mockSupabase.update.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<CartView initialCartItems={mockCartItems} />)
    const increaseButtons = screen.getAllByText('+')

    fireEvent.click(increaseButtons[0])

    // Buttons should be disabled while loading
    await waitFor(() => {
      expect(increaseButtons[0]).toBeDisabled()
    })
  })
})

