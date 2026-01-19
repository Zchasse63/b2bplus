import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import EmptyState from './EmptyState'
import { LucideIcon } from 'lucide-react'

// Mock B2B components
jest.mock('@/components/b2b', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

// Mock icon component
const MockIcon: LucideIcon = (props: any) => <div data-testid="mock-icon" {...props} />

describe('EmptyState', () => {
  const mockAction = {
    label: 'Add Item',
    onClick: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders empty state with icon', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
        />
      )

      expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
    })

    it('renders title', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
        />
      )

      expect(screen.getByText('No items found')).toBeInTheDocument()
    })

    it('renders description', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
        />
      )

      expect(screen.getByText('There are no items to display')).toBeInTheDocument()
    })

    it('renders without action button when action is not provided', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
        />
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders with action button when action is provided', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
          action={mockAction}
        />
      )

      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
    })
  })

  describe('Action Button', () => {
    it('displays action label correctly', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
          action={mockAction}
        />
      )

      expect(screen.getByText('Add Item')).toBeInTheDocument()
    })

    it('calls onClick when action button is clicked', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
          action={mockAction}
        />
      )

      const button = screen.getByRole('button', { name: 'Add Item' })
      fireEvent.click(button)

      expect(mockAction.onClick).toHaveBeenCalledTimes(1)
    })

    it('handles multiple clicks', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
          action={mockAction}
        />
      )

      const button = screen.getByRole('button', { name: 'Add Item' })
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      expect(mockAction.onClick).toHaveBeenCalledTimes(3)
    })
  })

  describe('Styling', () => {
    it('applies dashed border to card', () => {
      const { container } = render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('border-dashed')
    })

    it('applies icon styling', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
        />
      )

      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('h-16', 'w-16', 'text-b2b-gray-400', 'mb-4')
    })

    it('applies title styling', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
        />
      )

      const title = screen.getByText('No items found')
      expect(title.tagName).toBe('H3')
      expect(title).toHaveClass('text-xl', 'font-semibold', 'mb-2')
    })

    it('applies description styling', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items found"
          description="There are no items to display"
        />
      )

      const description = screen.getByText('There are no items to display')
      expect(description.tagName).toBe('P')
      expect(description).toHaveClass('text-b2b-gray-500', 'mb-6', 'max-w-sm')
    })
  })

  describe('Content Variations', () => {
    it('renders with short title', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="Empty"
          description="No data available"
        />
      )

      expect(screen.getByText('Empty')).toBeInTheDocument()
    })

    it('renders with long title', () => {
      const longTitle = 'This is a very long title that describes the empty state in detail'
      render(
        <EmptyState
          icon={MockIcon}
          title={longTitle}
          description="No data available"
        />
      )

      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it('renders with short description', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No items"
          description="Empty"
        />
      )

      expect(screen.getByText('Empty')).toBeInTheDocument()
    })

    it('renders with long description', () => {
      const longDescription =
        'This is a very long description that provides detailed information about why this state is empty and what the user can do about it'
      render(
        <EmptyState
          icon={MockIcon}
          title="No items"
          description={longDescription}
        />
      )

      expect(screen.getByText(longDescription)).toBeInTheDocument()
    })

    it('renders with different action labels', () => {
      const customAction = {
        label: 'Create New Product',
        onClick: jest.fn(),
      }

      render(
        <EmptyState
          icon={MockIcon}
          title="No products"
          description="Start by creating your first product"
          action={customAction}
        />
      )

      expect(screen.getByText('Create New Product')).toBeInTheDocument()
    })
  })

  describe('Use Cases', () => {
    it('renders empty cart state', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="Your cart is empty"
          description="Add some products to get started"
          action={{
            label: 'Browse Products',
            onClick: jest.fn(),
          }}
        />
      )

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
      expect(screen.getByText('Add some products to get started')).toBeInTheDocument()
      expect(screen.getByText('Browse Products')).toBeInTheDocument()
    })

    it('renders empty search results state', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No results found"
          description="Try adjusting your search or filters"
        />
      )

      expect(screen.getByText('No results found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument()
    })

    it('renders empty orders state', () => {
      render(
        <EmptyState
          icon={MockIcon}
          title="No orders yet"
          description="Your order history will appear here"
          action={{
            label: 'Start Shopping',
            onClick: jest.fn(),
          }}
        />
      )

      expect(screen.getByText('No orders yet')).toBeInTheDocument()
      expect(screen.getByText('Your order history will appear here')).toBeInTheDocument()
      expect(screen.getByText('Start Shopping')).toBeInTheDocument()
    })
  })
})

