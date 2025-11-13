import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StaggerList } from './StaggerList'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, variants, initial, animate, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
}))

// Mock useStaggerChildren
jest.mock('@/lib/animations', () => ({
  useStaggerChildren: jest.fn(() => ({
    containerVariants: {},
    itemVariants: {},
  })),
}))

describe('StaggerList', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(
        <StaggerList>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </StaggerList>
      )
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })

    it('renders single child', () => {
      render(
        <StaggerList>
          <div>Single Item</div>
        </StaggerList>
      )
      expect(screen.getByText('Single Item')).toBeInTheDocument()
    })

    it('renders without children', () => {
      const { container } = render(<StaggerList />)
      const div = container.firstChild
      expect(div).toBeInTheDocument()
    })

    it('renders multiple children types', () => {
      render(
        <StaggerList>
          <div>Div Item</div>
          <span>Span Item</span>
          <p>Paragraph Item</p>
        </StaggerList>
      )
      expect(screen.getByText('Div Item')).toBeInTheDocument()
      expect(screen.getByText('Span Item')).toBeInTheDocument()
      expect(screen.getByText('Paragraph Item')).toBeInTheDocument()
    })
  })

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <StaggerList className="custom-class">
          <div>Item</div>
        </StaggerList>
      )
      const list = container.firstChild
      expect(list).toHaveClass('custom-class')
    })

    it('applies multiple classes', () => {
      const { container } = render(
        <StaggerList className="class1 class2 class3">
          <div>Item</div>
        </StaggerList>
      )
      const list = container.firstChild
      expect(list).toHaveClass('class1')
      expect(list).toHaveClass('class2')
      expect(list).toHaveClass('class3')
    })
  })

  describe('Stagger Delay', () => {
    it('accepts staggerDelay prop', () => {
      render(
        <StaggerList staggerDelay={0.1}>
          <div>Item</div>
        </StaggerList>
      )
      expect(screen.getByText('Item')).toBeInTheDocument()
    })

    it('accepts delayChildren prop', () => {
      render(
        <StaggerList delayChildren={0.2}>
          <div>Item</div>
        </StaggerList>
      )
      expect(screen.getByText('Item')).toBeInTheDocument()
    })

    it('accepts both delay props', () => {
      render(
        <StaggerList staggerDelay={0.1} delayChildren={0.2}>
          <div>Item</div>
        </StaggerList>
      )
      expect(screen.getByText('Item')).toBeInTheDocument()
    })
  })

  describe('Content Types', () => {
    it('renders text content', () => {
      render(
        <StaggerList>
          <div>Text Item</div>
        </StaggerList>
      )
      expect(screen.getByText('Text Item')).toBeInTheDocument()
    })

    it('renders JSX elements', () => {
      render(
        <StaggerList>
          <div>
            <h2>Title</h2>
            <p>Description</p>
          </div>
        </StaggerList>
      )
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('renders components', () => {
      const TestComponent = () => <div>Component Item</div>
      
      render(
        <StaggerList>
          <TestComponent />
        </StaggerList>
      )
      expect(screen.getByText('Component Item')).toBeInTheDocument()
    })

    it('renders list items', () => {
      const items = ['Item 1', 'Item 2', 'Item 3']
      render(
        <StaggerList>
          {items.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </StaggerList>
      )
      items.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument()
      })
    })
  })

  describe('Animation Props', () => {
    it('has initial animation state', () => {
      const { container } = render(
        <StaggerList>
          <div>Item</div>
        </StaggerList>
      )
      const list = container.firstChild
      expect(list).toBeInTheDocument()
    })

    it('renders with motion div', () => {
      const { container } = render(
        <StaggerList>
          <span data-testid="content">Animated Content</span>
        </StaggerList>
      )
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })

  describe('Complex Layouts', () => {
    it('renders list of cards', () => {
      render(
        <StaggerList>
          {[1, 2, 3].map(i => (
            <div key={i} data-testid={`card-${i}`}>
              <h3>Card {i}</h3>
              <p>Content {i}</p>
            </div>
          ))}
        </StaggerList>
      )
      
      expect(screen.getByTestId('card-1')).toBeInTheDocument()
      expect(screen.getByTestId('card-2')).toBeInTheDocument()
      expect(screen.getByTestId('card-3')).toBeInTheDocument()
    })

    it('renders nested lists', () => {
      render(
        <StaggerList>
          <div>
            <StaggerList>
              <div>Nested Item 1</div>
              <div>Nested Item 2</div>
            </StaggerList>
          </div>
        </StaggerList>
      )
      
      expect(screen.getByText('Nested Item 1')).toBeInTheDocument()
      expect(screen.getByText('Nested Item 2')).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('renders with all props combined', () => {
      render(
        <StaggerList
          className="custom-class"
          staggerDelay={0.1}
          delayChildren={0.2}
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </StaggerList>
      )
      
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('maintains semantic HTML', () => {
      render(
        <StaggerList>
          <article>
            <h2>Article Title</h2>
            <p>Article content</p>
          </article>
        </StaggerList>
      )
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('preserves aria attributes', () => {
      render(
        <StaggerList>
          <div aria-label="Item" role="listitem">
            Content
          </div>
        </StaggerList>
      )
      expect(screen.getByRole('listitem')).toBeInTheDocument()
      expect(screen.getByRole('listitem')).toHaveAttribute('aria-label', 'Item')
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(StaggerList.displayName).toBe('StaggerList')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      const { container } = render(<StaggerList>{null}</StaggerList>)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles undefined children', () => {
      const { container } = render(<StaggerList>{undefined}</StaggerList>)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles conditional rendering', () => {
      const showItems = true
      render(
        <StaggerList>
          {showItems && <div>Visible Item</div>}
          {!showItems && <div>Hidden Item</div>}
        </StaggerList>
      )
      
      expect(screen.getByText('Visible Item')).toBeInTheDocument()
      expect(screen.queryByText('Hidden Item')).not.toBeInTheDocument()
    })
  })
})

