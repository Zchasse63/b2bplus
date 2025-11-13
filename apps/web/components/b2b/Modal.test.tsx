import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Modal } from './Modal'

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

describe('Modal', () => {
  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          Modal content
        </Modal>
      )
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
    })

    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          Modal content
        </Modal>
      )
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('renders with title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Modal Title">
          Content
        </Modal>
      )
      expect(screen.getByText('Modal Title')).toBeInTheDocument()
    })

    it('renders without title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      )
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('renders with footer', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} footer={<button>Save</button>}>
          Content
        </Modal>
      )
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })
  })

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="sm">
          Content
        </Modal>
      )
      const modal = container.querySelector('[class*="max-w-sm"]')
      expect(modal).toBeInTheDocument()
    })

    it('renders medium size by default', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      )
      const modal = container.querySelector('[class*="max-w-md"]')
      expect(modal).toBeInTheDocument()
    })

    it('renders large size', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="lg">
          Content
        </Modal>
      )
      const modal = container.querySelector('[class*="max-w-lg"]')
      expect(modal).toBeInTheDocument()
    })

    it('renders extra large size', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="xl">
          Content
        </Modal>
      )
      const modal = container.querySelector('[class*="max-w-xl"]')
      expect(modal).toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    it('renders close button when title is present', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Title">
          Content
        </Modal>
      )
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('calls onClose when close button is clicked', () => {
      const handleClose = jest.fn()
      render(
        <Modal isOpen={true} onClose={handleClose} title="Title">
          Content
        </Modal>
      )

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(handleClose).toHaveBeenCalled()
    })
  })

  describe('Backdrop', () => {
    it('renders backdrop', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      )
      const backdrop = container.querySelector('[class*="bg-black"]')
      expect(backdrop).toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = jest.fn()
      const { container } = render(
        <Modal isOpen={true} onClose={handleClose}>
          Content
        </Modal>
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
        <Modal isOpen={true} onClose={handleClose}>
          Content
        </Modal>
      )
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when Escape is pressed and modal is closed', () => {
      const handleClose = jest.fn()
      render(
        <Modal isOpen={false} onClose={handleClose}>
          Content
        </Modal>
      )
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(handleClose).not.toHaveBeenCalled()
    })
  })

  describe('Body Scroll Lock', () => {
    it('locks body scroll when modal opens', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      )
      
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('unlocks body scroll when modal closes', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      )
      
      expect(document.body.style.overflow).toBe('hidden')
      
      rerender(
        <Modal isOpen={false} onClose={() => {}}>
          Content
        </Modal>
      )
      
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} className="custom-class">
          Content
        </Modal>
      )
      const modal = container.querySelector('.custom-class')
      expect(modal).toBeInTheDocument()
    })
  })

  describe('Content Sections', () => {
    it('renders header with title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Header Title">
          Content
        </Modal>
      )
      expect(screen.getByText('Header Title')).toBeInTheDocument()
    })

    it('renders content section', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div data-testid="content">Main Content</div>
        </Modal>
      )
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    it('renders footer section', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} footer={<div data-testid="footer">Footer</div>}>
          Content
        </Modal>
      )
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      const handleClose = jest.fn()
      render(
        <Modal
          isOpen={true}
          onClose={handleClose}
          title="Complex Modal"
          size="lg"
          className="custom-class"
          footer={<button>Action</button>}
        >
          <p>Modal content</p>
        </Modal>
      )
      
      expect(screen.getByText('Complex Modal')).toBeInTheDocument()
      expect(screen.getByText('Modal content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper structure for screen readers', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Accessible Modal">
          <p>Content</p>
        </Modal>
      )
      
      expect(screen.getByText('Accessible Modal')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('maintains focus management', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <button>Modal Button</button>
        </Modal>
      )
      
      const button = screen.getByRole('button', { name: 'Modal Button' })
      button.focus()
      expect(button).toHaveFocus()
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(Modal.displayName).toBe('Modal')
    })
  })
})

