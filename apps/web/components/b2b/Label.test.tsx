import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Label } from './Label'

describe('Label', () => {
  describe('Rendering', () => {
    it('renders label with text', () => {
      render(<Label>Email Address</Label>)
      expect(screen.getByText('Email Address')).toBeInTheDocument()
    })

    it('renders label without children', () => {
      const { container } = render(<Label />)
      const label = container.querySelector('label')
      expect(label).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Label className="custom-class">Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveClass('custom-class')
    })
  })

  describe('Required Indicator', () => {
    it('does not show required indicator by default', () => {
      render(<Label>Email</Label>)
      expect(screen.queryByText('*')).not.toBeInTheDocument()
    })

    it('shows required indicator when required is true', () => {
      render(<Label required>Email</Label>)
      const asterisk = screen.getByText('*')
      expect(asterisk).toBeInTheDocument()
      expect(asterisk).toHaveClass('text-red-500')
    })

    it('positions asterisk after label text', () => {
      render(<Label required>Email</Label>)
      const label = screen.getByText('Email').parentElement
      expect(label?.textContent).toBe('Email*')
    })

    it('applies correct styling to asterisk', () => {
      render(<Label required>Required Field</Label>)
      const asterisk = screen.getByText('*')
      expect(asterisk).toHaveClass('ml-1')
      expect(asterisk).toHaveClass('text-red-500')
    })
  })

  describe('Base Styles', () => {
    it('always has block display', () => {
      render(<Label>Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveClass('block')
    })

    it('always has text-sm', () => {
      render(<Label>Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveClass('text-sm')
    })

    it('always has font-medium', () => {
      render(<Label>Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveClass('font-medium')
    })

    it('always has text-b2b-dark color', () => {
      render(<Label>Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveClass('text-b2b-dark')
    })
  })

  describe('HTML Attributes', () => {
    it('accepts htmlFor attribute', () => {
      render(<Label htmlFor="email-input">Email</Label>)
      const label = screen.getByText('Email')
      expect(label).toHaveAttribute('for', 'email-input')
    })

    it('accepts data attributes', () => {
      render(<Label data-testid="custom-label">Label</Label>)
      expect(screen.getByTestId('custom-label')).toBeInTheDocument()
    })

    it('accepts aria attributes', () => {
      render(<Label aria-label="Email label">Email</Label>)
      const label = screen.getByText('Email')
      expect(label).toHaveAttribute('aria-label', 'Email label')
    })

    it('accepts id attribute', () => {
      render(<Label id="label-id">Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveAttribute('id', 'label-id')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to label element', () => {
      const ref = React.createRef<HTMLLabelElement>()
      render(<Label ref={ref}>Label</Label>)
      
      expect(ref.current).toBeInstanceOf(HTMLLabelElement)
      expect(ref.current?.tagName).toBe('LABEL')
    })
  })

  describe('Content Types', () => {
    it('renders text content', () => {
      render(<Label>Simple Text</Label>)
      expect(screen.getByText('Simple Text')).toBeInTheDocument()
    })

    it('renders with nested elements', () => {
      render(
        <Label>
          Email <span data-testid="info">(required)</span>
        </Label>
      )
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByTestId('info')).toBeInTheDocument()
    })

    it('renders with icon', () => {
      render(
        <Label>
          <span data-testid="icon">📧</span> Email
        </Label>
      )
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Label
          htmlFor="email-input"
          required
          className="custom-class"
          data-testid="complex-label"
        >
          Email Address
        </Label>
      )
      
      const label = screen.getByTestId('complex-label')
      expect(label).toHaveAttribute('for', 'email-input')
      expect(label).toHaveClass('custom-class')
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('Email Address')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('can be associated with form input', () => {
      const { container } = render(
        <>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" />
        </>
      )
      
      const label = screen.getByText('Email')
      const input = container.querySelector('#email')
      
      expect(label).toHaveAttribute('for', 'email')
      expect(input).toBeInTheDocument()
    })

    it('shows required state to screen readers', () => {
      render(<Label required aria-required="true">Email</Label>)
      const label = screen.getByText('Email')
      expect(label).toHaveAttribute('aria-required', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty label text', () => {
      const { container } = render(<Label />)
      const label = container.querySelector('label')
      expect(label).toBeInTheDocument()
    })

    it('handles very long label text', () => {
      const longText = 'This is a very long label text that might wrap to multiple lines'
      render(<Label>{longText}</Label>)
      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('handles special characters in label', () => {
      render(<Label>Email & Phone (Optional)</Label>)
      expect(screen.getByText('Email & Phone (Optional)')).toBeInTheDocument()
    })
  })
})

