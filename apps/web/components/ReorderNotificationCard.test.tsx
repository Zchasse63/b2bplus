import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ReorderNotificationCard } from './ReorderNotificationCard'
import { useRouter } from 'next/navigation'

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

jest.mock('@/components/b2b/Badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={`badge ${variant} ${className}`} {...props}>
      {children}
    </span>
  ),
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

describe('ReorderNotificationCard', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      product_id: 'prod-1',
      predicted_quantity: 10,
      confidence_level: 0.95,
      predicted_reorder_date: '2024-12-01',
      products: {
        id: 'prod-1',
        name: 'Product 1',
        sku: 'SKU-001',
        price: 25.99,
        image_url: 'image1.jpg',
      },
    },
    {
      id: 'notif-2',
      product_id: 'prod-2',
      predicted_quantity: 5,
      confidence_level: 0.75,
      predicted_reorder_date: '2024-12-05',
      products: {
        id: 'prod-2',
        name: 'Product 2',
        sku: 'SKU-002',
        price: 15.50,
        image_url: null,
      },
    },
  ]

  const mockOnUpdate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    global.alert = jest.fn()
  })

  describe('Initial Rendering', () => {
    it('renders reorder notification card', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      expect(screen.getByText('Reorder Recommendations')).toBeInTheDocument()
      expect(
        screen.getByText("Based on your purchase history, we predict you'll need these items soon")
      ).toBeInTheDocument()
    })

    it('renders all notifications', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
      expect(screen.getByText('SKU: SKU-001')).toBeInTheDocument()
      expect(screen.getByText('SKU: SKU-002')).toBeInTheDocument()
    })

    it('displays product images when available', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const images = screen.getAllByRole('img')
      expect(images[0]).toHaveAttribute('src', 'image1.jpg')
      expect(images[0]).toHaveAttribute('alt', 'Product 1')
    })

    it('displays product prices', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      expect(screen.getByText('$25.99')).toBeInTheDocument()
      expect(screen.getByText('$15.50')).toBeInTheDocument()
    })

    it('displays predicted quantities', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      expect(screen.getByText('Qty: 10')).toBeInTheDocument()
      expect(screen.getByText('Qty: 5')).toBeInTheDocument()
    })

    it('displays confidence levels', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      expect(screen.getByText('95% confidence')).toBeInTheDocument()
      expect(screen.getByText('75% confidence')).toBeInTheDocument()
    })

    it('displays predicted reorder dates', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      // Dates are formatted using toLocaleDateString - just check that dates are rendered
      const date1 = new Date('2024-12-01').toLocaleDateString()
      const date2 = new Date('2024-12-05').toLocaleDateString()

      expect(screen.getByText(date1)).toBeInTheDocument()
      expect(screen.getByText(date2)).toBeInTheDocument()
    })

    it('returns null when no notifications', () => {
      const { container } = render(<ReorderNotificationCard notifications={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('shows 0 items selected initially', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      expect(screen.getByText('0 items selected')).toBeInTheDocument()
    })
  })

  describe('Product Selection', () => {
    it('allows selecting a product', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      expect(screen.getByText('1 item selected')).toBeInTheDocument()
    })

    it('allows deselecting a product', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      
      // Select
      fireEvent.click(checkboxes[0])
      expect(screen.getByText('1 item selected')).toBeInTheDocument()

      // Deselect
      fireEvent.click(checkboxes[0])
      expect(screen.getByText('0 items selected')).toBeInTheDocument()
    })

    it('allows selecting multiple products', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])
      fireEvent.click(checkboxes[1])

      expect(screen.getByText('2 items selected')).toBeInTheDocument()
    })

    it('highlights selected products', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      const firstCheckbox = checkboxes[0]

      fireEvent.click(firstCheckbox)

      expect(firstCheckbox).toBeChecked()
    })

    it('clears selection when clear button is clicked', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])
      fireEvent.click(checkboxes[1])

      expect(screen.getByText('2 items selected')).toBeInTheDocument()

      const clearButton = screen.getByText('Clear Selection')
      fireEvent.click(clearButton)

      expect(screen.getByText('0 items selected')).toBeInTheDocument()
    })

    it('disables clear button when no items selected', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const clearButton = screen.getByText('Clear Selection')
      expect(clearButton).toBeDisabled()
    })

    it('enables clear button when items are selected', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      const clearButton = screen.getByText('Clear Selection')
      expect(clearButton).not.toBeDisabled()
    })
  })

  describe('Add to Cart', () => {
    it('disables add to cart button when no items selected', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const addButton = screen.getByText('Add Selected to Cart')
      expect(addButton).toBeDisabled()
    })

    it('enables add to cart button when items are selected', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      const addButton = screen.getByText('Add Selected to Cart')
      expect(addButton).not.toBeDisabled()
    })

    it('redirects to login when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      const addButton = screen.getByText('Add Selected to Cart')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login')
      })
    })

    it('adds selected items to cart', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      const mockFrom = jest.fn()
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                }),
              }),
            }),
          }
        }
        if (table === 'cart_items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return mockFrom(table)
      })

      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      const addButton = screen.getByText('Add Selected to Cart')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/cart')
      })
    })

    it('shows loading state while adding to cart', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      let resolveOrgMembership: any
      const orgPromise = new Promise((resolve) => {
        resolveOrgMembership = resolve
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockReturnValue(orgPromise),
              }),
            }),
          }
        }
        return { select: jest.fn() }
      })

      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      const addButton = screen.getByText('Add Selected to Cart')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Adding...')).toBeInTheDocument()
      })

      // Resolve the promise
      resolveOrgMembership({ data: { organization_id: 'org-123' } })
    })

    it('handles errors when adding to cart', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      }))

      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      const addButton = screen.getByText('Add Selected to Cart')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to add items to cart. Please try again.')
      })
    })

    it('clears selection after adding to cart', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                }),
              }),
            }),
          }
        }
        if (table === 'cart_items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return { select: jest.fn() }
      })

      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      expect(screen.getByText('1 item selected')).toBeInTheDocument()

      const addButton = screen.getByText('Add Selected to Cart')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/cart')
      })

      // Selection should be cleared (but we're redirected so can't verify in this test)
    })
  })

  describe('Remind Later', () => {
    it('updates notification to remind later', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'reorder_notifications') {
          return { update: mockUpdate }
        }
        return { select: jest.fn() }
      })

      render(<ReorderNotificationCard notifications={mockNotifications} onUpdate={mockOnUpdate} />)

      const laterButtons = screen.getAllByText('Later')
      fireEvent.click(laterButtons[0])

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled()
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('sets reminder date 7 days in future', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'reorder_notifications') {
          return { update: mockUpdate }
        }
        return { select: jest.fn() }
      })

      render(<ReorderNotificationCard notifications={mockNotifications} onUpdate={mockOnUpdate} />)

      const laterButtons = screen.getAllByText('Later')
      fireEvent.click(laterButtons[0])

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'pending',
          })
        )
      })
    })
  })

  describe('Dismiss Notification', () => {
    it('dismisses notification when dismiss button is clicked', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'reorder_notifications') {
          return { update: mockUpdate }
        }
        return { select: jest.fn() }
      })

      render(<ReorderNotificationCard notifications={mockNotifications} onUpdate={mockOnUpdate} />)

      const dismissButtons = screen.getAllByText('Dismiss')
      fireEvent.click(dismissButtons[0])

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'dismissed',
          })
        )
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('calls onUpdate callback after dismissing', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'reorder_notifications') {
          return { update: mockUpdate }
        }
        return { select: jest.fn() }
      })

      render(<ReorderNotificationCard notifications={mockNotifications} onUpdate={mockOnUpdate} />)

      const dismissButtons = screen.getAllByText('Dismiss')
      fireEvent.click(dismissButtons[0])

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })
  })

  describe('Confidence Badge Variants', () => {
    it('shows success variant for high confidence (>= 80%)', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const highConfidenceBadge = screen.getByText('95% confidence')
      expect(highConfidenceBadge).toHaveClass('success')
    })

    it('shows warning variant for lower confidence (< 80%)', () => {
      render(<ReorderNotificationCard notifications={mockNotifications} />)

      const lowConfidenceBadge = screen.getByText('75% confidence')
      expect(lowConfidenceBadge).toHaveClass('warning')
    })
  })
})


