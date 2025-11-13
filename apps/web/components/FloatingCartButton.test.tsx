import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FloatingCartButton } from './FloatingCartButton'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  channel: jest.fn(),
  removeChannel: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

// Mock MiniCart component
jest.mock('./MiniCart', () => ({
  MiniCart: ({ isOpen, onClose }: any) => (
    <div data-testid="mini-cart" data-open={isOpen}>
      <button onClick={onClose}>Close Cart</button>
    </div>
  ),
}))

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiShoppingCart: () => <div data-testid="cart-icon" />,
}))

describe('FloatingCartButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Mock channel subscription
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    }
    mockSupabase.channel.mockReturnValue(mockChannel)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Initial Rendering', () => {
    it('does not render when cart is empty', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 0,
          }),
        }),
      })

      const { container } = render(<FloatingCartButton />)

      await waitFor(() => {
        expect(container.querySelector('button')).not.toBeInTheDocument()
      })
    })

    it('renders when cart has items', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 3,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByText('Cart (3)')).toBeInTheDocument()
      })
    })

    it('displays cart icon', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByTestId('cart-icon')).toBeInTheDocument()
      })
    })

    it('becomes visible after delay', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
          }),
        }),
      })

      const { container } = render(<FloatingCartButton />)

      await waitFor(() => {
        const button = container.querySelector('button')
        expect(button).toBeInTheDocument()
      })

      // Initially hidden (opacity-0)
      const button = container.querySelector('button')
      expect(button).toHaveClass('translate-y-20', 'opacity-0')

      // Advance timer to trigger visibility
      jest.advanceTimersByTime(500)

      await waitFor(() => {
        expect(button).toHaveClass('translate-y-0', 'opacity-100')
      })
    })
  })

  describe('Cart Count Display', () => {
    it('displays correct cart count', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 5,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByText('Cart (5)')).toBeInTheDocument()
      })
    })

    it('displays badge with count', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 7,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument()
      })
    })

    it('displays "99+" for counts over 99', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 150,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument()
      })
    })

    it('displays count of 99 normally', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 99,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByText('99')).toBeInTheDocument()
        expect(screen.queryByText('99+')).not.toBeInTheDocument()
      })
    })
  })

  describe('MiniCart Interaction', () => {
    it('opens MiniCart when button is clicked', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 2,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByText('Cart (2)')).toBeInTheDocument()
      })

      const button = screen.getByText('Cart (2)')
      fireEvent.click(button)

      await waitFor(() => {
        const miniCart = screen.getByTestId('mini-cart')
        expect(miniCart).toHaveAttribute('data-open', 'true')
      })
    })

    it('closes MiniCart when close is triggered', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByText('Cart (1)')).toBeInTheDocument()
      })

      // Open cart
      const button = screen.getByText('Cart (1)')
      fireEvent.click(button)

      await waitFor(() => {
        const miniCart = screen.getByTestId('mini-cart')
        expect(miniCart).toHaveAttribute('data-open', 'true')
      })

      // Close cart
      const closeButton = screen.getByText('Close Cart')
      fireEvent.click(closeButton)

      await waitFor(() => {
        const miniCart = screen.getByTestId('mini-cart')
        expect(miniCart).toHaveAttribute('data-open', 'false')
      })
    })
  })

  describe('Real-time Updates', () => {
    it('sets up real-time subscription on mount', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
          }),
        }),
      })

      render(<FloatingCartButton />)

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('cart-count')
      })
    })

    it('cleans up subscription on unmount', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
          }),
        }),
      })

      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      }
      mockSupabase.channel.mockReturnValue(mockChannel)

      const { unmount } = render(<FloatingCartButton />)

      await waitFor(() => {
        expect(screen.getByText('Cart (1)')).toBeInTheDocument()
      })

      unmount()

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })
  })

  describe('Authentication Handling', () => {
    it('sets count to 0 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const { container } = render(<FloatingCartButton />)

      await waitFor(() => {
        expect(container.querySelector('button')).not.toBeInTheDocument()
      })
    })

    it('handles authentication errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { container } = render(<FloatingCartButton />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error loading cart count:',
          expect.any(Error)
        )
      })

      expect(container.querySelector('button')).not.toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })
})

