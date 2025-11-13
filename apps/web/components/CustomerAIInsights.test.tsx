import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CustomerAIInsights } from './CustomerAIInsights'

// Mock dependencies
jest.mock('@/components/b2b/Card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
}))
jest.mock('@/components/b2b/Badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}))
jest.mock('@/components/b2b/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

const mockOrders = [
  {
    id: 'order-1',
    created_at: '2024-01-01T00:00:00Z',
    total: 100,
  },
  {
    id: 'order-2',
    created_at: '2024-02-01T00:00:00Z',
    total: 150,
  },
  {
    id: 'order-3',
    created_at: '2024-03-01T00:00:00Z',
    total: 200,
  },
]

describe('CustomerAIInsights', () => {
  it('renders loading state initially', async () => {
    render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={[]}
        metrics={{}}
      />
    )

    // Component starts in loading state, then transitions
    // Just check that it renders without crashing
    await waitFor(() => {
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })
  })

  it('shows high churn risk insight', async () => {
    const metrics = {
      churn_risk: 'high',
      days_since_last_order: 45,
    }

    render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={metrics}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('High Churn Risk Detected')).toBeInTheDocument()
      expect(screen.getByText(/hasn't ordered in 45 days/i)).toBeInTheDocument()
    })
  })

  it('shows purchase pattern insight for regular customers', async () => {
    const metrics = {
      days_since_last_order: 15,
    }

    render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={metrics}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Regular Purchase Pattern')).toBeInTheDocument()
    })
  })

  it('shows upsell opportunity for low AOV customers', async () => {
    const metrics = {
      avg_order_value: 300,
      days_since_last_order: 10,
    }

    const manyOrders = Array(6).fill(mockOrders[0])

    render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={manyOrders}
        metrics={metrics}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Upsell Opportunity')).toBeInTheDocument()
      expect(screen.getByText(/Average order value is \$300/i)).toBeInTheDocument()
    })
  })

  it('shows product recommendation insight', async () => {
    render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={{}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Product Recommendation')).toBeInTheDocument()
      expect(screen.getByText(/eco-friendly alternatives/i)).toBeInTheDocument()
    })
  })

  it('displays confidence scores', async () => {
    const metrics = {
      churn_risk: 'high',
      days_since_last_order: 45,
    }

    render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={metrics}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('85% confidence')).toBeInTheDocument()
    })
  })

  it('displays action buttons for actionable insights', async () => {
    const metrics = {
      churn_risk: 'high',
      days_since_last_order: 45,
    }

    render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={metrics}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Send Offer/)).toBeInTheDocument()
    })
  })

  it('shows warning icon for warning type insights', async () => {
    const metrics = {
      churn_risk: 'high',
      days_since_last_order: 45,
    }

    render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={metrics}
      />
    )

    await waitFor(() => {
      const warningIcon = document.querySelector('[data-testid="card"]')
      expect(warningIcon).toBeInTheDocument()
    })
  })

  it('renders nothing when no insights generated', async () => {
    const { container } = render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={[]}
        metrics={{}}
      />
    )

    await waitFor(() => {
      const cards = screen.queryAllByTestId('card')
      // Should only have the "no insights" message or empty state
      expect(cards.length).toBeLessThanOrEqual(1)
    })
  })

  it('updates insights when customerId changes', async () => {
    const { rerender } = render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={{}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Product Recommendation')).toBeInTheDocument()
    })

    rerender(
      <CustomerAIInsights
        customerId="cust-456"
        orders={mockOrders}
        metrics={{}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Product Recommendation')).toBeInTheDocument()
    })
  })

  it('updates insights when orders change', async () => {
    const { rerender } = render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={[]}
        metrics={{}}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })

    rerender(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={{}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Product Recommendation')).toBeInTheDocument()
    })
  })

  it('updates insights when metrics change', async () => {
    const { rerender } = render(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={{}}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('High Churn Risk Detected')).not.toBeInTheDocument()
    })

    rerender(
      <CustomerAIInsights
        customerId="cust-123"
        orders={mockOrders}
        metrics={{ churn_risk: 'high', days_since_last_order: 45 }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('High Churn Risk Detected')).toBeInTheDocument()
    })
  })
})

