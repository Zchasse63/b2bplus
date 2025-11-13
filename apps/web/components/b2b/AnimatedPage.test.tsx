import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AnimatedPage } from './AnimatedPage'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/test-page'),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, variants, initial, animate, exit, transition, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children, mode }: any) => <>{children}</>,
}))

describe('AnimatedPage', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(
        <AnimatedPage>
          <div>Page Content</div>
        </AnimatedPage>
      )
      expect(screen.getByText('Page Content')).toBeInTheDocument()
    })

    it('renders multiple children', () => {
      render(
        <AnimatedPage>
          <h1>Title</h1>
          <p>Content</p>
          <button>Action</button>
        </AnimatedPage>
      )
      
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('renders without children', () => {
      const { container } = render(<AnimatedPage />)
      const div = container.firstChild
      expect(div).toBeInTheDocument()
    })
  })

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <AnimatedPage className="custom-class">
          Content
        </AnimatedPage>
      )
      const div = container.firstChild
      expect(div).toHaveClass('custom-class')
    })

    it('applies multiple classes', () => {
      const { container } = render(
        <AnimatedPage className="class1 class2 class3">
          Content
        </AnimatedPage>
      )
      const div = container.firstChild
      expect(div).toHaveClass('class1')
      expect(div).toHaveClass('class2')
      expect(div).toHaveClass('class3')
    })
  })

  describe('Animation Props', () => {
    it('has initial animation state', () => {
      const { container } = render(
        <AnimatedPage>
          Content
        </AnimatedPage>
      )
      const div = container.firstChild
      expect(div).toBeInTheDocument()
    })

    it('renders with motion div', () => {
      const { container } = render(
        <AnimatedPage>
          <span data-testid="content">Animated Content</span>
        </AnimatedPage>
      )
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })

  describe('Content Types', () => {
    it('renders text content', () => {
      render(
        <AnimatedPage>
          Simple text content
        </AnimatedPage>
      )
      expect(screen.getByText('Simple text content')).toBeInTheDocument()
    })

    it('renders JSX elements', () => {
      render(
        <AnimatedPage>
          <div>
            <h1>Title</h1>
            <p>Description</p>
          </div>
        </AnimatedPage>
      )
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('renders components', () => {
      const TestComponent = () => <div>Test Component</div>
      
      render(
        <AnimatedPage>
          <TestComponent />
        </AnimatedPage>
      )
      expect(screen.getByText('Test Component')).toBeInTheDocument()
    })

    it('renders form elements', () => {
      render(
        <AnimatedPage>
          <form>
            <input type="text" placeholder="Enter text" />
            <button type="submit">Submit</button>
          </form>
        </AnimatedPage>
      )
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('maintains semantic HTML', () => {
      render(
        <AnimatedPage>
          <article>
            <h1>Article Title</h1>
            <p>Article content</p>
          </article>
        </AnimatedPage>
      )
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('preserves aria attributes', () => {
      render(
        <AnimatedPage>
          <div aria-label="Main content" role="main">
            Content
          </div>
        </AnimatedPage>
      )
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Main content')
    })

    it('supports keyboard navigation', () => {
      render(
        <AnimatedPage>
          <button>Button 1</button>
          <button>Button 2</button>
        </AnimatedPage>
      )
      
      const button1 = screen.getByRole('button', { name: 'Button 1' })
      const button2 = screen.getByRole('button', { name: 'Button 2' })
      
      button1.focus()
      expect(button1).toHaveFocus()
      
      button2.focus()
      expect(button2).toHaveFocus()
    })
  })

  describe('Complex Layouts', () => {
    it('renders complex page layout', () => {
      render(
        <AnimatedPage className="min-h-screen">
          <header>
            <h1>Header</h1>
          </header>
          <main>
            <section>
              <h2>Section 1</h2>
              <p>Content 1</p>
            </section>
            <section>
              <h2>Section 2</h2>
              <p>Content 2</p>
            </section>
          </main>
          <footer>
            <p>Footer</p>
          </footer>
        </AnimatedPage>
      )
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2)
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })

    it('renders with nested components', () => {
      const NestedComponent = () => (
        <div>
          <h2>Nested Title</h2>
          <p>Nested content</p>
        </div>
      )

      render(
        <AnimatedPage>
          <div>
            <NestedComponent />
            <NestedComponent />
          </div>
        </AnimatedPage>
      )
      
      expect(screen.getAllByText('Nested Title')).toHaveLength(2)
      expect(screen.getAllByText('Nested content')).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      const { container } = render(<AnimatedPage>{null}</AnimatedPage>)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles undefined children', () => {
      const { container } = render(<AnimatedPage>{undefined}</AnimatedPage>)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles conditional rendering', () => {
      const showContent = true
      render(
        <AnimatedPage>
          {showContent && <div>Visible Content</div>}
          {!showContent && <div>Hidden Content</div>}
        </AnimatedPage>
      )
      
      expect(screen.getByText('Visible Content')).toBeInTheDocument()
      expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument()
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(AnimatedPage.displayName).toBe('AnimatedPage')
    })
  })
})

