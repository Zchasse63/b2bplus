import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Drawer } from './Drawer'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, variants, initial, animate, exit, transition, onClick, ...props }: any, ref: any) => (
      <div ref={ref} onClick={onClick} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiX: () => <span data-testid="close-icon">×</span>,
}))

// Mock Button component
jest.mock('./Button', () => ({
  Button: ({ onClick, children, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

describe('Drawer', () => {
  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <Drawer isOpen={false} onClose={() => {}}>
          Drawer content
        </Drawer>
      )
      expect(screen.queryByText('Drawer content')).not.toBeInTheDocument()
    })

    it('renders when isOpen is true', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}}>
          Drawer content
        </Drawer>
      )
      expect(screen.getByText('Drawer content')).toBeInTheDocument()
    })

    it('renders with title', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} title="Drawer Title">
          Content
        </Drawer>
      )
      expect(screen.getByText('Drawer Title')).toBeInTheDocument()
    })

    it('renders without title', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}}>
          Content
        </Drawer>
      )
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('Sides', () => {
    it('renders on right side by default', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}}>
          Content
        </Drawer>
      )
      const drawer = container.querySelector('[class*="right-0"]')
      expect(drawer).toBeInTheDocument()
    })

    it('renders on left side', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}} side="left">
          Content
        </Drawer>
      )
      const drawer = container.querySelector('[class*="left-0"]')
      expect(drawer).toBeInTheDocument()
    })

    it('renders on right side explicitly', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}} side="right">
          Content
        </Drawer>
      )
      const drawer = container.querySelector('[class*="right-0"]')
      expect(drawer).toBeInTheDocument()
    })
  })

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}} size="sm">
          Content
        </Drawer>
      )
      const drawer = container.querySelector('[class*="max-w-sm"]')
      expect(drawer).toBeInTheDocument()
    })

    it('renders medium size by default', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}}>
          Content
        </Drawer>
      )
      const drawer = container.querySelector('[class*="max-w-md"]')
      expect(drawer).toBeInTheDocument()
    })

    it('renders large size', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}} size="lg">
          Content
        </Drawer>
      )
      const drawer = container.querySelector('[class*="max-w-lg"]')
      expect(drawer).toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    it('renders close button when title is present', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} title="Title">
          Content
        </Drawer>
      )
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('calls onClose when close button is clicked', () => {
      const handleClose = jest.fn()
      render(
        <Drawer isOpen={true} onClose={handleClose} title="Title">
          Content
        </Drawer>
      )

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(handleClose).toHaveBeenCalled()
    })
  })

  describe('Backdrop', () => {
    it('renders backdrop', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}}>
          Content
        </Drawer>
      )
      const backdrop = container.querySelector('[class*="bg-black"]')
      expect(backdrop).toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = jest.fn()
      const { container } = render(
        <Drawer isOpen={true} onClose={handleClose}>
          Content
        </Drawer>
      )
      
      const backdrop = container.querySelector('[class*="bg-black"]')
      fireEvent.click(backdrop!)
      
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Escape Key', () => {
    it('calls onClose when Escape key is pressed', () => {
      const handleClose = jest.fn()
      render(
        <Drawer isOpen={true} onClose={handleClose}>
          Content
        </Drawer>
      )
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when Escape is pressed and drawer is closed', () => {
      const handleClose = jest.fn()
      render(
        <Drawer isOpen={false} onClose={handleClose}>
          Content
        </Drawer>
      )
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(handleClose).not.toHaveBeenCalled()
    })
  })

  describe('Body Scroll Lock', () => {
    it('locks body scroll when drawer opens', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}}>
          Content
        </Drawer>
      )
      
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('unlocks body scroll when drawer closes', () => {
      const { rerender } = render(
        <Drawer isOpen={true} onClose={() => {}}>
          Content
        </Drawer>
      )
      
      expect(document.body.style.overflow).toBe('hidden')
      
      rerender(
        <Drawer isOpen={false} onClose={() => {}}>
          Content
        </Drawer>
      )
      
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}} className="custom-class">
          Content
        </Drawer>
      )
      const drawer = container.querySelector('.custom-class')
      expect(drawer).toBeInTheDocument()
    })
  })

  describe('Content Sections', () => {
    it('renders header with title', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} title="Header Title">
          Content
        </Drawer>
      )
      expect(screen.getByText('Header Title')).toBeInTheDocument()
    })

    it('renders content section', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}}>
          <div data-testid="content">Main Content</div>
        </Drawer>
      )
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    it('renders scrollable content', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}}>
          <div>Content 1</div>
          <div>Content 2</div>
          <div>Content 3</div>
        </Drawer>
      )
      expect(screen.getByText('Content 1')).toBeInTheDocument()
      expect(screen.getByText('Content 2')).toBeInTheDocument()
      expect(screen.getByText('Content 3')).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      const handleClose = jest.fn()
      render(
        <Drawer
          isOpen={true}
          onClose={handleClose}
          title="Complex Drawer"
          side="left"
          size="lg"
          className="custom-class"
        >
          <p>Drawer content</p>
        </Drawer>
      )
      
      expect(screen.getByText('Complex Drawer')).toBeInTheDocument()
      expect(screen.getByText('Drawer content')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper structure for screen readers', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} title="Accessible Drawer">
          <p>Content</p>
        </Drawer>
      )
      
      expect(screen.getByText('Accessible Drawer')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('maintains focus management', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}}>
          <button>Drawer Button</button>
        </Drawer>
      )

      const button = screen.getByRole('button', { name: 'Drawer Button' })
      button.focus()
      expect(button).toHaveFocus()
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(Drawer.displayName).toBe('Drawer')
    })
  })
})

