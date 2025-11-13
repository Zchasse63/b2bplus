import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Icon } from './Icon'

// Mock icon component
const MockIcon = React.forwardRef<SVGSVGElement, any>(
  ({ className, 'data-testid': testId, ...props }, ref) => (
    <svg ref={ref} className={className} data-testid={testId || 'mock-icon'} {...props}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
)
MockIcon.displayName = 'MockIcon'

describe('Icon', () => {
  describe('Rendering', () => {
    it('renders icon component', () => {
      render(<Icon icon={MockIcon} />)
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
    })

    it('renders icon with custom className', () => {
      render(<Icon icon={MockIcon} className="custom-class" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('custom-class')
    })

    it('renders icon with SVG attributes', () => {
      render(<Icon icon={MockIcon} data-testid="custom-icon" />)
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  describe('Sizes', () => {
    it('renders extra small size', () => {
      render(<Icon icon={MockIcon} size="xs" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-3')
      expect(icon).toHaveClass('h-3')
    })

    it('renders small size', () => {
      render(<Icon icon={MockIcon} size="sm" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-4')
      expect(icon).toHaveClass('h-4')
    })

    it('renders medium size by default', () => {
      render(<Icon icon={MockIcon} />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-5')
      expect(icon).toHaveClass('h-5')
    })

    it('renders large size', () => {
      render(<Icon icon={MockIcon} size="lg" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-6')
      expect(icon).toHaveClass('h-6')
    })

    it('renders extra large size', () => {
      render(<Icon icon={MockIcon} size="xl" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-8')
      expect(icon).toHaveClass('h-8')
    })
  })

  describe('SVG Attributes', () => {
    it('accepts viewBox attribute', () => {
      render(<Icon icon={MockIcon} viewBox="0 0 24 24" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('accepts fill attribute', () => {
      render(<Icon icon={MockIcon} fill="currentColor" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('fill', 'currentColor')
    })

    it('accepts stroke attribute', () => {
      render(<Icon icon={MockIcon} stroke="currentColor" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('stroke', 'currentColor')
    })

    it('accepts strokeWidth attribute', () => {
      render(<Icon icon={MockIcon} strokeWidth={2} />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('stroke-width', '2')
    })

    it('accepts aria attributes', () => {
      render(<Icon icon={MockIcon} aria-label="Search icon" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('aria-label', 'Search icon')
    })

    it('accepts role attribute', () => {
      render(<Icon icon={MockIcon} role="img" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('role', 'img')
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Icon
          icon={MockIcon}
          size="lg"
          className="custom-class"
          fill="currentColor"
          aria-label="Custom icon"
        />
      )
      
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-6')
      expect(icon).toHaveClass('h-6')
      expect(icon).toHaveClass('custom-class')
      expect(icon).toHaveAttribute('fill', 'currentColor')
      expect(icon).toHaveAttribute('aria-label', 'Custom icon')
    })
  })

  describe('Icon Component Flexibility', () => {
    it('works with different icon components', () => {
      const AnotherIcon = React.forwardRef<SVGSVGElement, { className?: string }>(
        ({ className }, ref) => (
          <svg ref={ref} className={className} data-testid="another-icon">
            <rect width="20" height="20" />
          </svg>
        )
      )
      AnotherIcon.displayName = 'AnotherIcon'

      render(<Icon icon={AnotherIcon} />)
      expect(screen.getByTestId('another-icon')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('can have aria-label for screen readers', () => {
      render(<Icon icon={MockIcon} aria-label="Search" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('aria-label', 'Search')
    })

    it('can have role attribute', () => {
      render(<Icon icon={MockIcon} role="img" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('role', 'img')
    })

    it('can be hidden from screen readers', () => {
      render(<Icon icon={MockIcon} aria-hidden="true" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Styling', () => {
    it('applies size classes correctly', () => {
      const { rerender } = render(<Icon icon={MockIcon} size="sm" />)
      let icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-4', 'h-4')

      rerender(<Icon icon={MockIcon} size="lg" />)
      icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-6', 'h-6')
    })

    it('merges custom className with size classes', () => {
      render(<Icon icon={MockIcon} size="md" className="text-red-500" />)
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toHaveClass('w-5')
      expect(icon).toHaveClass('h-5')
      expect(icon).toHaveClass('text-red-500')
    })
  })

  describe('Edge Cases', () => {
    it('handles icon without className prop', () => {
      const SimpleIcon = () => (
        <svg data-testid="simple-icon">
          <circle cx="12" cy="12" r="10" />
        </svg>
      )

      render(<Icon icon={SimpleIcon as any} />)
      expect(screen.getByTestId('simple-icon')).toBeInTheDocument()
    })

    it('handles multiple size changes', () => {
      const { rerender } = render(<Icon icon={MockIcon} size="xs" />)
      expect(screen.getByTestId('mock-icon')).toHaveClass('w-3', 'h-3')

      rerender(<Icon icon={MockIcon} size="sm" />)
      expect(screen.getByTestId('mock-icon')).toHaveClass('w-4', 'h-4')

      rerender(<Icon icon={MockIcon} size="md" />)
      expect(screen.getByTestId('mock-icon')).toHaveClass('w-5', 'h-5')

      rerender(<Icon icon={MockIcon} size="lg" />)
      expect(screen.getByTestId('mock-icon')).toHaveClass('w-6', 'h-6')

      rerender(<Icon icon={MockIcon} size="xl" />)
      expect(screen.getByTestId('mock-icon')).toHaveClass('w-8', 'h-8')
    })
  })
})

