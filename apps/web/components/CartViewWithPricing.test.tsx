import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CartViewWithPricing from './CartViewWithPricing'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('@/lib/supabase/client')
jest.mock('next/navigation')
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
jest.mock('./PromoCodeInput', () => ({
  __esModule: true,
  default: ({ onApply }: any) => (
    <div>
      <input data-testid="promo-input" placeholder="Enter promo code" />
      <button onClick={() => onApply('SAVE10')}>Apply</button>
    </div>
  ),
}))

// Mock fetch
global.fetch = jest.fn()

describe('CartViewWithPricing', () => {
  let mockSupabase: any
  let mockRouter: any

  const mockCartItems = [
    {
      id: 'cart-1',
      user_id: 'user-123',
      product_id: 'prod-1',
      quantity: 2,
      organization_id: 'org-123',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      products: {
        id: 'prod-1',
        name: 'Test Product 1',
        sku: 'TEST-001',
        base_price: 50,
        image_url: 'https://example.com/image1.jpg',
        category: 'Electronics',
        organization_id: 'supplier-org-1',
        unit_of_measure: 'unit',
      },
    },
    {
      id: 'cart-2',
      user_id: 'user-123',
      product_id: 'prod-2',
      quantity: 1,
      organization_id: 'org-123',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      products: {
        id: 'prod-2',
        name: 'Test Product 2',
        sku: 'TEST-002',
        base_price: 75,
        image_url: null,
        category: 'Tools',
        organization_id: 'supplier-org-2',
        unit_of_measure: 'unit',
      },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(),
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    mockRouter = {
      push: jest.fn(),
      refresh: jest.fn(),
    }
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)

    // Mock successful pricing API responses
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        pricing: {
          unit_price: 50,
          line_total: 100,
          discount_amount: 0,
          pricing_source: 'base',
        },
      }),
    })
  })

  it('renders cart items correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })

    render(<CartViewWithPricing initialCartItems={mockCartItems} organizationId="org-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })
  })

  it('fetches pricing for all cart items', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })

    render(<CartViewWithPricing initialCartItems={mockCartItems} organizationId="org-123" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/pricing/calculate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(global.fetch).toHaveBeenCalledTimes(2) // Once for each item
    })
  })

  it('updates quantity when + button clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })
    mockSupabase.eq.mockResolvedValue({ error: null })

    render(<CartViewWithPricing initialCartItems={mockCartItems} organizationId="org-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    const plusButtons = screen.getAllByText('+')
    fireEvent.click(plusButtons[0])

    await waitFor(() => {
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 3 })
    })
  })

  it('updates quantity when - button clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })
    mockSupabase.eq.mockResolvedValue({ error: null })

    render(<CartViewWithPricing initialCartItems={mockCartItems} organizationId="org-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    const minusButtons = screen.getAllByText('−')
    fireEvent.click(minusButtons[0])

    await waitFor(() => {
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 1 })
    })
  })

  it('does not decrease quantity below 1', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })

    const singleItemCart = [{ ...mockCartItems[0], quantity: 1 }]
    render(<CartViewWithPricing initialCartItems={singleItemCart} organizationId="org-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    const minusButtons = screen.getAllByText('−')
    const minusButton = minusButtons[0] as HTMLButtonElement

    // Button should be disabled
    expect(minusButton).toBeDisabled()
  })

  it('removes item when delete button clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })
    mockSupabase.eq.mockResolvedValue({ error: null })

    render(<CartViewWithPricing initialCartItems={mockCartItems} organizationId="org-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    // Find "Remove" button
    const removeButtons = screen.getAllByText('Remove')
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(mockSupabase.delete).toHaveBeenCalled()
    })
  })

  it('applies promo code and refetches pricing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })

    render(<CartViewWithPricing initialCartItems={mockCartItems} organizationId="org-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    // Clear previous fetch calls
    ;(global.fetch as jest.Mock).mockClear()

    // Apply promo code
    const applyButton = screen.getByText('Apply')
    fireEvent.click(applyButton)

    await waitFor(() => {
      // Should refetch pricing with promo code
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/pricing/calculate',
        expect.objectContaining({
          body: expect.stringContaining('SAVE10'),
        })
      )
    })
  })

  it('navigates to checkout when checkout button clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })

    render(<CartViewWithPricing initialCartItems={mockCartItems} organizationId="org-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })

    const checkoutButton = screen.getByText('Proceed to Checkout')

    // Wait for button to be enabled (pricing loaded)
    await waitFor(() => {
      expect(checkoutButton).not.toBeDisabled()
    })

    fireEvent.click(checkoutButton)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/checkout')
    })
  })

  it('shows empty cart message when no items', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    render(<CartViewWithPricing initialCartItems={[]} organizationId="org-123" />)

    await waitFor(() => {
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument()
    })
  })

  it('calculates total correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.single.mockResolvedValue({
      data: { current_organization_id: 'org-123' },
    })

    // Mock pricing responses
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pricing: {
            unit_price: 50,
            line_total: 100,
            discount_amount: 0,
            pricing_source: 'base',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pricing: {
            unit_price: 75,
            line_total: 75,
            discount_amount: 0,
            pricing_source: 'base',
          },
        }),
      })

    render(<CartViewWithPricing initialCartItems={mockCartItems} organizationId="org-123" />)

    await waitFor(() => {
      // Total should be 100 + 75 = 175
      // Look for the total in the Order Summary section
      const totals = screen.getAllByText('$175.00')
      expect(totals.length).toBeGreaterThan(0)
    })
  })
})

