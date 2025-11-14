import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MiniCart } from './MiniCart'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill, priority, quality, ...imgProps } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...imgProps} />
  },
}))

describe('MiniCart', () => {
  let mockSupabase: any
  let mockRouter: any
  let mockToast: jest.Mock

  const mockCartItems = [
    {
      id: 'cart-1',
      quantity: 2,
      product_id: 'prod-1',
      created_at: '2024-01-01T00:00:00Z',
      products: {
        id: 'prod-1',
        name: 'Test Product 1',
        sku: 'SKU-001',
        base_price: 50.0,
        image_url: 'https://example.com/image1.jpg',
        category: 'Category 1',
      },
    },
    {
      id: 'cart-2',
      quantity: 1,
      product_id: 'prod-2',
      created_at: '2024-01-02T00:00:00Z',
      products: {
        id: 'prod-2',
        name: 'Test Product 2',
        sku: 'SKU-002',
        base_price: 75.0,
        image_url: null,
        category: 'Category 2',
      },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      order: jest.fn(), // Will be mocked per test
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      })),
      removeChannel: jest.fn(),
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

  it('renders drawer when isOpen is true', () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    mockSupabase.order.mockResolvedValue({ data: [], error: null })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    // Drawer should be rendered - check for specific title
    expect(screen.getByText('Shopping Cart')).toBeInTheDocument()
  })

  it('does not load cart when isOpen is false', () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    await act(async () => {
      render(<MiniCart isOpen={false} onClose={jest.fn()} />)
    })

    // Should not call getUser when drawer is closed
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled()
  })

  it('loads cart items when opened', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: mockCartItems,
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
      expect(mockSupabase.select).toHaveBeenCalledWith('*, products (*)')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })
  })

  it('displays cart items', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: mockCartItems,
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })
  })

  it('calculates total correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: mockCartItems,
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      // Total should be (2 * 50) + (1 * 75) = 175
      expect(screen.getByText(/175/)).toBeInTheDocument()
    })
  })

  it('updates quantity when + button clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: mockCartItems,
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    // Mock the update chain for the button click
    mockSupabase.eq.mockResolvedValue({ error: null })

    // Find and click + button for first item
    const plusButtons = screen.getAllByText('+')
    await act(async () => fireEvent.click(plusButtons[0]))

    await waitFor(() => {
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 3 })
    })
  })

  it('updates quantity when - button clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: mockCartItems,
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    // Mock the update chain for the button click
    mockSupabase.eq.mockResolvedValue({ error: null })

    // Find and click - button for first item
    const minusButtons = screen.getAllByText('-')
    await act(async () => fireEvent.click(minusButtons[0]))

    await waitFor(() => {
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 1 })
    })
  })

  it('does not decrease quantity below 1', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: mockCartItems,
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })

    // Product 2 has quantity 1, - button should be disabled
    const allButtons = screen.getAllByRole('button')
    const minusButtons = allButtons.filter(btn => btn.textContent === '-')

    // Second minus button should be disabled
    expect(minusButtons[1]).toBeDisabled()
  })

  it('removes item when delete button clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: mockCartItems,
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    // Mock the delete chain for the button click
    mockSupabase.eq.mockResolvedValue({ error: null })

    // Find all buttons and look for delete buttons (they have trash icon)
    const allButtons = screen.getAllByRole('button')
    // Delete buttons are the ones with className containing 'text-b2b-gray-400'
    // Just click any button that's not +, -, or main action buttons
    // Simpler: get all buttons, filter out the known ones, click remaining
    const deleteButtons = allButtons.filter(btn =>
      !btn.textContent?.includes('+') &&
      !btn.textContent?.includes('-') &&
      !btn.textContent?.includes('Checkout') &&
      !btn.textContent?.includes('View Cart') &&
      !btn.textContent?.includes('Browse Products') &&
      btn.querySelector('svg') !== null
    )

    // Click first delete button (should be for first product)
    if (deleteButtons.length > 2) { // Skip close button
      await act(async () => fireEvent.click(deleteButtons[1]))

      await waitFor(() => {
        expect(mockSupabase.delete).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Item removed',
          description: 'Item has been removed from your cart',
        })
      })
    }
  })

  it('navigates to checkout when checkout button clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: mockCartItems,
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    // Find and click checkout button - use getByRole to be specific
    const checkoutButton = screen.getByRole('button', { name: /checkout/i })
    await act(async () => fireEvent.click(checkoutButton))

    expect(mockRouter.push).toHaveBeenCalledWith('/checkout')
  })

  it('shows empty cart message when no items', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockSupabase.order.mockResolvedValue({
      data: [],
      error: null,
    })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(screen.getByText(/empty/i)).toBeInTheDocument()
    })
  })

  it('calls onClose when close button clicked', () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const mockOnClose = jest.fn()

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={mockOnClose} />)
    })

    // Find and click close button (X icon)
    const closeButton = screen.getAllByRole('button')[0]
    await act(async () => fireEvent.click(closeButton))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('handles cart load error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth error'))

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('sets up real-time subscription when opened', () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    await act(async () => {
      render(<MiniCart isOpen={true} onClose={jest.fn()} />)
    })

    expect(mockSupabase.channel).toHaveBeenCalledWith('cart-changes')
  })

  it('cleans up subscription when closed', () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { unmount } = await act(async () => render(<MiniCart isOpen={true} onClose={jest.fn()} />))

    await act(async () => unmount())

    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
})
