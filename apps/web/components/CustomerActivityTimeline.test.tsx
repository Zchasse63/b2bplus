import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CustomerActivityTimeline } from './CustomerActivityTimeline'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

// Mock B2B components
jest.mock('@/components/b2b/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}))

jest.mock('@/components/b2b/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}))

// Mock react-icons
jest.mock('react-icons/md', () => ({
  MdShoppingCart: () => <div data-testid="icon-cart" />,
  MdEmail: () => <div data-testid="icon-email" />,
  MdAttachMoney: () => <div data-testid="icon-money" />,
  MdNotifications: () => <div data-testid="icon-notifications" />,
  MdAutorenew: () => <div data-testid="icon-autorenew" />,
  MdTrendingUp: () => <div data-testid="icon-trending" />,
  MdWarning: () => <div data-testid="icon-warning" />,
}))

describe('CustomerActivityTimeline', () => {
  const mockOrders = [
    {
      id: 'order-1',
      order_number: 'ORD-001',
      total: 150.0,
      status: 'completed',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
      id: 'order-2',
      order_number: 'ORD-002',
      total: 250.5,
      status: 'pending',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    },
  ]

  const mockNotifications = [
    {
      id: 'notif-1',
      status: 'sent',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      product: { name: 'Laptop' },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('shows loading state initially', () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue(
                new Promise(() => {}) // Never resolves
              ),
            }),
          }),
        }),
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      expect(screen.getByText('Loading activity timeline...')).toBeInTheDocument()
    })

    it('renders timeline header after loading', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockOrders,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Activity Timeline')).toBeInTheDocument()
      })
    })

    it('shows empty state when no events', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                }),
              }),
            }),
          }),
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('No activity yet')).toBeInTheDocument()
      })
    })
  })

  describe('Order Events', () => {
    it('displays order events', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockOrders,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Order ORD-001')).toBeInTheDocument()
        expect(screen.getByText('Order ORD-002')).toBeInTheDocument()
      })
    })

    it('displays order totals and status', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockOrders,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText(/Placed order for \$150\.00 - completed/)).toBeInTheDocument()
        expect(screen.getByText(/Placed order for \$250\.50 - pending/)).toBeInTheDocument()
      })
    })

    it('displays status badges for orders', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockOrders,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        const completedBadge = screen.getByText('completed')
        expect(completedBadge).toHaveAttribute('data-variant', 'success')

        const pendingBadge = screen.getByText('pending')
        expect(pendingBadge).toHaveAttribute('data-variant', 'default')
      })
    })

    it('displays order icons', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [mockOrders[0]],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByTestId('icon-cart')).toBeInTheDocument()
      })
    })
  })

  describe('Notification Events', () => {
    it('displays reorder notification events', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockNotifications,
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Reorder Notification Sent')).toBeInTheDocument()
        expect(screen.getByText(/AI predicted reorder needed for Laptop/)).toBeInTheDocument()
      })
    })

    it('displays notification icons', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockNotifications,
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByTestId('icon-notifications')).toBeInTheDocument()
      })
    })
  })

  describe('AI Events', () => {
    it('generates churn risk event for inactive customers', async () => {
      const oldOrder = {
        id: 'order-old',
        order_number: 'ORD-OLD',
        total: 100.0,
        status: 'completed',
        created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(), // 70 days ago
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [oldOrder],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Churn Risk Detected')).toBeInTheDocument()
        expect(
          screen.getByText('AI detected increased churn risk due to inactivity')
        ).toBeInTheDocument()
      })
    })

    it('generates pattern detection event for regular customers', async () => {
      const regularOrders = Array.from({ length: 5 }, (_, i) => ({
        id: `order-${i}`,
        order_number: `ORD-${i}`,
        total: 100.0,
        status: 'completed',
        created_at: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
      }))

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: regularOrders,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Purchase Pattern Identified')).toBeInTheDocument()
        expect(
          screen.getByText('AI identified regular monthly ordering pattern')
        ).toBeInTheDocument()
      })
    })

    it('displays AI event icons', async () => {
      const oldOrder = {
        id: 'order-old',
        order_number: 'ORD-OLD',
        total: 100.0,
        status: 'completed',
        created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [oldOrder],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByTestId('icon-autorenew')).toBeInTheDocument()
      })
    })
  })

  describe('Timestamp Formatting', () => {
    it('displays "Today" for events from today', async () => {
      const todayOrder = {
        id: 'order-today',
        order_number: 'ORD-TODAY',
        total: 100.0,
        status: 'completed',
        created_at: new Date().toISOString(),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [todayOrder],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument()
      })
    })

    it('displays "Yesterday" for events from yesterday', async () => {
      const yesterdayOrder = {
        id: 'order-yesterday',
        order_number: 'ORD-YESTERDAY',
        total: 100.0,
        status: 'completed',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [yesterdayOrder],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('Yesterday')).toBeInTheDocument()
      })
    })

    it('displays days ago for recent events', async () => {
      const recentOrder = {
        id: 'order-recent',
        order_number: 'ORD-RECENT',
        total: 100.0,
        status: 'completed',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [recentOrder],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('3 days ago')).toBeInTheDocument()
      })
    })

    it('displays weeks ago for older events', async () => {
      const oldOrder = {
        id: 'order-old',
        order_number: 'ORD-OLD',
        total: 100.0,
        status: 'completed',
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [oldOrder],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(screen.getByText('2 weeks ago')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockRejectedValue(new Error('Database error')),
              }),
            }),
          }),
        }
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching activity timeline:',
          expect.any(Error)
        )
      })

      // Should show empty state after error
      await waitFor(() => {
        expect(screen.getByText('No activity yet')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Event Sorting and Limiting', () => {
    it('sorts events by timestamp (most recent first)', async () => {
      const orders = [
        {
          id: 'order-1',
          order_number: 'ORD-001',
          total: 100.0,
          status: 'completed',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'order-2',
          order_number: 'ORD-002',
          total: 200.0,
          status: 'completed',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: orders,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        const orderTitles = screen.getAllByText(/Order ORD-/)
        // Most recent order (ORD-002) should appear first
        expect(orderTitles[0]).toHaveTextContent('Order ORD-002')
        expect(orderTitles[1]).toHaveTextContent('Order ORD-001')
      })
    })

    it('limits events to 15 items', async () => {
      // Create 20 orders (will also generate AI events, so total > 15)
      const manyOrders = Array.from({ length: 20 }, (_, i) => ({
        id: `order-${i}`,
        order_number: `ORD-${String(i).padStart(3, '0')}`,
        total: 100.0,
        status: 'completed',
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      }))

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: manyOrders,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'reorder_notifications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }
        }
      })

      render(<CustomerActivityTimeline customerId="customer-123" />)

      await waitFor(() => {
        // Should show at most 15 events total (orders + AI events)
        const allEvents = screen.getAllByText(/Order ORD-|Purchase Pattern|Churn Risk/)
        expect(allEvents.length).toBeLessThanOrEqual(15)
      })
    })
  })
})

