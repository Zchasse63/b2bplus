import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Tooltip } from './Tooltip'

// Mock Radix UI Tooltip
jest.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children, delayDuration }: any) => <div data-delay={delayDuration}>{children}</div>,
  Root: ({ children }: any) => <div>{children}</div>,
  Trigger: ({ children, asChild }: any) => <div>{children}</div>,
  Portal: ({ children }: any) => <div>{children}</div>,
  Content: ({ children, side, align, asChild, sideOffset }: any) => (
    <div data-side={side} data-align={align} data-offset={sideOffset}>
      {children}
    </div>
  ),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, variants, initial, animate, exit, transition, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
}))

describe('Tooltip', () => {
  describe('Rendering', () => {
    it('renders trigger element', () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      )
      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument()
    })

    it('renders tooltip content', () => {
      render(
        <Tooltip content="Help text">
          <button>Help</button>
        </Tooltip>
      )
      expect(screen.getByText('Help text')).toBeInTheDocument()
    })

    it('renders with text content', () => {
      render(
        <Tooltip content="Simple tooltip">
          <span>Trigger</span>
        </Tooltip>
      )
      expect(screen.getByText('Simple tooltip')).toBeInTheDocument()
    })

    it('renders with JSX content', () => {
      render(
        <Tooltip content={<div><strong>Bold</strong> text</div>}>
          <button>Trigger</button>
        </Tooltip>
      )
      expect(screen.getByText('Bold')).toBeInTheDocument()
      expect(screen.getByText('text')).toBeInTheDocument()
    })
  })

  describe('Positioning', () => {
    it('renders with top position by default', () => {
      render(
        <Tooltip content="Tooltip">
          <button>Trigger</button>
        </Tooltip>
      )
      const content = screen.getByText('Tooltip').parentElement
      expect(content).toHaveAttribute('data-side', 'top')
    })

    it('renders with right position', () => {
      render(
        <Tooltip content="Tooltip" side="right">
          <button>Trigger</button>
        </Tooltip>
      )
      const content = screen.getByText('Tooltip').parentElement
      expect(content).toHaveAttribute('data-side', 'right')
    })

    it('renders with bottom position', () => {
      render(
        <Tooltip content="Tooltip" side="bottom">
          <button>Trigger</button>
        </Tooltip>
      )
      const content = screen.getByText('Tooltip').parentElement
      expect(content).toHaveAttribute('data-side', 'bottom')
    })

    it('renders with left position', () => {
      render(
        <Tooltip content="Tooltip" side="left">
          <button>Trigger</button>
        </Tooltip>
      )
      const content = screen.getByText('Tooltip').parentElement
      expect(content).toHaveAttribute('data-side', 'left')
    })
  })

  describe('Alignment', () => {
    it('renders with center alignment by default', () => {
      render(
        <Tooltip content="Tooltip">
          <button>Trigger</button>
        </Tooltip>
      )
      const content = screen.getByText('Tooltip').parentElement
      expect(content).toHaveAttribute('data-align', 'center')
    })

    it('renders with start alignment', () => {
      render(
        <Tooltip content="Tooltip" align="start">
          <button>Trigger</button>
        </Tooltip>
      )
      const content = screen.getByText('Tooltip').parentElement
      expect(content).toHaveAttribute('data-align', 'start')
    })

    it('renders with end alignment', () => {
      render(
        <Tooltip content="Tooltip" align="end">
          <button>Trigger</button>
        </Tooltip>
      )
      const content = screen.getByText('Tooltip').parentElement
      expect(content).toHaveAttribute('data-align', 'end')
    })
  })

  describe('Delay Duration', () => {
    it('uses default delay duration', () => {
      const { container } = render(
        <Tooltip content="Tooltip">
          <button>Trigger</button>
        </Tooltip>
      )
      const provider = container.querySelector('[data-delay]')
      expect(provider).toHaveAttribute('data-delay', '200')
    })

    it('uses custom delay duration', () => {
      const { container } = render(
        <Tooltip content="Tooltip" delayDuration={500}>
          <button>Trigger</button>
        </Tooltip>
      )
      const provider = container.querySelector('[data-delay]')
      expect(provider).toHaveAttribute('data-delay', '500')
    })

    it('uses zero delay duration', () => {
      const { container } = render(
        <Tooltip content="Tooltip" delayDuration={0}>
          <button>Trigger</button>
        </Tooltip>
      )
      const provider = container.querySelector('[data-delay]')
      expect(provider).toHaveAttribute('data-delay', '0')
    })
  })

  describe('Custom ClassName', () => {
    it('accepts custom className prop', () => {
      render(
        <Tooltip content="Tooltip" className="custom-class">
          <button>Trigger</button>
        </Tooltip>
      )
      expect(screen.getByText('Tooltip')).toBeInTheDocument()
    })

    it('accepts multiple classes', () => {
      render(
        <Tooltip content="Tooltip" className="class1 class2">
          <button>Trigger</button>
        </Tooltip>
      )
      expect(screen.getByText('Tooltip')).toBeInTheDocument()
    })
  })

  describe('Trigger Elements', () => {
    it('works with button trigger', () => {
      render(
        <Tooltip content="Button tooltip">
          <button>Click me</button>
        </Tooltip>
      )
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('works with link trigger', () => {
      render(
        <Tooltip content="Link tooltip">
          <a href="#test">Link</a>
        </Tooltip>
      )
      expect(screen.getByRole('link')).toBeInTheDocument()
    })

    it('works with icon trigger', () => {
      render(
        <Tooltip content="Icon tooltip">
          <span data-testid="icon">ℹ️</span>
        </Tooltip>
      )
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('works with text trigger', () => {
      render(
        <Tooltip content="Text tooltip">
          <span>Hover text</span>
        </Tooltip>
      )
      expect(screen.getByText('Hover text')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('renders with styling applied', () => {
      render(
        <Tooltip content="Tooltip">
          <button>Trigger</button>
        </Tooltip>
      )
      const content = screen.getByText('Tooltip').parentElement
      expect(content).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Tooltip
          content="Complex tooltip"
          side="right"
          align="start"
          delayDuration={300}
          className="custom-class"
        >
          <button>Trigger</button>
        </Tooltip>
      )

      const content = screen.getByText('Complex tooltip').parentElement
      expect(content).toHaveAttribute('data-side', 'right')
      expect(content).toHaveAttribute('data-align', 'start')
      expect(content).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('maintains trigger accessibility', () => {
      render(
        <Tooltip content="Help">
          <button aria-label="Help button">?</button>
        </Tooltip>
      )
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Help button')
    })

    it('works with keyboard navigation', () => {
      render(
        <Tooltip content="Tooltip">
          <button>Trigger</button>
        </Tooltip>
      )
      const button = screen.getByRole('button')
      button.focus()
      expect(button).toHaveFocus()
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(Tooltip.displayName).toBe('Tooltip')
    })
  })
})

