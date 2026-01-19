import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Card } from './Card'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, variants, initial, animate, transition, whileHover, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
}))

describe('Card', () => {
  describe('Rendering', () => {
    it('renders card with children', () => {
      render(<Card>Card content</Card>)
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('renders card without children', () => {
      const { container } = render(<Card />)
      const card = container.firstChild
      expect(card).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('Variants', () => {
    it('renders default variant by default', () => {
      const { container } = render(<Card>Default</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('shadow-b2b')
      expect(card).not.toHaveClass('border')
    })

    it('renders bordered variant', () => {
      const { container } = render(<Card variant="bordered">Bordered</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('border-b2b-gray-200')
    })

    it('renders elevated variant', () => {
      const { container } = render(<Card variant="elevated">Elevated</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('shadow-b2b-lg')
    })
  })

  describe('Padding', () => {
    it('renders medium padding by default', () => {
      const { container } = render(<Card>Medium</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('p-6')
    })

    it('renders no padding', () => {
      const { container } = render(<Card padding="none">None</Card>)
      const card = container.firstChild
      expect(card).not.toHaveClass('p-4')
      expect(card).not.toHaveClass('p-6')
      expect(card).not.toHaveClass('p-8')
    })

    it('renders small padding', () => {
      const { container } = render(<Card padding="sm">Small</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('p-4')
    })

    it('renders large padding', () => {
      const { container } = render(<Card padding="lg">Large</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('p-8')
    })
  })

  describe('Hover Effect', () => {
    it('applies cursor-pointer when hover is true', () => {
      const { container } = render(<Card hover>Hoverable</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('cursor-pointer')
    })

    it('does not apply cursor-pointer by default', () => {
      const { container } = render(<Card>Not hoverable</Card>)
      const card = container.firstChild
      expect(card).not.toHaveClass('cursor-pointer')
    })
  })

  describe('Base Styles', () => {
    it('always has white background', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('bg-white')
    })

    it('always has rounded corners', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('rounded-xl')
    })
  })

  describe('HTML Attributes', () => {
    it('accepts data attributes', () => {
      render(<Card data-testid="custom-card">Content</Card>)
      expect(screen.getByTestId('custom-card')).toBeInTheDocument()
    })

    it('accepts aria attributes', () => {
      const { container } = render(<Card aria-label="Custom card">Content</Card>)
      const card = container.firstChild
      expect(card).toHaveAttribute('aria-label', 'Custom card')
    })

    it('accepts onClick handler', () => {
      const handleClick = jest.fn()
      const { container } = render(<Card onClick={handleClick}>Clickable</Card>)

      const card = container.firstChild as HTMLElement
      card.click()

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to div element', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current?.tagName).toBe('DIV')
    })
  })

  describe('Nested Content', () => {
    it('renders complex nested content', () => {
      render(
        <Card>
          <h2>Title</h2>
          <p>Description</p>
          <button>Action</button>
        </Card>
      )
      
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('renders multiple children', () => {
      render(
        <Card>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </Card>
      )
      
      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
      expect(screen.getByText('Child 3')).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Card
          variant="elevated"
          padding="lg"
          hover
          className="custom-class"
          data-testid="complex-card"
        >
          Complex Card
        </Card>
      )
      
      const card = screen.getByTestId('complex-card')
      expect(card).toHaveClass('shadow-b2b-lg')
      expect(card).toHaveClass('p-8')
      expect(card).toHaveClass('cursor-pointer')
      expect(card).toHaveClass('custom-class')
      expect(screen.getByText('Complex Card')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('can be used as a clickable region', () => {
      const handleClick = jest.fn()
      render(
        <Card onClick={handleClick} role="button" tabIndex={0}>
          Clickable Card
        </Card>
      )
      
      const card = screen.getByRole('button')
      expect(card).toBeInTheDocument()
    })

    it('can have semantic HTML inside', () => {
      render(
        <Card>
          <article>
            <h1>Article Title</h1>
            <p>Article content</p>
          </article>
        </Card>
      )
      
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })
})

