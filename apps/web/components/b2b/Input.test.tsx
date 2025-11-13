import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Input } from './Input'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, variants, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, variants, initial, animate, exit, transition, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('Input', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders with label', () => {
      render(<Input label="Email" />)
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders without label', () => {
      render(<Input />)
      expect(screen.queryByRole('label')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Input className="custom-class" />)
      expect(screen.getByRole('textbox')).toHaveClass('custom-class')
    })
  })

  describe('Input Types', () => {
    it('renders text input by default', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
    })

    it('renders email input', () => {
      render(<Input type="email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('renders password input', () => {
      render(<Input type="password" />)
      const input = document.querySelector('input[type="password"]')
      expect(input).toBeInTheDocument()
    })

    it('renders number input', () => {
      render(<Input type="number" />)
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })
  })

  describe('Placeholder', () => {
    it('renders with placeholder', () => {
      render(<Input placeholder="Enter your email" />)
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    })

    it('placeholder has correct styling', () => {
      render(<Input placeholder="Placeholder" />)
      const input = screen.getByPlaceholderText('Placeholder')
      expect(input).toHaveClass('placeholder:text-b2b-gray-500')
    })
  })

  describe('Icons', () => {
    it('renders icon on the left by default', () => {
      render(<Input icon={<span data-testid="icon">🔍</span>} />)
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('renders icon on the right', () => {
      render(<Input icon={<span data-testid="icon">✓</span>} iconPosition="right" />)
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('applies left padding when icon is on left', () => {
      render(<Input icon={<span data-testid="icon">🔍</span>} iconPosition="left" />)
      expect(screen.getByRole('textbox')).toHaveClass('pl-10')
    })

    it('applies right padding when icon is on right', () => {
      render(<Input icon={<span data-testid="icon">✓</span>} iconPosition="right" />)
      expect(screen.getByRole('textbox')).toHaveClass('pr-10')
    })
  })

  describe('Error State', () => {
    it('displays error message', () => {
      render(<Input error="This field is required" />)
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('applies error styling to input', () => {
      render(<Input error="Error" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500')
      expect(input).toHaveClass('focus:ring-red-500')
    })

    it('error message has correct styling', () => {
      render(<Input error="Error message" />)
      const error = screen.getByText('Error message')
      expect(error).toHaveClass('text-red-500')
      expect(error).toHaveClass('text-sm')
    })

    it('does not show error when error prop is not provided', () => {
      render(<Input />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      render(<Input disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('applies disabled styling', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:bg-b2b-gray-50')
      expect(input).toHaveClass('disabled:cursor-not-allowed')
      expect(input).toHaveClass('disabled:text-b2b-gray-500')
    })
  })

  describe('Value and onChange', () => {
    it('accepts value prop', () => {
      render(<Input value="test value" onChange={() => {}} />)
      expect(screen.getByRole('textbox')).toHaveValue('test value')
    })

    it('calls onChange when value changes', () => {
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'new value' } })
      
      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('updates value on change', () => {
      const { rerender } = render(<Input value="" onChange={() => {}} />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      
      rerender(<Input value="updated" onChange={() => {}} />)
      expect(input.value).toBe('updated')
    })
  })

  describe('Focus State', () => {
    it('can be focused', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      
      input.focus()
      expect(input).toHaveFocus()
    })

    it('applies focus styling', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('focus:outline-none')
      expect(input).toHaveClass('focus:ring-2')
      expect(input).toHaveClass('focus:ring-b2b-yellow')
    })

    it('calls onFocus when focused', () => {
      const handleFocus = jest.fn()
      render(<Input onFocus={handleFocus} />)
      
      fireEvent.focus(screen.getByRole('textbox'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('calls onBlur when blurred', () => {
      const handleBlur = jest.fn()
      render(<Input onBlur={handleBlur} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.focus(input)
      fireEvent.blur(input)
      
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('HTML Attributes', () => {
    it('accepts name attribute', () => {
      render(<Input name="email" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'email')
    })

    it('accepts required attribute', () => {
      render(<Input required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })

    it('accepts maxLength attribute', () => {
      render(<Input maxLength={10} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10')
    })

    it('accepts data attributes', () => {
      render(<Input data-testid="custom-input" />)
      expect(screen.getByTestId('custom-input')).toBeInTheDocument()
    })

    it('accepts aria attributes', () => {
      render(<Input aria-label="Email input" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Email input')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
      expect(ref.current?.tagName).toBe('INPUT')
    })

    it('can focus input via ref', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      
      ref.current?.focus()
      expect(ref.current).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('associates label with input', () => {
      render(<Input label="Email" />)
      const label = screen.getByText('Email')
      const input = screen.getByRole('textbox')
      
      // Label should be rendered
      expect(label).toBeInTheDocument()
      expect(input).toBeInTheDocument()
    })

    it('is keyboard accessible', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      
      input.focus()
      expect(input).toHaveFocus()
    })

    it('shows error state to screen readers', () => {
      render(<Input error="Error message" aria-invalid="true" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Input
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          icon={<span data-testid="icon">📧</span>}
          error="Invalid email"
          className="custom-class"
        />
      )
      
      expect(screen.getByText('Email Address')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveClass('custom-class')
    })
  })
})

