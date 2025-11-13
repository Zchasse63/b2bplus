import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatCard } from './StatCard'

// Mock Card component
jest.mock('./Card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
}))

describe('StatCard', () => {
  describe('Rendering', () => {
    it('renders with title and value', () => {
      render(<StatCard title="Revenue" value="$10,000" />)
      expect(screen.getByText('Revenue')).toBeInTheDocument()
      expect(screen.getByText('$10,000')).toBeInTheDocument()
    })

    it('renders with numeric value', () => {
      render(<StatCard title="Users" value={1234} />)
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('1234')).toBeInTheDocument()
    })

    it('renders with icon', () => {
      render(
        <StatCard
          title="Sales"
          value="100"
          icon={<span data-testid="icon">📊</span>}
        />
      )
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('renders without icon', () => {
      render(<StatCard title="Metric" value="50" />)
      expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
    })
  })

  describe('Trend Display', () => {
    it('displays positive trend', () => {
      render(
        <StatCard
          title="Growth"
          value="100"
          trend={{ value: 25, isPositive: true }}
        />
      )
      expect(screen.getByText(/↑ 25%/)).toBeInTheDocument()
    })

    it('displays negative trend', () => {
      render(
        <StatCard
          title="Decline"
          value="100"
          trend={{ value: 15, isPositive: false }}
        />
      )
      expect(screen.getByText(/↓ 15%/)).toBeInTheDocument()
    })

    it('applies positive trend styling', () => {
      render(
        <StatCard
          title="Growth"
          value="100"
          trend={{ value: 25, isPositive: true }}
        />
      )
      const trend = screen.getByText(/↑ 25%/)
      expect(trend).toHaveClass('text-b2b-success')
    })

    it('applies negative trend styling', () => {
      render(
        <StatCard
          title="Decline"
          value="100"
          trend={{ value: 15, isPositive: false }}
        />
      )
      const trend = screen.getByText(/↓ 15%/)
      expect(trend).toHaveClass('text-b2b-error')
    })
  })

  describe('Change Prop', () => {
    it('converts positive change to trend', () => {
      render(
        <StatCard
          title="Metric"
          value="100"
          change={20}
        />
      )
      expect(screen.getByText(/↑ 20%/)).toBeInTheDocument()
    })

    it('converts negative change to trend', () => {
      render(
        <StatCard
          title="Metric"
          value="100"
          change={-10}
        />
      )
      expect(screen.getByText(/↓ 10%/)).toBeInTheDocument()
    })

    it('converts zero change to positive trend', () => {
      render(
        <StatCard
          title="Metric"
          value="100"
          change={0}
        />
      )
      expect(screen.getByText(/↑ 0%/)).toBeInTheDocument()
    })
  })

  describe('Subtitle', () => {
    it('displays subtitle with trend', () => {
      render(
        <StatCard
          title="Revenue"
          value="$10,000"
          trend={{ value: 15, isPositive: true }}
          subtitle="vs last month"
        />
      )
      expect(screen.getByText('vs last month')).toBeInTheDocument()
    })

    it('displays subtitle without trend', () => {
      render(
        <StatCard
          title="Users"
          value="500"
          subtitle="Active users"
        />
      )
      expect(screen.getByText('Active users')).toBeInTheDocument()
    })
  })

  describe('Icon Styling', () => {
    it('applies default icon background', () => {
      const { container } = render(
        <StatCard
          title="Metric"
          value="100"
          icon={<span>📊</span>}
        />
      )
      const iconContainer = container.querySelector('[class*="bg-b2b-blue-50"]')
      expect(iconContainer).toBeInTheDocument()
    })

    it('applies custom icon background', () => {
      const { container } = render(
        <StatCard
          title="Metric"
          value="100"
          icon={<span>📊</span>}
          iconBg="bg-red-50"
        />
      )
      const iconContainer = container.querySelector('[class*="bg-red-50"]')
      expect(iconContainer).toBeInTheDocument()
    })

    it('applies custom icon background color', () => {
      const { container } = render(
        <StatCard
          title="Metric"
          value="100"
          icon={<span>📊</span>}
          iconBg="#ff0000"
        />
      )
      const iconContainer = container.querySelector('[style*="background"]')
      expect(iconContainer).toHaveStyle({ backgroundColor: '#ff0000' })
    })
  })

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <StatCard
          title="Metric"
          value="100"
          className="custom-class"
        />
      )
      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('Content Types', () => {
    it('renders string value', () => {
      render(<StatCard title="Status" value="Active" />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders numeric value', () => {
      render(<StatCard title="Count" value={42} />)
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('renders formatted value', () => {
      render(<StatCard title="Price" value="$1,234.56" />)
      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('renders with all props combined', () => {
      render(
        <StatCard
          title="Revenue"
          value="$50,000"
          icon={<span data-testid="icon">💰</span>}
          iconBg="bg-green-50"
          trend={{ value: 30, isPositive: true }}
          subtitle="vs last quarter"
          className="custom-class"
        />
      )
      
      expect(screen.getByText('Revenue')).toBeInTheDocument()
      expect(screen.getByText('$50,000')).toBeInTheDocument()
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText(/↑ 30%/)).toBeInTheDocument()
      expect(screen.getByText('vs last quarter')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has semantic structure', () => {
      render(
        <StatCard
          title="Metric"
          value="100"
          trend={{ value: 20, isPositive: true }}
        />
      )
      
      expect(screen.getByText('Metric')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText(/↑ 20%/)).toBeInTheDocument()
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(StatCard.displayName).toBe('StatCard')
    })
  })
})

