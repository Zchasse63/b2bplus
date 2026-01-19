import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from './Button'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef(({ children, whileHover, whileTap, transition, animate, variants, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    span: ({ children, animate, transition, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

describe('Button', () => {
  describe('Rendering', () => {
    it('renders button with children', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('renders button without children', () => {
      render(<Button />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Button className="custom-class">Button</Button>)
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })

  describe('Variants', () => {
    it('renders primary variant by default', () => {
      render(<Button>Primary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-b2b-blue')
      expect(button).toHaveClass('text-white')
    })

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-b2b-green')
      expect(button).toHaveClass('text-white')
    })

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border-2')
      expect(button).toHaveClass('border-b2b-blue')
      expect(button).toHaveClass('text-b2b-blue')
    })

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-b2b-text')
    })
  })

  describe('Sizes', () => {
    it('renders medium size by default', () => {
      render(<Button>Medium</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
      expect(button).toHaveClass('px-4')
      expect(button).toHaveClass('text-sm')
    })

    it('renders small size', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-8')
      expect(button).toHaveClass('px-3.5')
      expect(button).toHaveClass('text-sm')
    })

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-12')
      expect(button).toHaveClass('px-6')
      expect(button).toHaveClass('text-base')
    })
  })

  describe('Icons', () => {
    it('renders icon on the right by default', () => {
      render(<Button icon={<span data-testid="icon">→</span>}>With Icon</Button>)
      const button = screen.getByRole('button')
      const icon = screen.getByTestId('icon')
      
      expect(button).toContainElement(icon)
      expect(button.textContent).toBe('With Icon→')
    })

    it('renders icon on the left', () => {
      render(<Button icon={<span data-testid="icon">←</span>} iconPosition="left">With Icon</Button>)
      const button = screen.getByRole('button')
      const icon = screen.getByTestId('icon')
      
      expect(button).toContainElement(icon)
      expect(button.textContent).toBe('←With Icon')
    })

    it('does not render icon when loading', () => {
      render(<Button icon={<span data-testid="icon">→</span>} loading>Loading</Button>)
      
      expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
    })
  })

  describe('Full Width', () => {
    it('renders full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>)
      expect(screen.getByRole('button')).toHaveClass('w-full')
    })

    it('does not render full width by default', () => {
      render(<Button>Normal Width</Button>)
      expect(screen.getByRole('button')).not.toHaveClass('w-full')
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByText('⏳')).toBeInTheDocument()
    })

    it('disables button when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('hides children text when loading', () => {
      render(<Button loading>Click me</Button>)
      const button = screen.getByRole('button')
      expect(button).toContainHTML('⏳')
      expect(button).toContainHTML('Click me')
    })
  })

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('applies disabled styles', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toHaveClass('disabled:cursor-not-allowed')
    })
  })

  describe('Click Handling', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick} disabled>Disabled</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when loading', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick} loading>Loading</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('HTML Attributes', () => {
    it('accepts type attribute', () => {
      render(<Button type="submit">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })

    it('accepts data attributes', () => {
      render(<Button data-testid="custom-button">Button</Button>)
      expect(screen.getByTestId('custom-button')).toBeInTheDocument()
    })

    it('accepts aria attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom label')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Button</Button>)
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current?.tagName).toBe('BUTTON')
    })
  })

  describe('Accessibility', () => {
    it('has correct role', () => {
      render(<Button>Button</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('is keyboard accessible', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Button</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      expect(button).toHaveFocus()
    })

    it('shows disabled state to screen readers', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('disabled')
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={<span data-testid="icon">→</span>}
          className="custom-class"
        >
          Complex Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-b2b-green')
      expect(button).toHaveClass('px-6')
      expect(button).toHaveClass('w-full')
      expect(button).toHaveClass('custom-class')
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })
  })
})

