import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Badge } from './Badge'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    span: React.forwardRef(({ children, variants, initial, animate, transition, ...props }: any, ref: any) => (
      <span ref={ref} {...props}>{children}</span>
    )),
  },
}))

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders badge with children', () => {
      render(<Badge>New</Badge>)
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('renders badge without children', () => {
      const { container } = render(<Badge />)
      const badge = container.firstChild
      expect(badge).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Badge className="custom-class">Badge</Badge>)
      expect(screen.getByText('Badge')).toHaveClass('custom-class')
    })
  })

  describe('Variants', () => {
    it('renders default variant by default', () => {
      render(<Badge>Default</Badge>)
      const badge = screen.getByText('Default')
      expect(badge).toHaveClass('bg-b2b-gray-100')
      expect(badge).toHaveClass('text-b2b-text')
    })

    it('renders success variant', () => {
      render(<Badge variant="success">Success</Badge>)
      const badge = screen.getByText('Success')
      expect(badge).toHaveClass('bg-b2b-green-50')
      expect(badge).toHaveClass('text-b2b-green-700')
      expect(badge).toHaveClass('border-b2b-green-200')
    })

    it('renders warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>)
      const badge = screen.getByText('Warning')
      expect(badge).toHaveClass('bg-b2b-orange-50')
      expect(badge).toHaveClass('text-b2b-orange-700')
      expect(badge).toHaveClass('border-b2b-orange-200')
    })

    it('renders error variant', () => {
      render(<Badge variant="error">Error</Badge>)
      const badge = screen.getByText('Error')
      expect(badge).toHaveClass('bg-red-50')
      expect(badge).toHaveClass('text-b2b-error')
      expect(badge).toHaveClass('border-red-200')
    })

    it('renders info variant', () => {
      render(<Badge variant="info">Info</Badge>)
      const badge = screen.getByText('Info')
      expect(badge).toHaveClass('bg-b2b-blue-50')
      expect(badge).toHaveClass('text-b2b-blue-700')
      expect(badge).toHaveClass('border-b2b-blue-200')
    })
  })

  describe('Sizes', () => {
    it('renders medium size by default', () => {
      render(<Badge>Medium</Badge>)
      const badge = screen.getByText('Medium')
      expect(badge).toHaveClass('px-2.5')
      expect(badge).toHaveClass('py-1')
      expect(badge).toHaveClass('text-sm')
    })

    it('renders small size', () => {
      render(<Badge size="sm">Small</Badge>)
      const badge = screen.getByText('Small')
      expect(badge).toHaveClass('px-2')
      expect(badge).toHaveClass('py-0.5')
      expect(badge).toHaveClass('text-xs')
    })

    it('renders large size', () => {
      render(<Badge size="lg">Large</Badge>)
      const badge = screen.getByText('Large')
      expect(badge).toHaveClass('px-3')
      expect(badge).toHaveClass('py-1.5')
      expect(badge).toHaveClass('text-base')
    })
  })

  describe('Base Styles', () => {
    it('always has inline-flex display', () => {
      render(<Badge>Badge</Badge>)
      expect(screen.getByText('Badge')).toHaveClass('inline-flex')
    })

    it('always has items-center', () => {
      render(<Badge>Badge</Badge>)
      expect(screen.getByText('Badge')).toHaveClass('items-center')
    })

    it('always has justify-center', () => {
      render(<Badge>Badge</Badge>)
      expect(screen.getByText('Badge')).toHaveClass('justify-center')
    })

    it('always has font-medium', () => {
      render(<Badge>Badge</Badge>)
      expect(screen.getByText('Badge')).toHaveClass('font-medium')
    })

    it('always has rounded-full', () => {
      render(<Badge>Badge</Badge>)
      expect(screen.getByText('Badge')).toHaveClass('rounded-full')
    })
  })

  describe('HTML Attributes', () => {
    it('accepts data attributes', () => {
      render(<Badge data-testid="custom-badge">Badge</Badge>)
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument()
    })

    it('accepts aria attributes', () => {
      render(<Badge aria-label="Status badge">Active</Badge>)
      expect(screen.getByText('Active')).toHaveAttribute('aria-label', 'Status badge')
    })

    it('accepts onClick handler', () => {
      const handleClick = jest.fn()
      render(<Badge onClick={handleClick}>Clickable</Badge>)
      
      const badge = screen.getByText('Clickable')
      badge.click()
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to span element', () => {
      const ref = React.createRef<HTMLSpanElement>()
      render(<Badge ref={ref}>Badge</Badge>)
      
      expect(ref.current).toBeInstanceOf(HTMLSpanElement)
      expect(ref.current?.tagName).toBe('SPAN')
    })
  })

  describe('Content Types', () => {
    it('renders text content', () => {
      render(<Badge>Text Badge</Badge>)
      expect(screen.getByText('Text Badge')).toBeInTheDocument()
    })

    it('renders number content', () => {
      render(<Badge>42</Badge>)
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('renders with icon', () => {
      render(<Badge><span data-testid="icon">✓</span> Success</Badge>)
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('Success')).toBeInTheDocument()
    })

    it('renders empty badge', () => {
      const { container } = render(<Badge />)
      const badge = container.firstChild
      expect(badge).toBeInTheDocument()
      expect(badge?.textContent).toBe('')
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Badge
          variant="success"
          size="lg"
          className="custom-class"
          data-testid="complex-badge"
        >
          Completed
        </Badge>
      )
      
      const badge = screen.getByTestId('complex-badge')
      expect(badge).toHaveClass('bg-b2b-green-50')
      expect(badge).toHaveClass('px-3')
      expect(badge).toHaveClass('custom-class')
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  describe('Use Cases', () => {
    it('renders status badge', () => {
      render(<Badge variant="success">Active</Badge>)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders count badge', () => {
      render(<Badge variant="info">5</Badge>)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders notification badge', () => {
      render(<Badge variant="error">New</Badge>)
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('renders category badge', () => {
      render(<Badge variant="default">Electronics</Badge>)
      expect(screen.getByText('Electronics')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('can have role attribute', () => {
      render(<Badge role="status">Active</Badge>)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('can have aria-label for screen readers', () => {
      render(<Badge aria-label="5 unread messages">5</Badge>)
      const badge = screen.getByText('5')
      expect(badge).toHaveAttribute('aria-label', '5 unread messages')
    })

    it('renders semantic content', () => {
      render(<Badge>Status: <strong>Active</strong></Badge>)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  describe('Visual Variants Combination', () => {
    it('renders all variant and size combinations', () => {
      const variants: Array<'default' | 'success' | 'warning' | 'error' | 'info'> = ['default', 'success', 'warning', 'error', 'info']
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg']
      
      variants.forEach((variant) => {
        sizes.forEach((size) => {
          const { unmount } = render(
            <Badge variant={variant} size={size}>
              {variant}-{size}
            </Badge>
          )
          expect(screen.getByText(`${variant}-${size}`)).toBeInTheDocument()
          unmount()
        })
      })
    })
  })
})

